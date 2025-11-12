import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import type { Diet } from "@shared/schema";

interface AssignDietDialogProps {
  patientId: string;
  patientName: string;
}

export function AssignDietDialog({ patientId, patientName }: AssignDietDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedDietId, setSelectedDietId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: diets = [], isLoading: loadingDiets } = useQuery<Diet[]>({
    queryKey: ["/api/diets"],
  });

  const assignDietMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/diet-assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId] });
      setOpen(false);
      resetForm();
      toast({
        title: "Dieta asignada",
        description: `La dieta se asignó exitosamente a ${patientName}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar la dieta",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDietId("");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!selectedDietId) {
      toast({
        title: "Error",
        description: "Por favor selecciona una dieta",
        variant: "destructive",
      });
      return;
    }

    assignDietMutation.mutate({
      patientId,
      dietId: selectedDietId,
      startDate,
      endDate: endDate || null,
      notes: notes || null,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-assign-diet">
          <Plus className="h-4 w-4 mr-2" />
          Asignar Dieta
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-assign-diet">
        <DialogHeader>
          <DialogTitle>Asignar Dieta a {patientName}</DialogTitle>
          <DialogDescription>
            Selecciona una dieta de la biblioteca y configura las fechas de asignación.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="diet">Dieta</Label>
            <Select value={selectedDietId} onValueChange={setSelectedDietId}>
              <SelectTrigger id="diet" data-testid="select-diet">
                <SelectValue placeholder="Selecciona una dieta" />
              </SelectTrigger>
              <SelectContent>
                {loadingDiets ? (
                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                ) : diets.length > 0 ? (
                  diets.map((diet) => (
                    <SelectItem key={diet.id} value={diet.id}>
                      {diet.name} ({diet.calories} kcal)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No hay dietas disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin (Opcional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, preferencias, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            data-testid="button-cancel-assign"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDietId || assignDietMutation.isPending}
            data-testid="button-confirm-assign"
          >
            {assignDietMutation.isPending ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
