import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Meal, WeeklyDietPlan, WeeklyPlanMeal, PatientGroup, Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Search, GripVertical, X, Clock, Plus, Save, ArrowLeft, Edit, Copy, Users, User, Calendar } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MEAL_TIMES = [
  { id: "breakfast", label: "Desayuno", defaultTime: "08:00" },
  { id: "snack1", label: "Colación AM", defaultTime: "10:30" },
  { id: "lunch", label: "Almuerzo", defaultTime: "13:00" },
  { id: "snack2", label: "Colación PM", defaultTime: "16:00" },
  { id: "dinner", label: "Cena", defaultTime: "20:00" },
];

interface PlannedMeal {
  meal: Meal;
  time: string;
  id: string;
}

type WeeklyPlanGrid = {
  [day: string]: {
    [mealTime: string]: PlannedMeal[];
  };
};

type ViewMode = "list" | "create" | "edit";

export default function WeeklyDietPlanner() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanGrid>(() => createEmptyPlan());
  const [draggedMeal, setDraggedMeal] = useState<Meal | null>(null);
  
  // Plan metadata form
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planGoal, setPlanGoal] = useState("");
  const [planCalories, setPlanCalories] = useState("");
  const [planProtein, setPlanProtein] = useState("");
  const [planCarbs, setPlanCarbs] = useState("");
  const [planFats, setPlanFats] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [planVersion, setPlanVersion] = useState<number>(1);

  // Assignment dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningPlanId, setAssigningPlanId] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<"group" | "patient">("group");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  // Fetch templates (isTemplate=true)
  const { data: templates = [], isLoading: templatesLoading } = useQuery<WeeklyDietPlan[]>({
    queryKey: ["/api/weekly-plans", { isTemplate: true }],
    queryFn: async () => {
      const response = await fetch("/api/weekly-plans?isTemplate=true");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  // Fetch groups for assignment
  const { data: groups = [] } = useQuery<PatientGroup[]>({
    queryKey: ["/api/groups"],
  });

  // Fetch patients for assignment
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch meals catalog
  const { data: meals = [], isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ["/api/meals", { category: selectedCategory, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      
      const response = await fetch(`/api/meals?${params}`);
      if (!response.ok) throw new Error("Failed to fetch meals");
      return response.json();
    },
  });

  // Fetch meals for editing plan
  const { data: editingPlanMeals = [] } = useQuery<WeeklyPlanMeal[]>({
    queryKey: ["/api/weekly-plans", editingPlanId, "meals"],
    queryFn: async () => {
      if (!editingPlanId) return [];
      const response = await fetch(`/api/weekly-plans/${editingPlanId}/meals`);
      if (!response.ok) throw new Error("Failed to fetch plan meals");
      return response.json();
    },
    enabled: !!editingPlanId && viewMode === "edit",
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: { plan: any; meals: any[] }) => {
      const planResponse = await apiRequest("POST", "/api/weekly-plans", data.plan);
      const plan = await planResponse.json();
      const planId = plan.id;
      
      // Create meals
      for (const meal of data.meals) {
        await apiRequest("POST", "/api/weekly-plan-meals", { ...meal, planId });
      }
      
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
      toast({
        title: "Plan creado",
        description: "El plan semanal se creó exitosamente",
      });
      setViewMode("list");
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el plan",
        variant: "destructive",
      });
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (data: { planId: string; plan: any; meals: any[]; version: number }) => {
      await apiRequest("PATCH", `/api/weekly-plans/${data.planId}`, { ...data.plan, version: data.version });
      
      // Delete existing meals and recreate
      const existingMeals = await fetch(`/api/weekly-plans/${data.planId}/meals`).then(r => r.json());
      for (const meal of existingMeals) {
        await apiRequest("DELETE", `/api/weekly-plan-meals/${meal.id}`);
      }
      
      // Create new meals
      for (const meal of data.meals) {
        await apiRequest("POST", "/api/weekly-plan-meals", { ...meal, planId: data.planId });
      }
      
      return data.planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans"] });
      toast({
        title: "Plan actualizado",
        description: "El plan semanal se actualizó exitosamente",
      });
      setViewMode("list");
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan",
        variant: "destructive",
      });
    },
  });

  // Assign to group mutation
  const assignToGroupMutation = useMutation({
    mutationFn: async (data: { planId: string; groupId: string; startDate: string; endDate: string; notes: string }) => {
      return await apiRequest("POST", `/api/weekly-plans/${data.planId}/assign-to-group`, {
        groupId: data.groupId,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        assignmentNotes: data.notes || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan asignado",
        description: "El plan se asignó al grupo exitosamente",
      });
      setIsAssignDialogOpen(false);
      resetAssignmentForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el plan al grupo",
        variant: "destructive",
      });
    },
  });

  // Assign to patient mutation
  const assignToPatientMutation = useMutation({
    mutationFn: async (data: { planId: string; patientId: string; startDate: string; endDate: string; notes: string }) => {
      return await apiRequest("POST", `/api/weekly-plans/${data.planId}/assign-to-patient`, {
        patientId: data.patientId,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        assignmentNotes: data.notes || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan asignado",
        description: "El plan se asignó al paciente exitosamente",
      });
      setIsAssignDialogOpen(false);
      resetAssignmentForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el plan al paciente",
        variant: "destructive",
      });
    },
  });

  function createEmptyPlan(): WeeklyPlanGrid {
    const plan: WeeklyPlanGrid = {};
    DAYS_OF_WEEK.forEach(day => {
      plan[day] = {};
      MEAL_TIMES.forEach(mealTime => {
        plan[day][mealTime.id] = [];
      });
    });
    return plan;
  }

  function resetForm() {
    setPlanName("");
    setPlanDescription("");
    setPlanGoal("");
    setPlanCalories("");
    setPlanProtein("");
    setPlanCarbs("");
    setPlanFats("");
    setPlanNotes("");
    setPlanVersion(1);
    setWeeklyPlan(createEmptyPlan());
    setEditingPlanId(null);
  }

  function resetAssignmentForm() {
    setAssigningPlanId(null);
    setAssignmentType("group");
    setSelectedGroupId("");
    setSelectedPatientId("");
    setAssignmentStartDate("");
    setAssignmentEndDate("");
    setAssignmentNotes("");
  }

  function handleDragStart(meal: Meal) {
    setDraggedMeal(meal);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(day: string, mealTimeId: string, defaultTime: string) {
    if (draggedMeal) {
      const newMeal: PlannedMeal = {
        id: `${day}-${mealTimeId}-${Date.now()}`,
        meal: draggedMeal,
        time: defaultTime,
      };
      
      setWeeklyPlan(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [mealTimeId]: [...prev[day][mealTimeId], newMeal],
        },
      }));
      setDraggedMeal(null);
    }
  }

  function handleRemoveMeal(day: string, mealTimeId: string, mealInstanceId: string) {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealTimeId]: prev[day][mealTimeId].filter(m => m.id !== mealInstanceId),
      },
    }));
  }

  function handleTimeChange(day: string, mealTimeId: string, mealInstanceId: string, time: string) {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealTimeId]: prev[day][mealTimeId].map(m =>
          m.id === mealInstanceId ? { ...m, time } : m
        ),
      },
    }));
  }

  function handleSavePlan() {
    if (!planName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para el plan",
        variant: "destructive",
      });
      return;
    }

    // Convert grid to meals array
    const mealsArray: any[] = [];
    DAYS_OF_WEEK.forEach((day, dayIndex) => {
      MEAL_TIMES.forEach((mealTime) => {
        const mealsInSlot = weeklyPlan[day][mealTime.id];
        mealsInSlot.forEach((plannedMeal, slotOrder) => {
          mealsArray.push({
            mealId: plannedMeal.meal.id,
            dayOfWeek: dayIndex + 1,
            mealSlot: mealTime.id,
            slotOrder: slotOrder + 1,
            suggestedTime: plannedMeal.time,
          });
        });
      });
    });

    const planData = {
      name: planName,
      description: planDescription || null,
      isTemplate: true,
      goal: planGoal || null,
      dailyCalories: planCalories ? parseInt(planCalories) : null,
      proteinGrams: planProtein || null,
      carbsGrams: planCarbs || null,
      fatsGrams: planFats || null,
      notes: planNotes || null,
    };

    if (viewMode === "edit" && editingPlanId) {
      updatePlanMutation.mutate({ planId: editingPlanId, plan: planData, meals: mealsArray, version: planVersion });
    } else {
      createPlanMutation.mutate({ plan: planData, meals: mealsArray });
    }
  }

  async function handleEditPlan(plan: WeeklyDietPlan) {
    try {
      // Fetch the full plan details to ensure we have the current version
      const response = await fetch(`/api/weekly-plans/${plan.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plan details");
      }
      const fullPlan: WeeklyDietPlan = await response.json();
      
      setEditingPlanId(fullPlan.id);
      setPlanName(fullPlan.name);
      setPlanDescription(fullPlan.description || "");
      setPlanGoal(fullPlan.goal || "");
      setPlanCalories(fullPlan.dailyCalories?.toString() || "");
      setPlanProtein(fullPlan.proteinGrams?.toString() || "");
      setPlanCarbs(fullPlan.carbsGrams?.toString() || "");
      setPlanFats(fullPlan.fatsGrams?.toString() || "");
      setPlanNotes(fullPlan.notes || "");
      setPlanVersion(fullPlan.version);
      setViewMode("edit");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el plan para editar",
        variant: "destructive",
      });
    }
  }

  function handleOpenAssignment(planId: string) {
    setAssigningPlanId(planId);
    setIsAssignDialogOpen(true);
  }

  function handleAssign() {
    if (!assigningPlanId) return;

    if (assignmentType === "group") {
      if (!selectedGroupId) {
        toast({
          title: "Grupo requerido",
          description: "Por favor selecciona un grupo",
          variant: "destructive",
        });
        return;
      }
      assignToGroupMutation.mutate({
        planId: assigningPlanId,
        groupId: selectedGroupId,
        startDate: assignmentStartDate,
        endDate: assignmentEndDate,
        notes: assignmentNotes,
      });
    } else {
      if (!selectedPatientId) {
        toast({
          title: "Paciente requerido",
          description: "Por favor selecciona un paciente",
          variant: "destructive",
        });
        return;
      }
      assignToPatientMutation.mutate({
        planId: assigningPlanId,
        patientId: selectedPatientId,
        startDate: assignmentStartDate,
        endDate: assignmentEndDate,
        notes: assignmentNotes,
      });
    }
  }

  // Render list view
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-page-title">Planes Semanales</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona templates de planes semanales y asígnalos a pacientes o grupos
            </p>
          </div>
          <Button onClick={() => setViewMode("create")} data-testid="button-create-plan">
            <Plus className="w-4 h-4 mr-2" />
            Crear Nuevo Plan
          </Button>
        </div>

        {templatesLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando planes...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay planes creados aún</p>
              <Button onClick={() => setViewMode("create")} className="mt-4" variant="outline">
                Crear tu primer plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((plan) => (
              <Card key={plan.id} className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{plan.name}</span>
                    <Badge variant="secondary" className="shrink-0">Template</Badge>
                  </CardTitle>
                  {plan.description && (
                    <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {plan.goal && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Objetivo:</span>
                        <span>{plan.goal}</span>
                      </div>
                    )}
                    {plan.dailyCalories && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Calorías:</span>
                        <span>{plan.dailyCalories} kcal/día</span>
                      </div>
                    )}
                    {(plan.proteinGrams || plan.carbsGrams || plan.fatsGrams) && (
                      <div className="flex gap-3 text-xs">
                        {plan.proteinGrams && <span>P: {plan.proteinGrams}g</span>}
                        {plan.carbsGrams && <span>C: {plan.carbsGrams}g</span>}
                        {plan.fatsGrams && <span>G: {plan.fatsGrams}g</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleEditPlan(plan)} 
                      variant="outline" 
                      className="flex-1"
                      data-testid={`button-edit-${plan.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      onClick={() => handleOpenAssignment(plan.id)}
                      variant="default"
                      className="flex-1"
                      data-testid={`button-assign-${plan.id}`}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Asignar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-assign-plan">
            <DialogHeader>
              <DialogTitle>Asignar Plan</DialogTitle>
              <DialogDescription>
                Asigna este plan a un grupo de pacientes o a un paciente individual
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Asignación</Label>
                <Select value={assignmentType} onValueChange={(v: "group" | "patient") => setAssignmentType(v)}>
                  <SelectTrigger data-testid="select-assignment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo de Pacientes</SelectItem>
                    <SelectItem value="patient">Paciente Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignmentType === "group" ? (
                <div className="space-y-2">
                  <Label htmlFor="group-select">Grupo *</Label>
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger id="group-select" data-testid="select-group">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="patient-select">Paciente *</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger id="patient-select" data-testid="select-patient">
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Fecha Inicio</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={assignmentStartDate}
                    onChange={(e) => setAssignmentStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Fecha Fin</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={assignmentEndDate}
                    onChange={(e) => setAssignmentEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment-notes">Notas de Asignación</Label>
                <Textarea
                  id="assignment-notes"
                  placeholder="Observaciones sobre esta asignación..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  data-testid="input-assignment-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAssign} data-testid="button-confirm-assign">
                Asignar Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render create/edit view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setViewMode("list");
              resetForm();
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {viewMode === "edit" ? "Editar Plan" : "Crear Nuevo Plan"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Arrastra comidas del catálogo hacia la grilla semanal
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSavePlan} 
          disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
          data-testid="button-save-plan"
        >
          <Save className="w-4 h-4 mr-2" />
          {viewMode === "edit" ? "Guardar Cambios" : "Guardar Plan"}
        </Button>
      </div>

      {/* Plan Metadata Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="plan-name">Nombre del Plan *</Label>
              <Input
                id="plan-name"
                placeholder="Ej: Plan Gimnasio Septiembre 2024"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                data-testid="input-plan-name"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="plan-description">Descripción</Label>
              <Textarea
                id="plan-description"
                placeholder="Descripción del plan..."
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                data-testid="input-plan-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-goal">Objetivo</Label>
              <Input
                id="plan-goal"
                placeholder="Ej: Aumento masa muscular"
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                data-testid="input-plan-goal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-calories">Calorías Diarias</Label>
              <Input
                id="plan-calories"
                type="number"
                placeholder="2000"
                value={planCalories}
                onChange={(e) => setPlanCalories(e.target.value)}
                data-testid="input-plan-calories"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-protein">Proteína (g)</Label>
              <Input
                id="plan-protein"
                type="number"
                placeholder="120"
                value={planProtein}
                onChange={(e) => setPlanProtein(e.target.value)}
                data-testid="input-plan-protein"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-carbs">Carbohidratos (g)</Label>
              <Input
                id="plan-carbs"
                type="number"
                placeholder="200"
                value={planCarbs}
                onChange={(e) => setPlanCarbs(e.target.value)}
                data-testid="input-plan-carbs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-fats">Grasas (g)</Label>
              <Input
                id="plan-fats"
                type="number"
                placeholder="60"
                value={planFats}
                onChange={(e) => setPlanFats(e.target.value)}
                data-testid="input-plan-fats"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="plan-notes">Notas</Label>
              <Textarea
                id="plan-notes"
                placeholder="Notas adicionales sobre el plan..."
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                data-testid="input-plan-notes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Catalog Sidebar */}
        <div className="col-span-3">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Catálogo de Comidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-meals">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-meals"
                    placeholder="Buscar comida..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-catalog"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-filter">Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" data-testid="select-category-filter">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="breakfast">Desayuno</SelectItem>
                    <SelectItem value="lunch">Almuerzo</SelectItem>
                    <SelectItem value="dinner">Cena</SelectItem>
                    <SelectItem value="snack">Colación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[calc(100vh-500px)]">
                <div className="space-y-2">
                  {mealsLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                  ) : meals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No se encontraron comidas
                    </p>
                  ) : (
                    meals.map((meal) => (
                      <div
                        key={meal.id}
                        draggable
                        onDragStart={() => handleDragStart(meal)}
                        className="p-3 border rounded-md cursor-move hover-elevate active-elevate-2 bg-card"
                        data-testid={`draggable-meal-${meal.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{meal.name}</p>
                            {meal.calories && (
                              <p className="text-xs text-muted-foreground">{meal.calories} kcal</p>
                            )}
                            {(meal.protein || meal.carbs || meal.fats) && (
                              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                {meal.protein && <span>P: {meal.protein}g</span>}
                                {meal.carbs && <span>C: {meal.carbs}g</span>}
                                {meal.fats && <span>G: {meal.fats}g</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Grid */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <CardTitle>Plan Semanal</CardTitle>
              <CardDescription>
                Arrastra las comidas del catálogo a los casilleros correspondientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header row */}
                  <div className="grid grid-cols-8 gap-2 mb-2">
                    <div className="font-semibold text-sm"></div>
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="font-semibold text-sm text-center">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Meal rows */}
                  {MEAL_TIMES.map((mealTime) => (
                    <div key={mealTime.id} className="grid grid-cols-8 gap-2 mb-2">
                      <div className="font-medium text-sm py-2 flex items-center">
                        {mealTime.label}
                      </div>
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={`${day}-${mealTime.id}`}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(day, mealTime.id, mealTime.defaultTime)}
                          className="border-2 border-dashed rounded-md p-2 min-h-[100px] space-y-1 hover-elevate"
                          data-testid={`dropzone-${day}-${mealTime.id}`}
                        >
                          {weeklyPlan[day][mealTime.id].map((plannedMeal) => (
                            <div
                              key={plannedMeal.id}
                              className="bg-primary/10 border border-primary/20 rounded p-2 text-xs relative group"
                            >
                              <button
                                onClick={() => handleRemoveMeal(day, mealTime.id, plannedMeal.id)}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-remove-${plannedMeal.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <p className="font-medium truncate pr-4">{plannedMeal.meal.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <input
                                  type="time"
                                  value={plannedMeal.time}
                                  onChange={(e) => handleTimeChange(day, mealTime.id, plannedMeal.id, e.target.value)}
                                  className="text-xs bg-transparent border-none w-16 focus:outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
