import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft, Save } from "lucide-react";

export default function Measurements() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    patientId: "",
    date: new Date().toISOString().split("T")[0],
    weight: "",
    height: "",
    seatedHeight: "",
    biacromial: "",
    thoraxTransverse: "",
    thoraxAnteroposterior: "",
    biiliocristideo: "",
    humeral: "",
    femoral: "",
    head: "",
    relaxedArm: "",
    flexedArm: "",
    forearm: "",
    thoraxCirc: "",
    waist: "",
    hip: "",
    thighSuperior: "",
    thighMedial: "",
    calf: "",
    triceps: "",
    subscapular: "",
    supraspinal: "",
    abdominal: "",
    thighSkinfold: "",
    calfSkinfold: "",
  });

  const steps = [
    { id: 0, title: "Datos Básicos" },
    { id: 1, title: "Diámetros" },
    { id: 2, title: "Perímetros" },
    { id: 3, title: "Pliegues Cutáneos" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    console.log(`${field} actualizado:`, value);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    console.log("Guardando medición:", formData);
    alert("Medición guardada correctamente (demo)");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Nueva Medición Antropométrica</h1>
        <p className="text-muted-foreground mt-1">
          Método ISAK 2 - Fraccionamiento 5 Componentes (D. Kerr 1988)
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            <span className={`ml-2 text-sm ${index === currentStep ? "font-medium" : ""}`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className="mx-4 h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>Complete los campos de medición</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente</Label>
                <Select
                  value={formData.patientId}
                  onValueChange={(value) => handleInputChange("patientId", value)}
                >
                  <SelectTrigger id="patient" data-testid="select-patient">
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Franco Corts</SelectItem>
                    <SelectItem value="2">María González</SelectItem>
                    <SelectItem value="3">Juan Pérez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha de Medición</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="78.4"
                  value={formData.weight}
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
                  value={formData.height}
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
                  value={formData.seatedHeight}
                  onChange={(e) => handleInputChange("seatedHeight", e.target.value)}
                  data-testid="input-seated-height"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="biacromial">Biacromial (cm)</Label>
                <Input
                  id="biacromial"
                  type="number"
                  step="0.1"
                  placeholder="41.6"
                  value={formData.biacromial}
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
                  value={formData.thoraxTransverse}
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
                  value={formData.thoraxAnteroposterior}
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
                  value={formData.biiliocristideo}
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
                  value={formData.humeral}
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
                  value={formData.femoral}
                  onChange={(e) => handleInputChange("femoral", e.target.value)}
                  data-testid="input-femoral"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="head">Cabeza (cm)</Label>
                <Input
                  id="head"
                  type="number"
                  step="0.1"
                  placeholder="57.5"
                  value={formData.head}
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
                  value={formData.relaxedArm}
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
                  value={formData.flexedArm}
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
                  value={formData.forearm}
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
                  value={formData.thoraxCirc}
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
                  value={formData.waist}
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
                  value={formData.hip}
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
                  value={formData.thighSuperior}
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
                  value={formData.thighMedial}
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
                  value={formData.calf}
                  onChange={(e) => handleInputChange("calf", e.target.value)}
                  data-testid="input-calf"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="triceps">Tríceps (mm)</Label>
                <Input
                  id="triceps"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={formData.triceps}
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
                  value={formData.subscapular}
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
                  value={formData.supraspinal}
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
                  value={formData.abdominal}
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
                  value={formData.thighSkinfold}
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
                  value={formData.calfSkinfold}
                  onChange={(e) => handleInputChange("calfSkinfold", e.target.value)}
                  data-testid="input-calf-skinfold"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          data-testid="button-previous-step"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={handleNext} data-testid="button-next-step">
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} data-testid="button-save-measurement">
            <Save className="h-4 w-4 mr-2" />
            Guardar Medición
          </Button>
        )}
      </div>
    </div>
  );
}
