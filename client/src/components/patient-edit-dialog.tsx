import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2 } from "lucide-react";
import type { Patient } from "@shared/schema";

interface PatientEditDialogProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientEditDialog({ patient, open, onOpenChange }: PatientEditDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [formData, setFormData] = useState({
    name: patient.name || "",
    email: patient.email || "",
    phone: patient.phone || "",
    birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : "",
    gender: patient.gender || "",
    objective: patient.objective || "",
    notes: patient.notes || "",
    exercisesRegularly: patient.exercisesRegularly || false,
    sportType: patient.sportType || "",
    exerciseDays: patient.exerciseDays || "",
    exerciseSchedule: patient.exerciseSchedule || "",
    isVegetarian: patient.isVegetarian || false,
    isVegan: patient.isVegan || false,
    foodAllergies: patient.foodAllergies || "",
    foodDislikes: patient.foodDislikes || "",
    medicalConditions: patient.medicalConditions || "",
    medications: patient.medications || "",
    avatarUrl: patient.avatarUrl || null,
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        birthDate: data.birthDate || null,
        gender: data.gender || null,
        objective: data.objective || null,
        notes: data.notes || null,
        sportType: data.sportType || null,
        exerciseDays: data.exerciseDays || null,
        exerciseSchedule: data.exerciseSchedule || null,
        foodAllergies: data.foodAllergies || null,
        foodDislikes: data.foodDislikes || null,
        medicalConditions: data.medicalConditions || null,
        medications: data.medications || null,
        version: patient.version,
      };
      return await apiRequest("PATCH", `/api/patients/${patient.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patient.id] });
      onOpenChange(false);
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente se actualizaron exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el paciente",
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', file);
      formDataUpload.append('patientId', patient.id);

      const response = await fetch('/api/uploads/patient-avatar', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, avatarUrl: data.avatarUrl }));

      toast({
        title: "Avatar actualizado",
        description: "La imagen se subió exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = () => {
    setFormData(prev => ({ ...prev, avatarUrl: null }));
    toast({
      title: "Avatar eliminado",
      description: "El avatar se eliminará al guardar los cambios",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }
    updatePatientMutation.mutate(formData);
  };

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-patient">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Modifica los datos del paciente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              {formData.avatarUrl ? (
                <AvatarImage src={formData.avatarUrl} alt={patient.name} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
                data-testid="input-avatar-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                data-testid="button-upload-avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {formData.avatarUrl ? "Cambiar Avatar" : "Subir Avatar"}
              </Button>
              {formData.avatarUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleAvatarDelete}
                  data-testid="button-delete-avatar"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Avatar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre Completo *</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                data-testid="input-edit-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                data-testid="input-edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-birthDate">Fecha de Nacimiento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                data-testid="input-edit-birthdate"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Género</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="edit-gender" data-testid="select-edit-gender">
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="Other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-objective">Objetivo</Label>
              <Select
                value={formData.objective}
                onValueChange={(value) => setFormData({ ...formData, objective: value })}
              >
                <SelectTrigger id="edit-objective" data-testid="select-edit-objective">
                  <SelectValue placeholder="Seleccionar objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pérdida">Pérdida de peso</SelectItem>
                  <SelectItem value="ganancia">Ganancia de masa</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                data-testid="textarea-edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updatePatientMutation.isPending}
              data-testid="button-save-edit"
            >
              {updatePatientMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
