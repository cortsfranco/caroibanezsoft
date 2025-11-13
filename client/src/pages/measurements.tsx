import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Calculator, Plus, Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient } from "@shared/schema";

interface Measurement {
  id: string;
  patientId: string;
  measurementDate: string;
  weight: number | null;
  height: number | null;
  triceps: number | null;
  subscapular: number | null;
  supraspinal: number | null;
  abdominal: number | null;
  waist: number | null;
  hip: number | null;
  notes: string | null;
}

interface MeasurementWithPatient extends Measurement {
  patient?: { name: string } | null;
}

export default function Measurements() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
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
    subscapular: null as number | null,
    supraspinal: null as number | null,
    abdominal: null as number | null,
    thighSkinfold: null as number | null,
    calfSkinfold: null as number | null,
    notes: "",
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery<MeasurementWithPatient[]>({
    queryKey: ["/api/measurements/all"],
    queryFn: async () => {
      const response = await fetch("/api/measurements");
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
  });

  // Sort patients alphabetically by name
  const sortedPatients = [...patients].sort((a, b) => a.name.localeCompare(b.name));

  // Sort measurements by date (newest first)
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
  );

  const selectedPatient = sortedPatients.find((p) => p.id === formData.patientId);

  const createMeasurementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/measurements", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
      setIsDialogOpen(false);
      toast({
        title: "Medición guardada",
        description: "Los cálculos ISAK 2 se generaron automáticamente",
      });
      
      // Redirect to patient profile with measurements tab
      setLocation(`/pacientes/${variables.patientId}?tab=mediciones`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la medición",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === "" ? null : field === "patientId" || field === "measurementDate" || field === "notes" ? value : Number(value),
    }));
  };

  const handleSave = () => {
    if (!formData.patientId) {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar un paciente",
        variant: "destructive",
      });
      return;
    }
    createMeasurementMutation.mutate(formData);
  };

  const calculateBMI = (weight: number | null, height: number | null) => {
    if (!weight || !height) return null;
    return (weight / ((height / 100) ** 2)).toFixed(1);
  };

  if (loadingPatients || loadingMeasurements) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with New Measurement button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-measurements-title">
            Mediciones Antropométricas
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial completo de mediciones ISAK 2 de todos los pacientes
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-new-measurement">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Medición
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Medición Antropométrica</DialogTitle>
              <DialogDescription>
                Método ISAK 2 - Fraccionamiento 5 Componentes (D. Kerr 1988)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Patient Selection & Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Paciente</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="patient">Paciente *</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between"
                          data-testid="button-select-patient"
                        >
                          {selectedPatient ? selectedPatient.name : "Seleccionar paciente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar paciente..." data-testid="input-search-patient" />
                          <CommandList>
                            <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
                            <CommandGroup>
                              {sortedPatients.map((patient) => (
                                <CommandItem
                                  key={patient.id}
                                  value={patient.name}
                                  onSelect={() => {
                                    handleInputChange("patientId", patient.id);
                                    setOpenCombobox(false);
                                  }}
                                  data-testid={`option-patient-${patient.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.patientId === patient.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {patient.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurementDate">Fecha de Medición</Label>
                    <Input
                      id="measurementDate"
                      type="datetime-local"
                      value={formData.measurementDate.slice(0, 16)}
                      onChange={(e) => handleInputChange("measurementDate", new Date(e.target.value).toISOString())}
                      data-testid="input-measurement-date"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Basic Measurements */}
              <Card>
                <CardHeader>
                  <CardTitle>Datos Básicos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      placeholder="78.5"
                      value={formData.weight ?? ""}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                      data-testid="input-weight"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Talla (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="182.0"
                      value={formData.height ?? ""}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                      data-testid="input-height"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seatedHeight">Talla Sentado (cm)</Label>
                    <Input
                      id="seatedHeight"
                      type="number"
                      step="0.1"
                      placeholder="92.8"
                      value={formData.seatedHeight ?? ""}
                      onChange={(e) => handleInputChange("seatedHeight", e.target.value)}
                      data-testid="input-seated-height"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Diameters */}
              <Card>
                <CardHeader>
                  <CardTitle>Diámetros Óseos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-6">
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
                    <Label htmlFor="thoraxTransverse">Tórax Transverso (cm)</Label>
                    <Input
                      id="thoraxTransverse"
                      type="number"
                      step="0.1"
                      value={formData.thoraxTransverse ?? ""}
                      onChange={(e) => handleInputChange("thoraxTransverse", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thoraxAnteroposterior">Tórax Anteroposterior (cm)</Label>
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

              {/* Perimeters */}
              <Card>
                <CardHeader>
                  <CardTitle>Perímetros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-6">
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
                    <Label htmlFor="relaxedArm">Brazo Relajado (cm)</Label>
                    <Input
                      id="relaxedArm"
                      type="number"
                      step="0.1"
                      value={formData.relaxedArm ?? ""}
                      onChange={(e) => handleInputChange("relaxedArm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flexedArm">Brazo Flexionado (cm)</Label>
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
                    <Label htmlFor="waist">Cintura (cm)</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.1"
                      value={formData.waist ?? ""}
                      onChange={(e) => handleInputChange("waist", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hip">Cadera (cm)</Label>
                    <Input
                      id="hip"
                      type="number"
                      step="0.1"
                      value={formData.hip ?? ""}
                      onChange={(e) => handleInputChange("hip", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thighSuperior">Muslo Superior (cm)</Label>
                    <Input
                      id="thighSuperior"
                      type="number"
                      step="0.1"
                      value={formData.thighSuperior ?? ""}
                      onChange={(e) => handleInputChange("thighSuperior", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thighMedial">Muslo Medial (cm)</Label>
                    <Input
                      id="thighMedial"
                      type="number"
                      step="0.1"
                      value={formData.thighMedial ?? ""}
                      onChange={(e) => handleInputChange("thighMedial", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calf">Pantorrilla (cm)</Label>
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

              {/* Skinfolds */}
              <Card>
                <CardHeader>
                  <CardTitle>Pliegues Cutáneos (Durnin & Womersley 4 sitios)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="triceps">Tríceps (mm) *</Label>
                    <Input
                      id="triceps"
                      type="number"
                      step="0.1"
                      value={formData.triceps ?? ""}
                      onChange={(e) => handleInputChange("triceps", e.target.value)}
                      data-testid="input-triceps"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subscapular">Subescapular (mm) *</Label>
                    <Input
                      id="subscapular"
                      type="number"
                      step="0.1"
                      value={formData.subscapular ?? ""}
                      onChange={(e) => handleInputChange("subscapular", e.target.value)}
                      data-testid="input-subscapular"
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
                    <Label htmlFor="thighSkinfold">Muslo (mm)</Label>
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

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notas Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="notes"
                    placeholder="Observaciones, condiciones especiales, etc..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    className="min-h-24"
                  />
                </CardContent>
              </Card>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calculator className="h-4 w-4" />
                  <span>Los cálculos ISAK 2 se generarán automáticamente</span>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={createMeasurementMutation.isPending || !formData.patientId}
                  size="lg"
                  data-testid="button-save-measurement"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMeasurementMutation.isPending ? "Guardando..." : "Guardar y Calcular"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Measurements History Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Historial de Mediciones</CardTitle>
          <CardDescription>
            Registro completo de todas las mediciones antropométricas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedMeasurements.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mt-4">
                No hay mediciones registradas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Presiona "Nueva Medición" para comenzar
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Talla (cm)</TableHead>
                    <TableHead className="text-right">IMC</TableHead>
                    <TableHead className="text-right">Cintura (cm)</TableHead>
                    <TableHead className="text-right">Cadera (cm)</TableHead>
                    <TableHead className="text-right">Σ Pliegues (mm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMeasurements.map((measurement) => {
                    const sumSkinfolds = [
                      measurement.triceps,
                      measurement.subscapular,
                      measurement.supraspinal,
                      measurement.abdominal,
                    ].filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);

                    return (
                      <TableRow 
                        key={measurement.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/pacientes/${measurement.patientId}?tab=mediciones`)}
                        data-testid={`row-measurement-${measurement.id}`}
                      >
                        <TableCell>
                          {new Date(measurement.measurementDate).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {measurement.patient?.name || "Desconocido"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {measurement.weight?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {measurement.height?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {calculateBMI(measurement.weight, measurement.height) || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {measurement.waist?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {measurement.hip?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {sumSkinfolds > 0 ? sumSkinfolds.toFixed(1) : '-'}
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
    </div>
  );
}
