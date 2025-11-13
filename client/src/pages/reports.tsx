import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Calendar, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Report, Patient } from "@shared/schema";

function toStatusLabel(status?: string | null) {
  const normalized = (status ?? "pending").toLowerCase();
  if (normalized === "completed" || normalized === "generated") {
    return { label: "Completado", variant: "default" as const, completed: true };
  }
  return { label: "Pendiente", variant: "secondary" as const, completed: false };
}

export default function Reports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", patientFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (patientFilter !== "all") {
        params.set("patientId", patientFilter);
      }
      const response = await fetch(`/api/reports${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      return response.json();
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Informe eliminado",
        description: "El informe se eliminó correctamente.",
      });
      setReportToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el informe",
        variant: "destructive",
      });
    },
  });

  const patientLookup = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((patient) => map.set(patient.id, patient));
    return map;
  }, [patients]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (patientFilter !== "all" && report.patientId !== patientFilter) {
        return false;
      }
      if (statusFilter === "all") return true;
      const { completed } = toStatusLabel(report.status);
      return statusFilter === "completed" ? completed : !completed;
    });
  }, [reports, patientFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando informes…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Informes</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza, descarga y administra los informes generados para tus pacientes.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={patientFilter} onValueChange={(value) => {
          setPatientFilter(value);
        }}>
          <SelectTrigger className="w-52" data-testid="select-patient-filter">
            <SelectValue placeholder="Filtrar por paciente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pacientes</SelectItem>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Completados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4" />
            No hay informes que coincidan con el filtro seleccionado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => {
            const patient = patientLookup.get(report.patientId);
            const statusInfo = toStatusLabel(report.status);
            const createdAt = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "-";

            return (
              <Card key={report.id} className="hover-elevate" data-testid={`report-card-${report.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {patient?.name ?? "Paciente desconocido"}
                        </CardTitle>
                        <CardDescription>
                          {report.measurementId ? `Medición #${report.measurementId.slice(0, 8)}` : "Sin medición asociada"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setReportToDelete(report)}
                        data-testid={`button-delete-report-${report.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{createdAt}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!statusInfo.completed}
                        onClick={() => setSelectedReport(report)}
                        data-testid={`button-view-report-${report.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={!statusInfo.completed || !report.pdfUrl}
                        onClick={() => report.pdfUrl && window.open(report.pdfUrl, "_blank", "noopener")}
                        data-testid={`button-download-report-${report.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedReport} onOpenChange={setSelectedReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informe de Medición</DialogTitle>
            <DialogDescription>
              Detalles del informe de la medición {selectedReport?.measurementId}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-semibold">Paciente</h3>
              <p>{patientLookup.get(selectedReport?.patientId)?.name ?? "Desconocido"}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Medición</h3>
              <p>ID: {selectedReport?.measurementId}</p>
              <p>Fecha: {selectedReport?.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : "-"}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Estado</h3>
              <p>{toStatusLabel(selectedReport?.status).label}</p>
            </div>
            {selectedReport?.pdfUrl && (
              <div>
                <h3 className="text-lg font-semibold">PDF</h3>
                <a
                  href={selectedReport.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Ver PDF
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!reportToDelete} onOpenChange={setReportToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este informe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará el informe de manera permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => reportToDelete && deleteReportMutation.mutate(reportToDelete.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}