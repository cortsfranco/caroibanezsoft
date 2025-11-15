import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { MeasurementEditDialog } from "@/components/measurement-edit-dialog";
import { MeasurementReportDialog } from "@/components/measurement-report-dialog";
import { MeasurementReportsListDialog } from "@/components/measurement-reports-list-dialog";
import { TimeRangeSelector } from "@/components/time-range-selector";
import {
  getDefaultTimeRange,
  isDateWithinRange,
  formatRangeLabel,
  type TimeRangeValue,
} from "@/lib/time-range";
import type { Measurement, MeasurementCalculation, Report } from "@shared/schema";
import { TrendingUp, Scale, Ruler, Calendar, FileText, Pencil, Trash2, Activity, Layers } from "lucide-react";
import { format } from "date-fns";

type MeasurementWithRelations = Measurement & {
  patient?: {
    id: string | null;
    name: string | null;
    objective: string | null;
  } | null;
  calculations?: MeasurementCalculation | null;
};

interface MeasurementsHistoryProps {
  patientId: string;
  reports?: Report[];
  initialMeasurementId?: string | null;
}

const toNumeric = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatValue = (value: number | string | null | undefined, decimals = 1): string => {
  const numeric = toNumeric(value);
  return numeric !== null ? Number(numeric).toFixed(decimals) : "-";
};

const formatDateTime = (date: string) => format(new Date(date), "dd/MM/yyyy HH:mm");

export function MeasurementsHistory({ patientId, reports: reportsProp, initialMeasurementId }: MeasurementsHistoryProps) {
  const { toast } = useToast();
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportsListDialogOpen, setReportsListDialogOpen] = useState(false);
  const [reportsListMeasurement, setReportsListMeasurement] = useState<MeasurementWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState<MeasurementWithRelations | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => getDefaultTimeRange());

  useEffect(() => {
    if (!initialMeasurementId) return;
    setSelectedMeasurementId((prev) => (prev === initialMeasurementId ? prev : initialMeasurementId));
  }, [initialMeasurementId]);

  const { data: measurements = [], isLoading } = useQuery<MeasurementWithRelations[]>({
    queryKey: ["/api/measurements", { patientId }],
    queryFn: async () => {
      const response = await fetch(`/api/measurements?patientId=${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
    enabled: !!patientId,
  });

  const { data: reportsFallback = [] } = useQuery<Report[]>({
    queryKey: ["/api/reports", { patientId }],
    queryFn: async () => {
      const response = await fetch(`/api/reports?patientId=${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
    enabled: !!patientId && !reportsProp,
  });

  const reports = reportsProp ?? reportsFallback;

  const sortedMeasurements = useMemo(
    () =>
      [...measurements].sort(
        (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime(),
      ),
    [measurements],
  );

  const rangeFilteredMeasurements = useMemo(
    () => sortedMeasurements.filter((measurement) => isDateWithinRange(measurement.measurementDate, timeRange)),
    [sortedMeasurements, timeRange],
  );

  const chartData = useMemo(() => {
    const source = rangeFilteredMeasurements.length > 0 ? rangeFilteredMeasurements : sortedMeasurements;
    return [...source].reverse().map((m) => {
      const weight = toNumeric(m.weight);
      const height = toNumeric(m.height);
      return {
        date: format(new Date(m.measurementDate), "dd/MM"),
        peso: weight,
        imc: weight && height ? (weight / ((height / 100) ** 2)).toFixed(1) : null,
        cintura: toNumeric(m.waist),
        cadera: toNumeric(m.hip),
      };
    });
  }, [rangeFilteredMeasurements, sortedMeasurements]);

  const selectedMeasurement = useMemo(() => {
    if (!selectedMeasurementId) return sortedMeasurements[0] ?? null;
    return sortedMeasurements.find((item) => item.id === selectedMeasurementId) ?? null;
  }, [selectedMeasurementId, sortedMeasurements]);

  const reportsByMeasurement = useMemo(() => {
    return reports.reduce<Record<string, Report[]>>((acc, report) => {
      if (!acc[report.measurementId]) acc[report.measurementId] = [];
      acc[report.measurementId].push(report);
      return acc;
    }, {});
  }, [reports]);

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      await apiRequest("DELETE", `/api/measurements/${measurementId}`);
    },
    onSuccess: (_, measurementId) => {
      toast({
        title: "Medición eliminada",
        description: "El registro se eliminó junto a sus cálculos asociados.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports", { patientId }] });
      if (selectedMeasurementId === measurementId) {
        setSelectedMeasurementId(null);
      }
      setMeasurementToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "No pudimos eliminarla",
        description: "Reintenta en unos segundos.",
        variant: "destructive",
      });
    },
  });

  const handleSelectMeasurement = (measurementId: string) => {
    setSelectedMeasurementId((prev) => (prev === measurementId ? prev : measurementId));
  };

  const handleOpenEdit = (measurement: MeasurementWithRelations) => {
    setSelectedMeasurementId(measurement.id);
    setEditDialogOpen(true);
  };

  const handleOpenReport = (measurement: MeasurementWithRelations) => {
    setSelectedMeasurementId(measurement.id);
    setReportDialogOpen(true);
  };

  const handleOpenDelete = (measurement: MeasurementWithRelations) => {
    setMeasurementToDelete(measurement);
    setDeleteDialogOpen(true);
  };

  const handleAfterChange = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "profile"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (sortedMeasurements.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Historial de mediciones</CardTitle>
          <CardDescription>Cuando registres mediciones aparecerán aquí con sus cálculos asociados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Scale className="h-8 w-8" />
            <p>El paciente todavía no tiene registros antropométricos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartsSource = rangeFilteredMeasurements.length > 0 ? rangeFilteredMeasurements : sortedMeasurements;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Rango aplicado a las gráficas</p>
            <p className="text-xs text-muted-foreground">
              {chartsSource.length} medición{chartsSource.length === 1 ? "" : "es"} en {formatRangeLabel(timeRange)}.
              {rangeFilteredMeasurements.length === 0 && chartsSource.length > 0 ? " (No hay datos en este rango, se muestra el historial completo)." : ""}
            </p>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Evolución del peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  name="Peso (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Índice de masa corporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="imc"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                  name="IMC"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              Evolución de perímetros (cintura / cadera)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cintura"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3) / 0.16)"
                  strokeWidth={2}
                  name="Cintura (cm)"
                />
                <Area
                  type="monotone"
                  dataKey="cadera"
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4) / 0.16)"
                  strokeWidth={2}
                  name="Cadera (cm)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Historial completo de mediciones</CardTitle>
            <CardDescription>Seleccioná una fila para ver detalles, editar, generar informe o eliminar.</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {sortedMeasurements.length} registro{sortedMeasurements.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Talla (cm)</TableHead>
                  <TableHead className="text-right">IMC</TableHead>
                  <TableHead className="text-right">Cintura (cm)</TableHead>
                  <TableHead className="text-right">Cadera (cm)</TableHead>
                  <TableHead className="text-right">Σ Pliegues (mm)</TableHead>
                  <TableHead className="text-center">Informes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMeasurements.map((measurement) => {
                  const sumSkinfolds = ["triceps", "subscapular", "supraspinal", "abdominal", "thighSkinfold", "calfSkinfold"]
                    .map((key) => toNumeric((measurement as Record<string, unknown>)[key] as number | string | null))
                    .filter((value): value is number => value !== null)
                    .reduce((acc, value) => acc + value, 0);

                  const measurementReports = reportsByMeasurement[measurement.id] ?? [];

                  return (
                    <TableRow
                      key={measurement.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-primary/5",
                        selectedMeasurement?.id === measurement.id && "bg-primary/10",
                      )}
                      data-testid={`row-measurement-${measurement.id}`}
                      onClick={() => handleSelectMeasurement(measurement.id)}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        {formatDateTime(measurement.measurementDate)} hs
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatValue(measurement.weight)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatValue(measurement.height)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {(() => {
                          const bmi = calculateBMI(measurement.weight, measurement.height);
                          return bmi ? bmi : "-";
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatValue(measurement.waist)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatValue(measurement.hip)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {sumSkinfolds > 0 ? sumSkinfolds.toFixed(1) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReportsListMeasurement(measurement);
                            setReportsListDialogOpen(true);
                          }}
                          data-testid={`button-view-reports-${measurement.id}`}
                          disabled={measurementReports.length === 0}
                        >
                          <Badge 
                            variant={measurementReports.length > 0 ? "default" : "outline"} 
                            className={cn(
                              "font-mono text-xs",
                              measurementReports.length > 0 && "hover-elevate cursor-pointer"
                            )}
                          >
                            {measurementReports.length}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenEdit(measurement);
                            }}
                            title="Editar medición"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenReport(measurement);
                            }}
                            title="Generar informe"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenDelete(measurement);
                            }}
                            title="Eliminar medición"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedMeasurement ? (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Medición del {formatDateTime(selectedMeasurement.measurementDate)} hs
              </CardTitle>
              <CardDescription>
                Evolución completa con cálculos ISAK 2. Editá, genera informes o eliminá desde este panel.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(selectedMeasurement)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar medición
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleOpenReport(selectedMeasurement)}>
                <FileText className="mr-2 h-4 w-4" />
                Generar informe
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoMetric icon={Scale} label="Peso" value={formatValue(selectedMeasurement.weight)} suffix="kg" />
              <InfoMetric icon={Ruler} label="Talla" value={formatValue(selectedMeasurement.height)} suffix="cm" />
              <InfoMetric icon={TrendingUp} label="IMC" value={calculateBMI(selectedMeasurement.weight, selectedMeasurement.height) ?? "-"} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InfoMetric icon={Activity} label="Relación cintura/cadera" value={calculateWaistHipRatio(selectedMeasurement)} />
              <InfoMetric icon={Layers} label="Σ pliegues (4)" value={calculateSumOf(selectedMeasurement, ["triceps", "biceps", "subscapular", "suprailiac"])} suffix="mm" />
              <InfoMetric icon={Layers} label="Σ pliegues (6)" value={calculateSumOf(selectedMeasurement, ["triceps", "subscapular", "supraspinal", "abdominal", "thighSkinfold", "calfSkinfold"])} suffix="mm" />
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldGroup title="Diámetros óseos">
                    <Field label="Biacromial" value={formatValue(selectedMeasurement.biacromial)} unit="cm" />
                    <Field label="Tórax transverso" value={formatValue(selectedMeasurement.thoraxTransverse)} unit="cm" />
                    <Field label="Tórax anteroposterior" value={formatValue(selectedMeasurement.thoraxAnteroposterior)} unit="cm" />
                    <Field label="Bi-iliocrestídeo" value={formatValue(selectedMeasurement.biiliocristideo)} unit="cm" />
                    <Field label="Humeral" value={formatValue(selectedMeasurement.humeral)} unit="cm" />
                    <Field label="Femoral" value={formatValue(selectedMeasurement.femoral)} unit="cm" />
                  </FieldGroup>
                  <FieldGroup title="Perímetros">
                    <Field label="Brazo relajado" value={formatValue(selectedMeasurement.relaxedArm)} unit="cm" />
                    <Field label="Brazo flexionado" value={formatValue(selectedMeasurement.flexedArm)} unit="cm" />
                    <Field label="Antebrazo" value={formatValue(selectedMeasurement.forearm)} unit="cm" />
                    <Field label="Tórax" value={formatValue(selectedMeasurement.thoraxCirc)} unit="cm" />
                    <Field label="Cintura" value={formatValue(selectedMeasurement.waist)} unit="cm" />
                    <Field label="Cadera" value={formatValue(selectedMeasurement.hip)} unit="cm" />
                    <Field label="Muslo sup." value={formatValue(selectedMeasurement.thighSuperior)} unit="cm" />
                    <Field label="Muslo medial" value={formatValue(selectedMeasurement.thighMedial)} unit="cm" />
                    <Field label="Pantorrilla" value={formatValue(selectedMeasurement.calf)} unit="cm" />
                  </FieldGroup>
                  <FieldGroup title="Pliegues">
                    <Field label="Tríceps" value={formatValue(selectedMeasurement.triceps)} unit="mm" />
                    <Field label="Bíceps" value={formatValue(selectedMeasurement.biceps)} unit="mm" />
                    <Field label="Subescapular" value={formatValue(selectedMeasurement.subscapular)} unit="mm" />
                    <Field label="Suprailiaco" value={formatValue(selectedMeasurement.suprailiac)} unit="mm" />
                    <Field label="Supraespinal" value={formatValue(selectedMeasurement.supraspinal)} unit="mm" />
                    <Field label="Abdominal" value={formatValue(selectedMeasurement.abdominal)} unit="mm" />
                    <Field label="Muslo medial (pliegue)" value={formatValue(selectedMeasurement.thighSkinfold)} unit="mm" />
                    <Field label="Pantorrilla (pliegue)" value={formatValue(selectedMeasurement.calfSkinfold)} unit="mm" />
                  </FieldGroup>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-primary">Resultados destacados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <span className="text-muted-foreground">% Grasa</span>
                      <span className="font-semibold">{formatValue(selectedMeasurement.calculations?.bodyFatPercentage)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <span className="text-muted-foreground">Masa magra</span>
                      <span className="font-semibold">
                        {formatValue(selectedMeasurement.calculations?.leanMass, 2)} kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <span className="text-muted-foreground">Calorías objetivo</span>
                      <span className="font-semibold">
                        {selectedMeasurement.calculations?.targetCalories ?? "-"} kcal
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <span className="text-muted-foreground">Somatotipo</span>
                      <span className="font-semibold">
                        {formatSomatotype(selectedMeasurement.calculations)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Informes asociados</CardTitle>
                    <CardDescription>
                      {reportsByMeasurement[selectedMeasurement.id]?.length
                        ? "Selecciona uno para abrirlo en otra pestaña."
                        : "Aún no generaste informes para esta medición."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {(reportsByMeasurement[selectedMeasurement.id] ?? []).map((report) => (
                      <Badge
                        key={report.id}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          if (report.pdfUrl) {
                            window.open(report.pdfUrl, "_blank");
                          } else {
                            toast({
                              title: "Informe sin PDF",
                              description: "Generá nuevamente el PDF para poder visualizarlo.",
                            });
                          }
                        }}
                      >
                        Informe #{report.id.slice(0, 8)} • {format(new Date(report.createdAt), "dd/MM HH:mm")}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                {selectedMeasurement.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notas clínicas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {selectedMeasurement.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <MeasurementEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        measurement={selectedMeasurement ?? null}
        patientName={selectedMeasurement?.patient?.name ?? ""}
        onUpdated={handleAfterChange}
      />

      <MeasurementReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        measurement={selectedMeasurement ?? null}
        existingReports={reportsByMeasurement[selectedMeasurement?.id ?? ""] ?? []}
        onGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/reports", { patientId }] });
        }}
      />

      <MeasurementReportsListDialog
        open={reportsListDialogOpen}
        onOpenChange={setReportsListDialogOpen}
        reports={reportsByMeasurement[reportsListMeasurement?.id ?? ""] ?? []}
        measurement={reportsListMeasurement}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar medición?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los datos registrados y los cálculos derivados. Los informes asociados
              se mantendrán, pero perderán la referencia a esta medición.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMeasurementMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => measurementToDelete && deleteMeasurementMutation.mutate(measurementToDelete.id)}
              disabled={deleteMeasurementMutation.isPending}
            >
              {deleteMeasurementMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function calculateBMI(weight: number | string | null | undefined, height: number | string | null | undefined) {
  const numericWeight = toNumeric(weight);
  const numericHeight = toNumeric(height);
  if (!numericWeight || !numericHeight) return null;
  return (numericWeight / ((numericHeight / 100) ** 2)).toFixed(1);
}

function calculateWaistHipRatio(measurement: Measurement) {
  const waist = toNumeric(measurement.waist);
  const hip = toNumeric(measurement.hip);
  if (!waist || !hip) return "-";
  return (waist / hip).toFixed(2);
}

function calculateSumOf(measurement: Measurement, keys: Array<keyof Measurement>) {
  const sum = keys.reduce((acc, key) => {
    const value = toNumeric(measurement[key] as number | string | null);
    return acc + (value ?? 0);
  }, 0);
  return sum > 0 ? sum.toFixed(1) : "-";
}

function formatSomatotype(calculations?: MeasurementCalculation | null) {
  if (!calculations) return "-";
  const endo = calculations.endomorphy;
  const meso = calculations.mesomorphy;
  const ecto = calculations.ectomorphy;
  if (endo == null || meso == null || ecto == null) return "-";
  const toLabel = (value: unknown) => {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed.toFixed(1) : "-";
  };
  return `${toLabel(endo)}-${toLabel(meso)}-${toLabel(ecto)}`;
}

function InfoMetric({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs uppercase text-muted-foreground">{label}</span>
          <span className="text-base font-semibold">
            {value}
            {suffix ? ` ${suffix}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border bg-background/80 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function Field({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-dashed border-muted px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value}
        {value !== "-" && unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}
