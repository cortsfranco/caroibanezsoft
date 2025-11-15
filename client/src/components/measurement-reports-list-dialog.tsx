import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { Report, Measurement } from "@shared/schema";

interface MeasurementReportsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: Report[];
  measurement?: Measurement & {
    patient?: {
      name: string | null;
    } | null;
  };
}

export function MeasurementReportsListDialog({ 
  open, 
  onOpenChange, 
  reports,
  measurement
}: MeasurementReportsListDialogProps) {
  const handleDownload = (reportId: string) => {
    window.open(`/api/reports/${reportId}/download`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informes generados
          </DialogTitle>
          <DialogDescription>
            {measurement && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>{measurement.patient?.name ?? "Sin nombre"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(measurement.measurementDate), "dd/MM/yyyy HH:mm")} hs</span>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {reports.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              No hay informes generados para esta medición
            </div>
          ) : (
            reports.map((report, index) => (
              <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          Informe #{index + 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {report.id.slice(0, 8)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Generado el {format(new Date(report.createdAt), "dd/MM/yyyy 'a las' HH:mm")} hs
                      </div>

                      {report.summary && (
                        <>
                          <Separator className="my-2" />
                          <div className="text-sm">
                            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              Resumen
                            </p>
                            <p className="text-sm line-clamp-3">{report.summary}</p>
                          </div>
                        </>
                      )}

                      {report.recommendations && (
                        <div className="text-sm">
                          <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Recomendaciones
                          </p>
                          <p className="text-sm line-clamp-2 text-muted-foreground">{report.recommendations}</p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report.id)}
                      data-testid={`button-download-report-${report.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
