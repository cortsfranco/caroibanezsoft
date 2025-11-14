import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Measurement, MeasurementCalculation } from "@shared/schema";
import { Calculator, Info, Ruler, Scale, Thermometer, Activity, Droplet } from "lucide-react";
import { format } from "date-fns";

const numericFieldGroups: Array<{
  title: string;
  icon: React.ElementType;
  description?: string;
  columns?: number;
  fields: Array<{
    key: NumericFieldKey;
    label: string;
    unit?: string;
    step?: string;
  }>;
}> = [
  {
    title: "Datos básicos",
    icon: Scale,
    fields: [
      { key: "weight", label: "Peso", unit: "kg", step: "0.01" },
      { key: "height", label: "Talla", unit: "cm", step: "0.1" },
      { key: "seatedHeight", label: "Talla sentado", unit: "cm", step: "0.1" },
    ],
  },
  {
    title: "Diámetros óseos",
    icon: Ruler,
    fields: [
      { key: "biacromial", label: "Biacromial", unit: "cm", step: "0.1" },
      { key: "thoraxTransverse", label: "Tórax transverso", unit: "cm", step: "0.1" },
      { key: "thoraxAnteroposterior", label: "Tórax anteroposterior", unit: "cm", step: "0.1" },
      { key: "biiliocristideo", label: "Bi-iliocrestídeo", unit: "cm", step: "0.1" },
      { key: "humeral", label: "Humeral", unit: "cm", step: "0.1" },
      { key: "femoral", label: "Femoral", unit: "cm", step: "0.1" },
    ],
  },
  {
    title: "Perímetros",
    icon: Activity,
    fields: [
      { key: "head", label: "Cabeza", unit: "cm", step: "0.1" },
      { key: "relaxedArm", label: "Brazo relajado", unit: "cm", step: "0.1" },
      { key: "flexedArm", label: "Brazo flexionado", unit: "cm", step: "0.1" },
      { key: "forearm", label: "Antebrazo", unit: "cm", step: "0.1" },
      { key: "thoraxCirc", label: "Tórax", unit: "cm", step: "0.1" },
      { key: "waist", label: "Cintura mínima", unit: "cm", step: "0.1" },
      { key: "hip", label: "Cadera máxima", unit: "cm", step: "0.1" },
      { key: "thighSuperior", label: "Muslo superior", unit: "cm", step: "0.1" },
      { key: "thighMedial", label: "Muslo medial", unit: "cm", step: "0.1" },
      { key: "calf", label: "Pantorrilla máxima", unit: "cm", step: "0.1" },
    ],
  },
  {
    title: "Pliegues cutáneos",
    icon: Thermometer,
    fields: [
      { key: "triceps", label: "Tríceps", unit: "mm", step: "0.1" },
      { key: "biceps", label: "Bíceps", unit: "mm", step: "0.1" },
      { key: "subscapular", label: "Subescapular", unit: "mm", step: "0.1" },
      { key: "suprailiac", label: "Suprailiaco", unit: "mm", step: "0.1" },
      { key: "supraspinal", label: "Supraespinal", unit: "mm", step: "0.1" },
      { key: "abdominal", label: "Abdominal", unit: "mm", step: "0.1" },
      { key: "thighSkinfold", label: "Muslo medial", unit: "mm", step: "0.1" },
      { key: "calfSkinfold", label: "Pantorrilla", unit: "mm", step: "0.1" },
    ],
  },
];

type NumericFieldKey =
  | "weight"
  | "height"
  | "seatedHeight"
  | "biacromial"
  | "thoraxTransverse"
  | "thoraxAnteroposterior"
  | "biiliocristideo"
  | "humeral"
  | "femoral"
  | "head"
  | "relaxedArm"
  | "flexedArm"
  | "forearm"
  | "thoraxCirc"
  | "waist"
  | "hip"
  | "thighSuperior"
  | "thighMedial"
  | "calf"
  | "triceps"
  | "biceps"
  | "subscapular"
  | "suprailiac"
  | "supraspinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold";

type MeasurementWithExtras = Measurement & {
  calculations?: MeasurementCalculation | null;
};

interface MeasurementEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: MeasurementWithExtras | null;
  patientName: string;
  onUpdated?: () => void;
}

type MeasurementFormState = {
  measurementDate: string;
  notes: string;
  version: number | null;
} & Record<NumericFieldKey, number | null>;

const numericKeys: NumericFieldKey[] = numericFieldGroups.flatMap((group) => group.fields.map((field) => field.key));

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const toEditableState = (measurement: MeasurementWithExtras): MeasurementFormState => {
  const state: MeasurementFormState = {
    measurementDate: measurement.measurementDate ? new Date(measurement.measurementDate).toISOString() : new Date().toISOString(),
    notes: measurement.notes ?? "",
    version: measurement.version ?? null,
    weight: null,
    height: null,
    seatedHeight: null,
    biacromial: null,
    thoraxTransverse: null,
    thoraxAnteroposterior: null,
    biiliocristideo: null,
    humeral: null,
    femoral: null,
    head: null,
    relaxedArm: null,
    flexedArm: null,
    forearm: null,
    thoraxCirc: null,
    waist: null,
    hip: null,
    thighSuperior: null,
    thighMedial: null,
    calf: null,
    triceps: null,
    biceps: null,
    subscapular: null,
    suprailiac: null,
    supraspinal: null,
    abdominal: null,
    thighSkinfold: null,
    calfSkinfold: null,
  };

  for (const key of numericKeys) {
    state[key] = toNumberOrNull((measurement as Record<string, unknown>)[key]);
  }

  return state;
};

export function MeasurementEditDialog({
  open,
  onOpenChange,
  measurement,
  patientName,
  onUpdated,
}: MeasurementEditDialogProps) {
  const { toast } = useToast();
  const [formState, setFormState] = useState<MeasurementFormState | null>(measurement ? toEditableState(measurement) : null);

  useEffect(() => {
    if (!open) return;
    if (measurement) {
      setFormState(toEditableState(measurement));
    } else {
      setFormState(null);
    }
  }, [measurement, open]);

  const updateMeasurementMutation = useMutation({
    mutationFn: async (payload: MeasurementFormState & { measurementId: string }) => {
      const { measurementId, version, ...data } = payload;
      return await apiRequest("PATCH", `/api/measurements/${measurementId}`, {
        ...data,
        version,
        measurementDate: data.measurementDate,
      });
    },
    onSuccess: () => {
      toast({
        title: "Medición actualizada",
        description: "Los cálculos se recalcularon con éxito.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      if (measurement?.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients", measurement.patientId, "profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/reports", { patientId: measurement.patientId }] });
      }
      onUpdated?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la medición.";
      const conflict = message.includes("409");
      toast({
        title: conflict ? "Conflicto de versión" : "Error",
        description: conflict
          ? "Otro usuario modificó esta medición recientemente. Recargá los datos y vuelve a intentarlo."
          : "No se pudo guardar la medición. Intentalo nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (key: NumericFieldKey, rawValue: string) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: rawValue === "" ? null : Number(rawValue),
      };
    });
  };

  const handleNotesChange = (value: string) => {
    setFormState((prev) => (prev ? { ...prev, notes: value } : prev));
  };

  const handleDateChange = (value: string) => {
    setFormState((prev) => (prev ? { ...prev, measurementDate: new Date(value).toISOString() } : prev));
  };

  const handleSubmit = () => {
    if (!measurement || !formState) return;
    if (formState.version === null) {
      toast({
        title: "Datos incompletos",
        description: "No encontramos la versión actual de la medición. Recargá e intentá de nuevo.",
        variant: "destructive",
      });
      return;
    }

    updateMeasurementMutation.mutate({
      ...formState,
      measurementId: measurement.id,
    });
  };

  const isSaving = updateMeasurementMutation.isPending;

  const derivedMetrics = useMemo(() => {
    if (!formState) return null;
    const weight = formState.weight ?? undefined;
    const height = formState.height ?? undefined;
    const waist = formState.waist ?? undefined;
    const hip = formState.hip ?? undefined;
    const bmi = weight && height ? weight / ((height / 100) ** 2) : null;
    const waistHip = waist && hip && hip !== 0 ? waist / hip : null;
    const sumOf4 = ["triceps", "biceps", "subscapular", "suprailiac"].reduce((acc, key) => {
      const value = formState[key as NumericFieldKey];
      return acc + (value ?? 0);
    }, 0);
    const sumOf6 = ["triceps", "subscapular", "supraspinal", "abdominal", "thighSkinfold", "calfSkinfold"].reduce(
      (acc, key) => {
        const value = formState[key as NumericFieldKey];
        return acc + (value ?? 0);
      },
      0,
    );

    return {
      bmi: bmi ? bmi.toFixed(1) : null,
      waistHipRatio: waistHip ? waistHip.toFixed(2) : null,
      sumOf4Skinfolds: sumOf4 > 0 ? sumOf4.toFixed(1) : null,
      sumOf6Skinfolds: sumOf6 > 0 ? sumOf6.toFixed(1) : null,
    };
  }, [formState]);

  const calculations = useMemo(() => {
    if (!measurement?.calculations) return null;
    return measurement.calculations;
  }, [measurement]);

  return (
    <Dialog open={open} onOpenChange={(value) => !isSaving && onOpenChange(value)}>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar medición</DialogTitle>
          <DialogDescription>
            {measurement
              ? `Registro del ${format(new Date(measurement.measurementDate), "dd/MM/yyyy HH:mm")} para ${patientName}.`
              : "Seleccioná una medición para editar sus valores."}
          </DialogDescription>
        </DialogHeader>

        {formState ? (
          <div className="flex flex-col gap-5 lg:h-[70vh] lg:flex-row">
            <ScrollArea className="rounded-md border lg:flex-1">
              <div className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="measurement-date">Fecha y hora</Label>
                    <Input
                      id="measurement-date"
                      type="datetime-local"
                      value={formState.measurementDate.slice(0, 16)}
                      onChange={(event) => handleDateChange(event.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {numericFieldGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.title} className="space-y-4 rounded-xl border bg-muted/40 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <h3 className="text-base font-semibold">{group.title}</h3>
                          </div>
                          {group.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {group.fields.map((field) => (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={`field-${field.key}`}>
                              {field.label}
                              {field.unit ? <span className="text-xs text-muted-foreground"> ({field.unit})</span> : null}
                            </Label>
                            <Input
                              id={`field-${field.key}`}
                              type="number"
                              step={field.step ?? "0.1"}
                              value={formState[field.key] ?? ""}
                              onChange={(event) => handleValueChange(field.key, event.target.value)}
                              disabled={isSaving}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas y observaciones</Label>
                  <Textarea
                    id="notes"
                    value={formState.notes}
                    onChange={(event) => handleNotesChange(event.target.value)}
                    className="min-h-[120px]"
                    placeholder="Anota hallazgos, condiciones especiales o instrucciones para el informe."
                    disabled={isSaving}
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-4 rounded-md border bg-muted/30 p-4 lg:max-h-[70vh] lg:w-[360px] lg:overflow-y-auto">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calculator className="h-5 w-5" />
                    Calculadoras inmediatas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-background px-3 py-2">
                    <span className="text-muted-foreground">IMC</span>
                    <span className="font-semibold">{derivedMetrics?.bmi ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-background px-3 py-2">
                    <span className="text-muted-foreground">Relación cintura/cadera</span>
                    <span className="font-semibold">{derivedMetrics?.waistHipRatio ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-background px-3 py-2">
                    <span className="text-muted-foreground">Σ pliegues (4)</span>
                    <span className="font-semibold">{derivedMetrics?.sumOf4Skinfolds ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-background px-3 py-2">
                    <span className="text-muted-foreground">Σ pliegues (6)</span>
                    <span className="font-semibold">{derivedMetrics?.sumOf6Skinfolds ?? "-"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Droplet className="h-5 w-5 text-primary" />
                    Resultados guardados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {calculations ? (
                    <div className="grid gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Composición corporal</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <Metric label="Masa magra" value={calculations.leanMass} suffix="kg" />
                          <Metric label="Masa grasa" value={calculations.adiposeMassKg} suffix="kg" />
                          <Metric label="Masa muscular" value={calculations.muscleMassKg} suffix="kg" />
                          <Metric label="% grasa" value={calculations.bodyFatPercentage} suffix="%" />
                        </div>
                      </div>

                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Metabolismo y objetivos</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <Metric label="Gasto basal" value={calculations.basalMetabolicRate} suffix="kcal" />
                          <Metric label="Calorías mantenimiento" value={calculations.maintenanceCalories} suffix="kcal" />
                          <Metric label="Calorías objetivo" value={calculations.targetCalories} suffix="kcal" />
                          <Metric label="Proteínas/día" value={calculations.proteinPerDay} suffix="g" />
                        </div>
                      </div>

                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Somatotipo</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">Endomorfía {formatDecimal(calculations.endomorphy)}</Badge>
                          <Badge variant="outline">Mesomorfía {formatDecimal(calculations.mesomorphy)}</Badge>
                          <Badge variant="outline">Ectomorfía {formatDecimal(calculations.ectomorphy)}</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Guardá los cambios para recalcular y mostrar los resultados detallados de composición corporal.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Seleccioná una medición del historial para poder editarla.
          </div>
        )}

        <Separator />

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Las modificaciones recalculan automáticamente los indicadores ISAK 2 y los objetivos nutricionales asociados.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formState || isSaving}>
              {isSaving ? "Guardando…" : "Guardar medición"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, suffix }: { label: string; value: unknown; suffix?: string }) {
  if (value === null || value === undefined) {
    return (
      <div className="rounded-md border border-dashed border-muted px-3 py-2 text-muted-foreground">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{label}</p>
        <p className="text-sm font-semibold">-</p>
      </div>
    );
  }

  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  const formatted = Number.isFinite(parsed) ? parsed.toFixed(2) : value;

  return (
    <div className="rounded-md border border-muted px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <p className="text-sm font-semibold">
        {formatted}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}

function formatDecimal(value: unknown) {
  if (value === null || value === undefined) return "-";
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(1);
}

