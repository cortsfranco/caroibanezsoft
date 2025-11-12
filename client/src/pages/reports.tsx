import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateCompositionReport } from "@/lib/pdf-generator";
import { calculateBodyComposition, type MeasurementData } from "@/lib/isak-calculations";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const { toast } = useToast();
  
  // Mock data completo para demostración (simula mediciones ISAK completas)
  const mockMeasurements: Record<string, MeasurementData> = {
    "1": {
      weight: 78.4,
      height: 182,
      seatedHeight: 92.8,
      triceps: 5.0,
      subscapular: 6.0,
      supraspinal: 5.0,
      abdominal: 13.0,
      thighSkinfold: 10.0,
      calfSkinfold: 8.0,
      head: 57.5,
      relaxedArm: 30.0,
      flexedArm: 33.3,
      forearm: 26.6,
      thoraxCirc: 92.2,
      waist: 77.0,
      hip: 100.0,
      thighSuperior: 60.0,
      thighMedial: 54.5,
      calf: 37.5,
      biacromial: 41.6,
      thoraxTransverse: 28.0,
      thoraxAnteroposterior: 20.0,
      biiliocristideo: 32.0,
      humeral: 6.9,
      femoral: 9.6,
    },
    "2": {
      weight: 65.5,
      height: 168,
      seatedHeight: 88.0,
      triceps: 12.0,
      subscapular: 10.5,
      supraspinal: 9.0,
      abdominal: 15.0,
      thighSkinfold: 18.0,
      calfSkinfold: 12.0,
      head: 55.0,
      relaxedArm: 28.0,
      flexedArm: 30.5,
      forearm: 24.0,
      thoraxCirc: 85.0,
      waist: 72.0,
      hip: 95.0,
      thighSuperior: 56.0,
      thighMedial: 50.0,
      calf: 35.0,
      biacromial: 38.0,
      thoraxTransverse: 26.0,
      thoraxAnteroposterior: 18.5,
      biiliocristideo: 30.0,
      humeral: 6.2,
      femoral: 8.8,
    },
  };
  
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
  
  const handleDownloadPDF = async (report: any) => {
    try {
      // Obtener datos de medición para este reporte
      const measurementData = mockMeasurements[report.id];
      
      if (!measurementData) {
        toast({
          title: "Datos no disponibles",
          description: "No se encontraron mediciones para este informe.",
          variant: "destructive",
        });
        return;
      }
      
      // Calcular composición corporal usando ISAK 2
      const bodyComposition = calculateBodyComposition(measurementData, 'male');
      
      // Calcular edad (mock - en producción vendría del paciente)
      const age = report.id === "1" ? 31.17 : 28.5;
      
      // Generar PDF
      await generateCompositionReport({
        patient: {
          name: report.patient,
          age: age,
          measurementNumber: report.measurementNumber,
          measurementDate: report.date,
        },
        measurement: measurementData as any, // Casting temporal
        bodyComposition,
        objective: "Aumento de masa muscular",
      });
      
      toast({
        title: "PDF Generado",
        description: `Informe de ${report.patient} descargado exitosamente.`,
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al generar el PDF.",
        variant: "destructive",
      });
    }
  };

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
                    onClick={() => setSelectedReport(report)}
                    data-testid={`button-view-report-${report.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    disabled={report.status === "Pendiente"}
                    onClick={() => handleDownloadPDF(report)}
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

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informe de Composición Corporal</DialogTitle>
            <DialogDescription>
              {selectedReport?.patient} - Medición #{selectedReport?.measurementNumber} - {selectedReport?.date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Paciente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{selectedReport?.patient}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Fecha de Medición</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{selectedReport?.date}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Fraccionamiento de 5 Componentes (D. Kerr 1988)</CardTitle>
                <CardDescription>Valores según método ISAK 2</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Masa Muscular</span>
                    <span className="text-xl font-bold">45.2 kg (42.1%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Masa Adiposa</span>
                    <span className="text-xl font-bold">12.8 kg (11.9%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Masa Ósea</span>
                    <span className="text-xl font-bold">10.5 kg (9.8%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Masa Residual</span>
                    <span className="text-xl font-bold">24.1 kg (22.4%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Masa Piel</span>
                    <span className="text-xl font-bold">3.8 kg (3.5%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medidas Antropométricas</CardTitle>
                <CardDescription>Pliegues, perímetros y diámetros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Pliegues (mm)</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Tríceps: 12.5</p>
                      <p>Subescapular: 10.2</p>
                      <p>Bíceps: 8.3</p>
                      <p>Supraespinal: 9.8</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Perímetros (cm)</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Brazo relajado: 32.4</p>
                      <p>Brazo contraído: 34.8</p>
                      <p>Cintura: 78.5</p>
                      <p>Cadera: 95.2</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-muted-foreground text-center">
                Este es un informe de ejemplo con datos de muestra. 
                La funcionalidad completa de generación de informes se implementará en la siguiente fase.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
