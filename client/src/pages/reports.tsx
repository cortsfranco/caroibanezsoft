import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Reports() {
  const mockReports = [
    {
      id: "1",
      patient: "Franco Corts",
      date: "15/08/2023",
      type: "Composición Corporal",
      status: "Completado",
      measurementNumber: 7,
    },
    {
      id: "2",
      patient: "María González",
      date: "10/12/2024",
      type: "Composición Corporal",
      status: "Completado",
      measurementNumber: 3,
    },
    {
      id: "3",
      patient: "Juan Pérez",
      date: "05/12/2024",
      type: "Composición Corporal",
      status: "Completado",
      measurementNumber: 5,
    },
    {
      id: "4",
      patient: "Ana Martínez",
      date: "12/12/2024",
      type: "Composición Corporal",
      status: "Pendiente",
      measurementNumber: 2,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Informes</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza y descarga informes de composición corporal
        </p>
      </div>

      <div className="flex gap-4">
        <Select defaultValue="all">
          <SelectTrigger className="w-[200px]" data-testid="select-patient-filter">
            <SelectValue placeholder="Filtrar por paciente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pacientes</SelectItem>
            <SelectItem value="1">Franco Corts</SelectItem>
            <SelectItem value="2">María González</SelectItem>
            <SelectItem value="3">Juan Pérez</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {mockReports.map((report) => (
          <Card key={report.id} className="hover-elevate" data-testid={`report-card-${report.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.patient}</CardTitle>
                    <CardDescription>
                      Medición #{report.measurementNumber} - {report.type}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={report.status === "Completado" ? "default" : "secondary"}
                  className={
                    report.status === "Completado"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : ""
                  }
                >
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{report.date}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={report.status === "Pendiente"}
                    data-testid={`button-view-report-${report.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    disabled={report.status === "Pendiente"}
                    data-testid={`button-download-report-${report.id}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generación Automática de Informes</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            Los informes se generan automáticamente al completar una medición antropométrica.
            Incluyen fraccionamiento de 5 componentes, gráficos Score-Z y análisis detallado.
          </p>
          <Button variant="outline">
            Ver Ejemplo de Informe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
