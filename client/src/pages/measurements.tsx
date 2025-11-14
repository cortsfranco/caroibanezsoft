import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Calculator,
  ChevronsUpDown,
  Edit,
  FileText,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Measurement, Patient } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getObjectiveLabel } from "@/lib/objectives";
import html2canvas from "html2canvas";

interface MeasurementWithPatient extends Measurement {
  patient?: { id: string | null; name: string | null; objective: string | null } | null;
  calculations?: {
    bodyFatPercentage: string | null;
    leanMass: string | null;
    adiposeMassKg: string | null;
    muscleMassKg: string | null;
  } | null;
}

type SortColumn = "date" | "patient" | "weight" | "leanMass" | "fatMass" | "bodyFat";
type SortDirection = "asc" | "desc";

interface PatientPickerProps {
  patients: Patient[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

function PatientPicker({
  patients,
  value,
  onChange,
  placeholder = "Selecciona un paciente",
  allowClear = false,
  emptyLabel = "Todos los pacientes",
  disabled = false,
}: PatientPickerProps) {
  const [open, setOpen] = useState(false);

  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [patients],
  );

  const selectedPatient = sortedPatients.find((patient) => patient.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
          disabled={disabled}
        >
          {selectedPatient ? selectedPatient.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar paciente..." />
          <CommandEmpty>No se encontraron coincidencias.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  {emptyLabel}
                </CommandItem>
              )}
              {sortedPatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.name}
                  onSelect={() => {
                    onChange(patient.id);
                    setOpen(false);
                  }}
                >
                  {patient.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const numericValue = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: unknown, decimals = 1): string => {
  if (value === null || value === undefined) return "-";
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(decimals);
};

export default function Measurements() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [formMeta, setFormMeta] = useState<{ id: string | null; version: number | null; originalPatientId: string | null }>({
    id: null,
    version: null,
    originalPatientId: null,
  });
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState<MeasurementWithPatient | null>(null);
  const [reportMeasurementId, setReportMeasurementId] = useState<string | null>(null);
  const [reportEditor, setReportEditor] = useState({
    open: false,
    measurement: null as MeasurementWithPatient | null,
    summary: "",
    recommendations: "",
    notes: "",
  });
  const previewRef = useRef<HTMLDivElement | null>(null);
  const initializedFromQueryRef = useRef(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    measurementDate: new Date().toISOString(),
    weight: null as number | null,
    height: null as number | null,
    seatedHeight: null as number | null,
    biacromial: null as number | null,
    thoraxTransverse: null as number | null,
    thoraxAnteroposterior: null as number | null,
    biiliocristideo: null as number | null,
    humeral: null as number | null,
    femoral: null as number | null,
    head: null as number | null,
    relaxedArm: null as number | null,
    flexedArm: null as number | null,
    forearm: null as number | null,
    thoraxCirc: null as number | null,
    waist: null as number | null,
    hip: null as number | null,
    thighSuperior: null as number | null,
    thighMedial: null as number | null,
    calf: null as number | null,
    triceps: null as number | null,
    biceps: null as number | null,
    subscapular: null as number | null,
    suprailiac: null as number | null,
    supraspinal: null as number | null,
    abdominal: null as number | null,
    thighSkinfold: null as number | null,
    calfSkinfold: null as number | null,
    notes: "",
  });

  const resetForm = (presetPatientId?: string) => {
    setFormData({
      patientId: presetPatientId ?? "",
      measurementDate: new Date().toISOString(),
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
      notes: "",
    });
    setFormMeta({ id: null, version: null, originalPatientId: null });
  };

  useEffect(() => {
    if (initializedFromQueryRef.current) return;

    const [, search = ""] = location.split("?");
    if (!search) return;

    const params = new URLSearchParams(search);
    const mode = params.get("mode");
    const presetPatientId = params.get("patientId") || undefined;

    if (presetPatientId && patientFilter === "all") {
      setPatientFilter(presetPatientId);
    }

    if (mode === "create") {
      initializedFromQueryRef.current = true;
      resetForm(presetPatientId);
      setViewMode("create");
    }
  }, [location, patientFilter]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === ""
        ? null
        : field === "patientId" || field === "measurementDate" || field === "notes"
          ? value
          : Number(value),
    }));
  };

  const { data: patients = [], isLoading: loadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery<MeasurementWithPatient[]>({
    queryKey: ["/api/measurements", patientFilter],
    queryFn: async () => {
      const params = patientFilter !== "all" ? `?patientId=${patientFilter}` : "";
      const response = await fetch(`/api/measurements${params}`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
  });

  const filteredMeasurements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? measurements.filter((measurement) => {
          const patientName = measurement.patient?.name?.toLowerCase() ?? "";
          const notes = measurement.notes?.toLowerCase() ?? "";
          return patientName.includes(term) || notes.includes(term);
        })
      : measurements;

    const sorted = [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case "date": {
          const diff = new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime();
          return sortDirection === "asc" ? diff : -diff;
        }
        case "patient": {
          const nameA = (a.patient?.name ?? "").toLowerCase();
          const nameB = (b.patient?.name ?? "").toLowerCase();
          const comparison = nameA.localeCompare(nameB, "es", { sensitivity: "base" });
          return sortDirection === "asc" ? comparison : -comparison;
        }
        case "weight": {
          const diff = numericValue(a.weight) - numericValue(b.weight);
          return sortDirection === "asc" ? diff : -diff;
        }
        case "leanMass": {
          const diff = numericValue(a.calculations?.leanMass) - numericValue(b.calculations?.leanMass);
          return sortDirection === "asc" ? diff : -diff;
        }
        case "fatMass": {
          const diff = numericValue(a.calculations?.adiposeMassKg) - numericValue(b.calculations?.adiposeMassKg);
          return sortDirection === "asc" ? diff : -diff;
        }
        case "bodyFat": {
          const diff = numericValue(a.calculations?.bodyFatPercentage) - numericValue(b.calculations?.bodyFatPercentage);
          return sortDirection === "asc" ? diff : -diff;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [measurements, searchTerm, sortColumn, sortDirection]);

  const createMeasurementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/measurements", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", variables.patientId, "profile"] });
      toast({
        title: "Medición guardada",
        description: "Los cálculos ISAK 2 se generaron automáticamente.",
      });
      setViewMode("list");
      resetForm();
      setLocation(`/pacientes/${variables.patientId}?tab=mediciones`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la medición.",
        variant: "destructive",
      });
    },
  });

  const updateMeasurementMutation = useMutation({
    mutationFn: async ({ id, version, data }: { id: string; version: number; data: typeof formData }) => {
      return await apiRequest("PATCH", `/api/measurements/${id}`, { ...data, version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      if (formMeta.originalPatientId && formMeta.originalPatientId !== formData.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients", formMeta.originalPatientId, "profile"] });
      }
      if (formData.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients", formData.patientId, "profile"] });
      }
      toast({
        title: "Medición actualizada",
        description: "Los cálculos fueron recalculados correctamente.",
      });
      resetForm();
      setViewMode("list");
    },
    onError: (error: any) => {
      const isConflict = error?.message?.includes?.("409");
      toast({
        title: "Error",
        description: isConflict
          ? "La medición fue modificada por otro usuario. Recargá la página."
          : "No se pudo actualizar la medición.",
        variant: "destructive",
      });
    },
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      await apiRequest("DELETE", `/api/measurements/${measurementId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      if (measurementToDelete?.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients", measurementToDelete.patientId, "profile"] });
      }
      toast({
        title: "Medición eliminada",
        description: "El registro se eliminó correctamente.",
      });
      setMeasurementToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la medición.",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async ({
      patientId,
      measurementId,
      summary,
      recommendations,
      notes,
    }: {
      patientId: string;
      measurementId: string;
      summary: string;
      recommendations: string;
      notes: string;
    }) => {
      setReportMeasurementId(measurementId);
      return await apiRequest("POST", "/api/reports/generate", {
        patientId,
        measurementId,
        summary,
        recommendations,
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Informe generado",
        description: "Encontrarás el informe en la sección Informes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setReportEditor({ open: false, measurement: null, summary: "", recommendations: "", notes: "" });
      setPreviewImage(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el informe.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setReportMeasurementId(null);
    },
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-1 h-3 w-3" />;
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const handleOpenCreate = () => {
    resetForm(patientFilter !== "all" ? patientFilter : undefined);
    setViewMode("create");
  };

  const handleEditMeasurement = (measurement: MeasurementWithPatient) => {
    setFormData({
      patientId: measurement.patientId,
      measurementDate: new Date(measurement.measurementDate).toISOString(),
      weight: toNumberOrNull(measurement.weight),
      height: toNumberOrNull(measurement.height),
      seatedHeight: toNumberOrNull(measurement.seatedHeight),
      biacromial: toNumberOrNull(measurement.biacromial),
      thoraxTransverse: toNumberOrNull(measurement.thoraxTransverse),
      thoraxAnteroposterior: toNumberOrNull(measurement.thoraxAnteroposterior),
      biiliocristideo: toNumberOrNull(measurement.biiliocristideo),
      humeral: toNumberOrNull(measurement.humeral),
      femoral: toNumberOrNull(measurement.femoral),
      head: toNumberOrNull(measurement.head),
      relaxedArm: toNumberOrNull(measurement.relaxedArm),
      flexedArm: toNumberOrNull(measurement.flexedArm),
      forearm: toNumberOrNull(measurement.forearm),
      thoraxCirc: toNumberOrNull(measurement.thoraxCirc),
      waist: toNumberOrNull(measurement.waist),
      hip: toNumberOrNull(measurement.hip),
      thighSuperior: toNumberOrNull(measurement.thighSuperior),
      thighMedial: toNumberOrNull(measurement.thighMedial),
      calf: toNumberOrNull(measurement.calf),
      triceps: toNumberOrNull(measurement.triceps),
      biceps: toNumberOrNull((measurement as any).biceps),
      subscapular: toNumberOrNull(measurement.subscapular),
      suprailiac: toNumberOrNull((measurement as any).suprailiac),
      supraspinal: toNumberOrNull(measurement.supraspinal),
      abdominal: toNumberOrNull(measurement.abdominal),
      thighSkinfold: toNumberOrNull(measurement.thighSkinfold),
      calfSkinfold: toNumberOrNull(measurement.calfSkinfold),
      notes: measurement.notes ?? "",
    });
    setFormMeta({
      id: measurement.id,
      version: measurement.version ?? null,
      originalPatientId: measurement.patientId,
    });
    setViewMode("edit");
  };

  const handleSave = () => {
    if (!formData.patientId) {
      toast({
        title: "Datos incompletos",
        description: "Debes seleccionar un paciente antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    if (viewMode === "edit") {
      if (!formMeta.id || formMeta.version === null) {
        toast({
          title: "Error",
          description: "No encontramos la versión de la medición para actualizar.",
          variant: "destructive",
        });
        return;
      }
      updateMeasurementMutation.mutate({ id: formMeta.id, version: formMeta.version, data: formData });
    } else {
    createMeasurementMutation.mutate(formData);
    }
  };

  const handleGenerateReport = (measurement: MeasurementWithPatient) => {
    if (!measurement.patientId) {
      toast({
        title: "Datos faltantes",
        description: "La medición no tiene un paciente asociado.",
        variant: "destructive",
      });
      return;
    }
    openReportDialog(measurement);
  };

  const handleGenerateReportFromForm = () => {
    if (!formMeta.id || !formData.patientId) {
      toast({
        title: "Datos faltantes",
        description: "Guardá la medición antes de generar el informe.",
        variant: "destructive",
      });
      return;
    }
    const measurement = measurements.find((item) => item.id === formMeta.id);
    if (!measurement) {
      toast({
        title: "No encontramos la medición",
        description: "Guardá y recargá la tabla para generar el informe.",
        variant: "destructive",
      });
      return;
    }
    openReportDialog(measurement);
  };

  const handleSubmitReport = () => {
    const measurement = reportEditor.measurement;
    if (!measurement || !measurement.patientId) {
      toast({
        title: "Datos incompletos",
        description: "Seleccioná una medición válida antes de generar el informe.",
        variant: "destructive",
      });
      return;
    }

    generateReportMutation.mutate({
      patientId: measurement.patientId,
      measurementId: measurement.id,
      summary: reportEditor.summary,
      recommendations: reportEditor.recommendations,
      notes: reportEditor.notes,
    });
  };

  const isSaving = createMeasurementMutation.isPending || updateMeasurementMutation.isPending;

  const openReportDialog = (measurement: MeasurementWithPatient) => {
    const measurementDate = measurement.measurementDate
      ? new Date(measurement.measurementDate)
      : new Date();
    const formattedDate = measurementDate.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const objectiveLabel = measurement.patient?.objective ? getObjectiveLabel(measurement.patient.objective) : null;
    const defaultRecommendations = objectiveLabel
      ? `Ajustar el plan para continuar con ${objectiveLabel.toLowerCase()}.`
      : "Reforzar el plan nutricional, hidratación y descanso adecuado.";

    setReportEditor({
      open: true,
      measurement,
      summary: `Evaluación realizada el ${formattedDate} para ${measurement.patient?.name ?? "el paciente"}.`,
      recommendations: defaultRecommendations,
      notes: measurement.notes ?? "",
    });
    setPreviewImage(null);
  };

  const closeReportDialog = () => {
    setReportEditor((prev) => ({ ...prev, open: false }));
    setPreviewImage(null);
  };

  const handleManualPreview = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      setIsGeneratingPreview(true);
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      setPreviewImage(canvas.toDataURL("image/png"));
    } finally {
      setIsGeneratingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (!reportEditor.open) {
      setPreviewImage(null);
      return;
    }
    const timeout = setTimeout(() => {
      void handleManualPreview();
    }, 300);
    return () => clearTimeout(timeout);
  }, [reportEditor.open, handleManualPreview]);

  const reportPreviewDialog = (
    <Dialog open={reportEditor.open} onOpenChange={(open) => (open ? null : closeReportDialog())}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Previsualizar informe profesional</DialogTitle>
          <DialogDescription>
            Ajustá el resumen y las recomendaciones antes de generar el PDF definitivo. Podés actualizar la vista previa para revisar los cambios.
          </DialogDescription>
        </DialogHeader>
        {reportEditor.measurement ? (
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Resumen</Label>
                <Textarea
                  value={reportEditor.summary}
                  onChange={(event) =>
                    setReportEditor((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  className="mt-2 min-h-[90px]"
                  placeholder="Escribí un resumen general de la evaluación"
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Recomendaciones clave</Label>
                <Textarea
                  value={reportEditor.recommendations}
                  onChange={(event) =>
                    setReportEditor((prev) => ({ ...prev, recommendations: event.target.value }))
                  }
                  className="mt-2 min-h-[90px]"
                  placeholder="Indicaciones o próximos pasos sugeridos"
                />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Notas adicionales</Label>
                <Textarea
                  value={reportEditor.notes}
                  onChange={(event) =>
                    setReportEditor((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="mt-2 min-h-[90px]"
                  placeholder="Notas para la entrega o detalles relevantes"
                />
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Vista previa en imagen</p>
                <p className="text-xs text-muted-foreground">
                  La imagen se genera a partir del panel de la derecha. Actualizala luego de editar los textos.
                </p>
                <Button onClick={() => void handleManualPreview()} disabled={isGeneratingPreview} size="sm">
                  {isGeneratingPreview ? "Generando vista previa..." : "Actualizar vista previa"}
                </Button>
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Vista previa del informe"
                    className="w-full rounded-lg border object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    Generá la vista previa para ver la imagen del informe.
                  </div>
                )}
              </div>
            </div>

            <div
              ref={previewRef}
              className="overflow-hidden rounded-2xl border bg-white text-slate-800 shadow-xl"
              style={{ minHeight: "100%" }}
            >
              <div className="bg-gradient-to-r from-sky-600 to-sky-400 px-8 py-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/80">Informe nutricional</p>
                    <h3 className="mt-1 text-2xl font-semibold">{reportEditor.measurement.patient?.name ?? "Paciente"}</h3>
                    <p className="text-sm text-white/80">
                      Evaluación del {new Date(reportEditor.measurement.measurementDate).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.3em]">
                    Carolina Ibáñez
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-8 py-6">
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Objetivo</span>
                    <span className="font-semibold text-slate-700">
                      {reportEditor.measurement.patient?.objective || "No definido"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Peso</span>
                    <span className="font-semibold text-slate-700">
                      {reportEditor.measurement.weight ? `${reportEditor.measurement.weight} kg` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">% de grasa</span>
                    <span className="font-semibold text-slate-700">
                      {reportEditor.measurement.calculations?.bodyFatPercentage
                        ? `${reportEditor.measurement.calculations.bodyFatPercentage}%`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Masa magra</span>
                    <span className="font-semibold text-slate-700">
                      {reportEditor.measurement.calculations?.leanMass
                        ? `${reportEditor.measurement.calculations.leanMass} kg`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumen</h4>
                  <p className="rounded-lg border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {reportEditor.summary || "Agregá un resumen para contextualizar la evaluación."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recomendaciones</h4>
                  <p className="rounded-lg border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {reportEditor.recommendations || "Incluí recomendaciones clave para el paciente."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notas complementarias</h4>
                  <p className="rounded-lg border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {reportEditor.notes || "Podés añadir detalles finales o recordatorios."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Seleccioná una medición para visualizar el informe.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={closeReportDialog} disabled={generateReportMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={generateReportMutation.isPending || !reportEditor.measurement?.patientId}
          >
            {generateReportMutation.isPending ? "Generando informe..." : "Generar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loadingPatients) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  if (viewMode === "list") {
  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mediciones antropométricas</h1>
            <p className="text-muted-foreground">
              Gestiona el historial, edita registros y genera informes profesionales.
            </p>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-new-measurement">
            <Plus className="mr-2 h-4 w-4" />
            Nueva medición
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PatientPicker
            patients={patients}
            value={patientFilter === "all" ? "" : patientFilter}
            onChange={(value) => setPatientFilter(value || "all")}
            allowClear
            emptyLabel="Todos los pacientes"
            placeholder="Filtrar por paciente"
          />
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, nota o valor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Historial de mediciones</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredMeasurements.length} medición{filteredMeasurements.length === 1 ? "" : "es"} mostrada{filteredMeasurements.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardContent>
            {loadingMeasurements ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredMeasurements.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                <p>No encontramos mediciones con los filtros actuales.</p>
                <Button variant="outline" onClick={handleOpenCreate}>
                  Registrar primera medición
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("date")}
                        >
                          Fecha
                          {getSortIcon("date")}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("patient")}
                        >
                          Paciente
                          {getSortIcon("patient")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("weight")}
                        >
                          Peso (kg)
                          {getSortIcon("weight")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("leanMass")}
                        >
                          Masa magra (kg)
                          {getSortIcon("leanMass")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("fatMass")}
                        >
                          Masa grasa (kg)
                          {getSortIcon("fatMass")}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 hover:bg-transparent"
                          onClick={() => handleSort("bodyFat")}
                        >
                          % Grasa
                          {getSortIcon("bodyFat")}
                        </Button>
                      </TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeasurements.map((measurement) => {
                      const dateLabel = new Date(measurement.measurementDate).toLocaleString("es-AR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const patientName = measurement.patient?.name ?? "Paciente sin nombre";
                      return (
                        <TableRow key={measurement.id} className="transition-colors hover:bg-muted/40">
                          <TableCell className="whitespace-nowrap font-mono text-sm">{dateLabel}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="px-0 text-left text-base font-medium text-primary underline-offset-2 hover:underline"
                              onClick={() => handleEditMeasurement(measurement)}
                            >
                              {patientName}
                            </button>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(measurement.weight)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(measurement.calculations?.leanMass)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(measurement.calculations?.adiposeMassKg)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const value = formatNumber(measurement.calculations?.bodyFatPercentage, 1);
                              return value !== "-" ? `${value}%` : "-";
                            })()}
                          </TableCell>
                          <TableCell>
                            {measurement.notes ? (
                              <Dialog>
          <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Ver notas
            </Button>
          </DialogTrigger>
                                <DialogContent className="max-w-lg">
            <DialogHeader>
                                    <DialogTitle>Notas de la medición</DialogTitle>
            </DialogHeader>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{measurement.notes}</p>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                                size="icon"
                                onClick={() => handleEditMeasurement(measurement)}
                                title="Editar medición"
                              >
                                <Edit className="h-4 w-4" />
                        </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleGenerateReport(measurement)}
                                title="Generar informe"
                                disabled={generateReportMutation.isPending && reportMeasurementId === measurement.id}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  setMeasurementToDelete(measurement);
                                  setDeleteDialogOpen(true);
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
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar medición?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el registro de medición y sus cálculos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMeasurementMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => measurementToDelete && deleteMeasurementMutation.mutate(measurementToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMeasurementMutation.isPending}
              >
                {deleteMeasurementMutation.isPending ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {reportPreviewDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => {
            resetForm();
            setViewMode("list");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al historial
        </Button>
        {viewMode === "edit" && formMeta.id && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateReportFromForm}
            disabled={generateReportMutation.isPending && reportMeasurementId === formMeta.id}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generar informe
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {viewMode === "edit" ? "Editar medición" : "Nueva medición"}
        </h1>
        <p className="text-muted-foreground">
          Completa todos los datos ISAK 2 para recalcular automáticamente los indicadores nutricionales.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{viewMode === "edit" ? "Editar medición" : "Registrar medición"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="patientId">Paciente</Label>
              <PatientPicker
                patients={patients}
                value={formData.patientId ?? ""}
                onChange={(value) => handleInputChange("patientId", value)}
                placeholder="Selecciona un paciente"
                disabled={isSaving}
              />
                  </div>
                  <div className="space-y-2">
              <Label htmlFor="measurementDate">Fecha de medición</Label>
                    <Input
                      id="measurementDate"
                      type="datetime-local"
                      value={formData.measurementDate.slice(0, 16)}
                      onChange={(e) => handleInputChange("measurementDate", new Date(e.target.value).toISOString())}
                    />
                  </div>
          </div>

              <Card>
                <CardHeader>
              <CardTitle>Datos básicos</CardTitle>
                </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight ?? ""}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Talla (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height ?? ""}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="seatedHeight">Talla sentado (cm)</Label>
                    <Input
                      id="seatedHeight"
                      type="number"
                      step="0.1"
                      value={formData.seatedHeight ?? ""}
                      onChange={(e) => handleInputChange("seatedHeight", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
              <CardTitle>Diámetros óseos</CardTitle>
                </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="biacromial">Biacromial (cm)</Label>
                    <Input
                      id="biacromial"
                      type="number"
                      step="0.1"
                      value={formData.biacromial ?? ""}
                      onChange={(e) => handleInputChange("biacromial", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="thoraxTransverse">Tórax transverso (cm)</Label>
                    <Input
                      id="thoraxTransverse"
                      type="number"
                      step="0.1"
                      value={formData.thoraxTransverse ?? ""}
                      onChange={(e) => handleInputChange("thoraxTransverse", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="thoraxAnteroposterior">Tórax anteroposterior (cm)</Label>
                    <Input
                      id="thoraxAnteroposterior"
                      type="number"
                      step="0.1"
                      value={formData.thoraxAnteroposterior ?? ""}
                      onChange={(e) => handleInputChange("thoraxAnteroposterior", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="biiliocristideo">Bi-iliocrestídeo (cm)</Label>
                    <Input
                      id="biiliocristideo"
                      type="number"
                      step="0.1"
                      value={formData.biiliocristideo ?? ""}
                      onChange={(e) => handleInputChange("biiliocristideo", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="humeral">Humeral (cm)</Label>
                    <Input
                      id="humeral"
                      type="number"
                      step="0.1"
                      value={formData.humeral ?? ""}
                      onChange={(e) => handleInputChange("humeral", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="femoral">Femoral (cm)</Label>
                    <Input
                      id="femoral"
                      type="number"
                      step="0.1"
                      value={formData.femoral ?? ""}
                      onChange={(e) => handleInputChange("femoral", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Perímetros</CardTitle>
                </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="head">Cabeza (cm)</Label>
                    <Input
                      id="head"
                      type="number"
                      step="0.1"
                      value={formData.head ?? ""}
                      onChange={(e) => handleInputChange("head", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="relaxedArm">Brazo relajado (cm)</Label>
                    <Input
                      id="relaxedArm"
                      type="number"
                      step="0.1"
                      value={formData.relaxedArm ?? ""}
                      onChange={(e) => handleInputChange("relaxedArm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="flexedArm">Brazo flexionado (cm)</Label>
                    <Input
                      id="flexedArm"
                      type="number"
                      step="0.1"
                      value={formData.flexedArm ?? ""}
                      onChange={(e) => handleInputChange("flexedArm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forearm">Antebrazo (cm)</Label>
                    <Input
                      id="forearm"
                      type="number"
                      step="0.1"
                      value={formData.forearm ?? ""}
                      onChange={(e) => handleInputChange("forearm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thoraxCirc">Tórax (cm)</Label>
                    <Input
                      id="thoraxCirc"
                      type="number"
                      step="0.1"
                      value={formData.thoraxCirc ?? ""}
                      onChange={(e) => handleInputChange("thoraxCirc", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="waist">Cintura mínima (cm)</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.1"
                      value={formData.waist ?? ""}
                      onChange={(e) => handleInputChange("waist", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="hip">Cadera máxima (cm)</Label>
                    <Input
                      id="hip"
                      type="number"
                      step="0.1"
                      value={formData.hip ?? ""}
                      onChange={(e) => handleInputChange("hip", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="thighSuperior">Muslo superior (cm)</Label>
                    <Input
                      id="thighSuperior"
                      type="number"
                      step="0.1"
                      value={formData.thighSuperior ?? ""}
                      onChange={(e) => handleInputChange("thighSuperior", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="thighMedial">Muslo medial (cm)</Label>
                    <Input
                      id="thighMedial"
                      type="number"
                      step="0.1"
                      value={formData.thighMedial ?? ""}
                      onChange={(e) => handleInputChange("thighMedial", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="calf">Pantorrilla máxima (cm)</Label>
                    <Input
                      id="calf"
                      type="number"
                      step="0.1"
                      value={formData.calf ?? ""}
                      onChange={(e) => handleInputChange("calf", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
              <CardTitle>Pliegues cutáneos</CardTitle>
                </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                <Label htmlFor="triceps">Tríceps (mm)</Label>
                    <Input
                      id="triceps"
                      type="number"
                      step="0.1"
                      value={formData.triceps ?? ""}
                      onChange={(e) => handleInputChange("triceps", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="biceps">Bíceps (mm)</Label>
                <Input
                  id="biceps"
                  type="number"
                  step="0.1"
                  value={formData.biceps ?? ""}
                  onChange={(e) => handleInputChange("biceps", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscapular">Subescapular (mm)</Label>
                    <Input
                      id="subscapular"
                      type="number"
                      step="0.1"
                      value={formData.subscapular ?? ""}
                      onChange={(e) => handleInputChange("subscapular", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suprailiac">Suprailiaco (mm)</Label>
                <Input
                  id="suprailiac"
                  type="number"
                  step="0.1"
                  value={formData.suprailiac ?? ""}
                  onChange={(e) => handleInputChange("suprailiac", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supraspinal">Supraespinal (mm)</Label>
                    <Input
                      id="supraspinal"
                      type="number"
                      step="0.1"
                      value={formData.supraspinal ?? ""}
                      onChange={(e) => handleInputChange("supraspinal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abdominal">Abdominal (mm)</Label>
                    <Input
                      id="abdominal"
                      type="number"
                      step="0.1"
                      value={formData.abdominal ?? ""}
                      onChange={(e) => handleInputChange("abdominal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                <Label htmlFor="thighSkinfold">Muslo medial (mm)</Label>
                    <Input
                      id="thighSkinfold"
                      type="number"
                      step="0.1"
                      value={formData.thighSkinfold ?? ""}
                      onChange={(e) => handleInputChange("thighSkinfold", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calfSkinfold">Pantorrilla (mm)</Label>
                    <Input
                      id="calfSkinfold"
                      type="number"
                      step="0.1"
                      value={formData.calfSkinfold ?? ""}
                      onChange={(e) => handleInputChange("calfSkinfold", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
              <CardTitle>Notas adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="notes"
                placeholder="Observaciones, condiciones especiales, recomendaciones para el informe..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                className="min-h-32"
                  />
            </CardContent>
          </Card>
                </CardContent>
              </Card>

      <div className="flex flex-col gap-3 rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calculator className="h-4 w-4" />
          <span>
            Los cálculos ISAK 2 se recalculan automáticamente al guardar la medición.
          </span>
                </div>
        <div className="flex flex-wrap items-center gap-2">
                <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              setViewMode("list");
            }}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
                  onClick={handleSave}
            disabled={isSaving || !formData.patientId}
                >
            {isSaving ? "Guardando..." : viewMode === "edit" ? "Guardar cambios" : "Guardar y calcular"}
                </Button>
              </div>
            </div>
      {reportPreviewDialog}
    </div>
  );
}
