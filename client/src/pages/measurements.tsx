import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Calculator } from "lucide-react";
import type { Patient } from "@shared/schema";

export default function Measurements() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  const createMeasurementMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/measurements", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
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

  if (loadingPatients) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-measurements-title">
          Nueva Medición Antropométrica
        </h1>
        <p className="text-muted-foreground mt-1">
          Método ISAK 2 - Fraccionamiento 5 Componentes (D. Kerr 1988)
        </p>
      </div>

      {/* Patient Selection & Date */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="patient">Paciente *</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => handleInputChange("patientId", value)}
            >
              <SelectTrigger id="patient" data-testid="select-patient">
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name} {patient.email && `- ${patient.email}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="41.6"
              value={formData.biacromial ?? ""}
              onChange={(e) => handleInputChange("biacromial", e.target.value)}
              data-testid="input-biacromial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thoraxTransverse">Tórax Transverso (cm)</Label>
            <Input
              id="thoraxTransverse"
              type="number"
              step="0.1"
              placeholder="28.0"
              value={formData.thoraxTransverse ?? ""}
              onChange={(e) => handleInputChange("thoraxTransverse", e.target.value)}
              data-testid="input-thorax-transverse"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thoraxAnteroposterior">Tórax Anteroposterior (cm)</Label>
            <Input
              id="thoraxAnteroposterior"
              type="number"
              step="0.1"
              placeholder="20.0"
              value={formData.thoraxAnteroposterior ?? ""}
              onChange={(e) => handleInputChange("thoraxAnteroposterior", e.target.value)}
              data-testid="input-thorax-anteroposterior"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biiliocristideo">Bi-iliocrestídeo (cm)</Label>
            <Input
              id="biiliocristideo"
              type="number"
              step="0.1"
              placeholder="32.0"
              value={formData.biiliocristideo ?? ""}
              onChange={(e) => handleInputChange("biiliocristideo", e.target.value)}
              data-testid="input-biiliocristideo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="humeral">Humeral (biepicondilar) (cm)</Label>
            <Input
              id="humeral"
              type="number"
              step="0.1"
              placeholder="6.9"
              value={formData.humeral ?? ""}
              onChange={(e) => handleInputChange("humeral", e.target.value)}
              data-testid="input-humeral"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="femoral">Femoral (biepicondilar) (cm)</Label>
            <Input
              id="femoral"
              type="number"
              step="0.1"
              placeholder="9.6"
              value={formData.femoral ?? ""}
              onChange={(e) => handleInputChange("femoral", e.target.value)}
              data-testid="input-femoral"
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
              placeholder="57.5"
              value={formData.head ?? ""}
              onChange={(e) => handleInputChange("head", e.target.value)}
              data-testid="input-head"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relaxedArm">Brazo Relajado (cm)</Label>
            <Input
              id="relaxedArm"
              type="number"
              step="0.1"
              placeholder="30.0"
              value={formData.relaxedArm ?? ""}
              onChange={(e) => handleInputChange("relaxedArm", e.target.value)}
              data-testid="input-relaxed-arm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flexedArm">Brazo Flexionado en Tensión (cm)</Label>
            <Input
              id="flexedArm"
              type="number"
              step="0.1"
              placeholder="33.3"
              value={formData.flexedArm ?? ""}
              onChange={(e) => handleInputChange("flexedArm", e.target.value)}
              data-testid="input-flexed-arm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forearm">Antebrazo (cm)</Label>
            <Input
              id="forearm"
              type="number"
              step="0.1"
              placeholder="26.6"
              value={formData.forearm ?? ""}
              onChange={(e) => handleInputChange("forearm", e.target.value)}
              data-testid="input-forearm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thoraxCirc">Tórax Mesoesternal (cm)</Label>
            <Input
              id="thoraxCirc"
              type="number"
              step="0.1"
              placeholder="92.2"
              value={formData.thoraxCirc ?? ""}
              onChange={(e) => handleInputChange("thoraxCirc", e.target.value)}
              data-testid="input-thorax-circ"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waist">Cintura (mínima) (cm)</Label>
            <Input
              id="waist"
              type="number"
              step="0.1"
              placeholder="77.0"
              value={formData.waist ?? ""}
              onChange={(e) => handleInputChange("waist", e.target.value)}
              data-testid="input-waist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hip">Caderas (máxima) (cm)</Label>
            <Input
              id="hip"
              type="number"
              step="0.1"
              placeholder="100.0"
              value={formData.hip ?? ""}
              onChange={(e) => handleInputChange("hip", e.target.value)}
              data-testid="input-hip"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thighSuperior">Muslo (superior) (cm)</Label>
            <Input
              id="thighSuperior"
              type="number"
              step="0.1"
              placeholder="60.0"
              value={formData.thighSuperior ?? ""}
              onChange={(e) => handleInputChange("thighSuperior", e.target.value)}
              data-testid="input-thigh-superior"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thighMedial">Muslo (medial) (cm)</Label>
            <Input
              id="thighMedial"
              type="number"
              step="0.1"
              placeholder="54.5"
              value={formData.thighMedial ?? ""}
              onChange={(e) => handleInputChange("thighMedial", e.target.value)}
              data-testid="input-thigh-medial"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calf">Pantorrilla (máxima) (cm)</Label>
            <Input
              id="calf"
              type="number"
              step="0.1"
              placeholder="37.5"
              value={formData.calf ?? ""}
              onChange={(e) => handleInputChange("calf", e.target.value)}
              data-testid="input-calf"
            />
          </div>
        </CardContent>
      </Card>

      {/* Skinfolds */}
      <Card>
        <CardHeader>
          <CardTitle>Pliegues Cutáneos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="triceps">Tríceps (mm)</Label>
            <Input
              id="triceps"
              type="number"
              step="0.1"
              placeholder="5.0"
              value={formData.triceps ?? ""}
              onChange={(e) => handleInputChange("triceps", e.target.value)}
              data-testid="input-triceps"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscapular">Subescapular (mm)</Label>
            <Input
              id="subscapular"
              type="number"
              step="0.1"
              placeholder="6.0"
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
              placeholder="5.0"
              value={formData.supraspinal ?? ""}
              onChange={(e) => handleInputChange("supraspinal", e.target.value)}
              data-testid="input-supraspinal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abdominal">Abdominal (mm)</Label>
            <Input
              id="abdominal"
              type="number"
              step="0.1"
              placeholder="13.0"
              value={formData.abdominal ?? ""}
              onChange={(e) => handleInputChange("abdominal", e.target.value)}
              data-testid="input-abdominal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thighSkinfold">Muslo (medial) (mm)</Label>
            <Input
              id="thighSkinfold"
              type="number"
              step="0.1"
              placeholder="10.0"
              value={formData.thighSkinfold ?? ""}
              onChange={(e) => handleInputChange("thighSkinfold", e.target.value)}
              data-testid="input-thigh-skinfold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calfSkinfold">Pantorrilla (mm)</Label>
            <Input
              id="calfSkinfold"
              type="number"
              step="0.1"
              placeholder="8.0"
              value={formData.calfSkinfold ?? ""}
              onChange={(e) => handleInputChange("calfSkinfold", e.target.value)}
              data-testid="input-calf-skinfold"
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
            data-testid="input-notes"
          />
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calculator className="h-4 w-4" />
          <span>Los cálculos ISAK 2 se generarán automáticamente al guardar</span>
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
  );
}
