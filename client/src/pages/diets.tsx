import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DietCard } from "@/components/diet-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Search } from "lucide-react";
import type { Diet } from "@shared/schema";

type DietFormData = {
  name: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  tags: string;
  mealPlan: string;
};

export default function Diets() {
  const { toast } = useToast();
  const confirmDialog = useConfirmDialog();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DietFormData>({
    name: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    tags: "",
    mealPlan: "",
  });

  const { data: diets = [], isLoading } = useQuery<Diet[]>({
    queryKey: ["/api/diets"],
  });

  const createDietMutation = useMutation({
    mutationFn: async (data: DietFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        calories: parseInt(data.calories),
        protein: parseInt(data.protein),
        carbs: parseInt(data.carbs),
        fats: parseInt(data.fats),
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        mealPlan: data.mealPlan || null,
      };
      return await apiRequest("POST", "/api/diets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Dieta creada",
        description: "La dieta se creó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la dieta",
        variant: "destructive",
      });
    },
  });

  const updateDietMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DietFormData }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        calories: parseInt(data.calories),
        protein: parseInt(data.protein),
        carbs: parseInt(data.carbs),
        fats: parseInt(data.fats),
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        mealPlan: data.mealPlan || null,
        version: editingDiet?.version || 1,
      };
      return await apiRequest("PATCH", `/api/diets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets"] });
      setIsEditDialogOpen(false);
      setEditingDiet(null);
      resetForm();
      toast({
        title: "Dieta actualizada",
        description: "La dieta se actualizó exitosamente",
      });
    },
    onError: (error: any) => {
      const isConflict = error?.message?.includes("409");
      toast({
        title: "Error",
        description: isConflict 
          ? "La dieta fue modificada por otro usuario. Recarga la página." 
          : "No se pudo actualizar la dieta",
        variant: "destructive",
      });
    },
  });

  const deleteDietMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/diets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets"] });
      toast({
        title: "Dieta eliminada",
        description: "La dieta se eliminó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la dieta",
        variant: "destructive",
      });
    },
  });

  const duplicateDietMutation = useMutation({
    mutationFn: async (diet: Diet) => {
      const payload = {
        name: `${diet.name} (Copia)`,
        description: diet.description,
        calories: diet.calories,
        protein: diet.protein,
        carbs: diet.carbs,
        fats: diet.fats,
        tags: diet.tags,
        mealPlan: diet.mealPlan,
      };
      return await apiRequest("POST", "/api/diets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets"] });
      toast({
        title: "Dieta duplicada",
        description: "La dieta se duplicó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo duplicar la dieta",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      tags: "",
      mealPlan: "",
    });
  };

  const handleEdit = (diet: Diet) => {
    setEditingDiet(diet);
    setFormData({
      name: diet.name,
      description: diet.description || "",
      calories: diet.calories.toString(),
      protein: diet.protein.toString(),
      carbs: diet.carbs.toString(),
      fats: diet.fats.toString(),
      tags: diet.tags?.join(", ") || "",
      mealPlan: diet.mealPlan || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const diet = diets.find(d => d.id === id);
    const confirmed = await confirmDialog.confirm({
      title: "Eliminar Dieta",
      description: `¿Estás seguro de que deseas eliminar la dieta "${diet?.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });
    
    if (confirmed) {
      deleteDietMutation.mutate(id);
    }
  };

  const handleDuplicate = (diet: Diet) => {
    duplicateDietMutation.mutate(diet);
  };

  const filteredDiets = diets.filter((diet) =>
    diet.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Biblioteca de Dietas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus plantillas de planes nutricionales
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-diet" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Dieta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-diet">
            <DialogHeader>
              <DialogTitle>Crear Nueva Dieta</DialogTitle>
              <DialogDescription>
                Completa los datos del plan nutricional
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nombre de la Dieta *</Label>
                <Input
                  id="name"
                  data-testid="input-diet-name"
                  placeholder="Plan Deportivo Alta Intensidad"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  data-testid="input-diet-description"
                  placeholder="Descripción del plan nutricional..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calorías (kcal) *</Label>
                <Input
                  id="calories"
                  type="number"
                  data-testid="input-diet-calories"
                  placeholder="2800"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Proteínas (g) *</Label>
                <Input
                  id="protein"
                  type="number"
                  data-testid="input-diet-protein"
                  placeholder="175"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbohidratos (g) *</Label>
                <Input
                  id="carbs"
                  type="number"
                  data-testid="input-diet-carbs"
                  placeholder="320"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fats">Grasas (g) *</Label>
                <Input
                  id="fats"
                  type="number"
                  data-testid="input-diet-fats"
                  placeholder="85"
                  value={formData.fats}
                  onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
                <Input
                  id="tags"
                  data-testid="input-diet-tags"
                  placeholder="Deportivo, Alta Intensidad"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="mealPlan">Plan de Comidas (Opcional)</Label>
                <Textarea
                  id="mealPlan"
                  data-testid="input-diet-meal-plan"
                  placeholder="Desayuno: ...\nAlmuerzo: ...\nCena: ..."
                  value={formData.mealPlan}
                  onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create-diet"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createDietMutation.mutate(formData)}
                disabled={
                  !formData.name.trim() ||
                  !formData.calories ||
                  !formData.protein ||
                  !formData.carbs ||
                  !formData.fats ||
                  createDietMutation.isPending
                }
                data-testid="button-submit-create-diet"
              >
                {createDietMutation.isPending ? "Creando..." : "Crear Dieta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar dieta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-diet"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando dietas...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiets.map((diet) => (
              <DietCard
                key={diet.id}
                {...diet}
                onEdit={() => handleEdit(diet)}
                onDelete={() => handleDelete(diet.id)}
                onDuplicate={() => handleDuplicate(diet)}
              />
            ))}
          </div>

          {filteredDiets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No se encontraron dietas con el término de búsqueda
              </p>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-diet">
          <DialogHeader>
            <DialogTitle>Editar Dieta</DialogTitle>
            <DialogDescription>
              Modifica los datos del plan nutricional
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-name">Nombre de la Dieta *</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-diet-name"
                placeholder="Plan Deportivo Alta Intensidad"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-diet-description"
                placeholder="Descripción del plan nutricional..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-calories">Calorías (kcal) *</Label>
              <Input
                id="edit-calories"
                type="number"
                data-testid="input-edit-diet-calories"
                placeholder="2800"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-protein">Proteínas (g) *</Label>
              <Input
                id="edit-protein"
                type="number"
                data-testid="input-edit-diet-protein"
                placeholder="175"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-carbs">Carbohidratos (g) *</Label>
              <Input
                id="edit-carbs"
                type="number"
                data-testid="input-edit-diet-carbs"
                placeholder="320"
                value={formData.carbs}
                onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fats">Grasas (g) *</Label>
              <Input
                id="edit-fats"
                type="number"
                data-testid="input-edit-diet-fats"
                placeholder="85"
                value={formData.fats}
                onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-tags">Etiquetas (separadas por comas)</Label>
              <Input
                id="edit-tags"
                data-testid="input-edit-diet-tags"
                placeholder="Deportivo, Alta Intensidad"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-mealPlan">Plan de Comidas (Opcional)</Label>
              <Textarea
                id="edit-mealPlan"
                data-testid="input-edit-diet-meal-plan"
                placeholder="Desayuno: ...\nAlmuerzo: ...\nCena: ..."
                value={formData.mealPlan}
                onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingDiet(null);
                resetForm();
              }}
              data-testid="button-cancel-edit-diet"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => editingDiet && updateDietMutation.mutate({ id: editingDiet.id, data: formData })}
              disabled={
                !formData.name.trim() ||
                !formData.calories ||
                !formData.protein ||
                !formData.carbs ||
                !formData.fats ||
                updateDietMutation.isPending
              }
              data-testid="button-submit-edit-diet"
            >
              {updateDietMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => !open && confirmDialog.handleCancel()}
        title={confirmDialog.options.title}
        description={confirmDialog.options.description}
        confirmLabel={confirmDialog.options.confirmLabel}
        cancelLabel={confirmDialog.options.cancelLabel}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        variant="destructive"
      />
    </div>
  );
}
