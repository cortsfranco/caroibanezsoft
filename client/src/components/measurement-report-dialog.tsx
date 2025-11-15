import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Measurement, Report } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

interface MeasurementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: (Measurement & { patient?: { name: string | null; objective: string | null } | null }) | null;
  existingReports: Report[];
  onGenerated?: () => void;
}

export function MeasurementReportDialog({
  open,
  onOpenChange,
  measurement,
  existingReports,
  onGenerated,
}: MeasurementReportDialogProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !measurement) return;

    const measurementDate = measurement.measurementDate
      ? new Date(measurement.measurementDate)
      : new Date();
    const formattedDate = format(measurementDate, "dd 'de' MMMM 'de' yyyy");

    const defaultSummary = `Evaluación antropométrica realizada el ${formattedDate} para ${
      measurement.patient?.name ?? "el paciente"
    }, aplicando protocolo ISAK 2 (5 componentes).`;

    const defaultRecommendations = measurement.patient?.objective
      ? `Ajustar plan nutricional y de entrenamiento para reforzar el objetivo de ${measurement.patient.objective.toLowerCase()}.`
      : "Reforzar el plan nutricional, hidratación, descanso y seguimiento semanal.";

    setSummary(defaultSummary);
    setRecommendations(defaultRecommendations);
    setNotes(measurement.notes ?? "");
  }, [measurement, open]);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!measurement?.patientId) throw new Error("La medición seleccionada no tiene paciente asociado.");
      return await apiRequest("POST", "/api/reports/generate", {
        patientId: measurement.patientId,
        measurementId: measurement.id,
        summary,
        recommendations,
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Informe generado",
        description: "El PDF se agregó al historial del paciente.",
      });
      if (measurement?.patientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/reports", { patientId: measurement.patientId }] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients", measurement.patientId, "profile"] });
      }
      onGenerated?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No pudimos generar el informe. Intentalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const existingReportsForMeasurement = useMemo(() => {
    if (!measurement) return [];
    return existingReports.filter((report) => report.measurementId === measurement.id);
  }, [existingReports, measurement]);

  const isGenerating = generateReportMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && onOpenChange(value)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generar informe PDF</DialogTitle>
          <DialogDescription>
            Configurá el resumen y las recomendaciones antes de producir el informe profesional para el paciente.
          </DialogDescription>
        </DialogHeader>

        {measurement ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
              <ScrollArea className="h-[450px] rounded-md border p-4">
                <div className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <Label htmlFor="summary">Resumen principal</Label>
                    <Textarea
                      id="summary"
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      className="min-h-[100px]"
                      placeholder="Describe el contexto general de la medición y los hallazgos más relevantes."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recommendations">Recomendaciones</Label>
                    <Textarea
                      id="recommendations"
                      value={recommendations}
                      onChange={(event) => setRecommendations(event.target.value)}
                      className="min-h-[100px]"
                      placeholder="Detalla los próximos pasos para plan nutricional, entrenamiento y seguimiento."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas adicionales</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="min-h-[100px]"
                      placeholder="Agrega precisiones complementarias que quieras conservar en el informe."
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="border-primary/30 bg-primary/5 rounded-lg border">
                <div className="flex items-center gap-2 p-4 border-b border-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-primary">Vista previa de datos del informe</h3>
                </div>
                <ScrollArea className="h-[406px]">
                  <div className="space-y-3 p-4 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">Datos básicos</p>
                      <MeasurementRow label="Paciente" value={measurement.patient?.name ?? "Sin nombre"} />
                      <MeasurementRow label="Fecha" value={format(new Date(measurement.measurementDate), "dd/MM/yyyy HH:mm")} />
                      <MeasurementRow label="Peso (kg)" value={formatValue(measurement.weight)} />
                      <MeasurementRow label="Talla (cm)" value={formatValue(measurement.height)} />
                      <MeasurementRow label="Talla sentado (cm)" value={formatValue(measurement.seatedHeight)} />
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">Diámetros (cm)</p>
                      <MeasurementRow label="Biacromial" value={formatValue(measurement.biacromial)} />
                      <MeasurementRow label="Tórax Transverso" value={formatValue(measurement.thoraxTransverse)} />
                      <MeasurementRow label="Tórax Anteroposterior" value={formatValue(measurement.thoraxAnteroposterior)} />
                      <MeasurementRow label="Bi-iliocrestídeo" value={formatValue(measurement.biiliocristideo)} />
                      <MeasurementRow label="Humeral" value={formatValue(measurement.humeral)} />
                      <MeasurementRow label="Femoral" value={formatValue(measurement.femoral)} />
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">Perímetros (cm)</p>
                      <MeasurementRow label="Cabeza" value={formatValue(measurement.head)} />
                      <MeasurementRow label="Brazo Relajado" value={formatValue(measurement.relaxedArm)} />
                      <MeasurementRow label="Brazo Flexionado" value={formatValue(measurement.flexedArm)} />
                      <MeasurementRow label="Antebrazo" value={formatValue(measurement.forearm)} />
                      <MeasurementRow label="Tórax Mesoesternal" value={formatValue(measurement.thoraxCirc)} />
                      <MeasurementRow label="Cintura" value={formatValue(measurement.waist)} />
                      <MeasurementRow label="Caderas" value={formatValue(measurement.hip)} />
                      <MeasurementRow label="Muslo Superior" value={formatValue(measurement.thighSuperior)} />
                      <MeasurementRow label="Muslo Medial" value={formatValue(measurement.thighMedial)} />
                      <MeasurementRow label="Pantorrilla" value={formatValue(measurement.calf)} />
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">Pliegues cutáneos (mm)</p>
                      <MeasurementRow label="Tríceps" value={formatValue(measurement.triceps)} />
                      <MeasurementRow label="Subescapular" value={formatValue(measurement.subscapular)} />
                      <MeasurementRow label="Supraespinal" value={formatValue(measurement.supraspinal)} />
                      <MeasurementRow label="Abdominal" value={formatValue(measurement.abdominal)} />
                      <MeasurementRow label="Muslo Medial" value={formatValue(measurement.thighSkinfold)} />
                      <MeasurementRow label="Pantorrilla" value={formatValue(measurement.calfSkinfold)} />
                      <div className="mt-2 rounded-md bg-background/50 px-2 py-1.5 font-medium">
                        <MeasurementRow label="Σ de 6 pliegues" value={calculateSumOf6(measurement)} />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground">Informes previos</p>
                      {existingReportsForMeasurement.length === 0 ? (
                        <p className="text-muted-foreground">Todavía no generaste un informe para esta medición.</p>
                      ) : (
                        <div className="space-y-1">
                          {existingReportsForMeasurement.map((report) => (
                            <Badge key={report.id} variant="outline" className="justify-start text-xs">
                              Informe #{report.id.slice(0, 8)} • {format(new Date(report.createdAt), "dd/MM HH:mm")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Seleccioná una medición del historial para generar su informe.
          </div>
        )}

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Los informes se guardan automáticamente en la pestaña Informes y pueden compartirse por WhatsApp desde la ficha.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={() => generateReportMutation.mutate()} disabled={!measurement || isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                "Generar informe"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatValue(value: unknown, suffix?: string) {
  if (value === null || value === undefined) return "-";
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(1)}${suffix ? ` ${suffix}` : ""}`;
}

function calculateSumOf6(measurement: Measurement) {
  const values: Array<keyof Measurement> = [
    "triceps",
    "subscapular",
    "supraspinal",
    "abdominal",
    "thighSkinfold",
    "calfSkinfold",
  ];
  const sum = values.reduce((acc, key) => {
    const raw = measurement[key];
    const value = typeof raw === "number" ? raw : raw ? parseFloat(String(raw)) : 0;
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);

  return sum > 0 ? `${sum.toFixed(1)} mm` : "-";
}

function MeasurementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border bg-background/70 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

