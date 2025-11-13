import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Meal, WeeklyDietPlan, WeeklyPlanMeal, PatientGroup, Patient, MeasurementCalculation, DietTemplate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Search, GripVertical, X, Clock, Plus, Save, ArrowLeft, Edit, Copy, Users, User, Calendar, FileText, Settings2, ArrowUp, ArrowDown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MEAL_TIMES = [
  { id: "breakfast", label: "Desayuno", defaultTime: "08:00" },
  { id: "snack1", label: "Colación AM", defaultTime: "10:30" },
  { id: "lunch", label: "Almuerzo", defaultTime: "13:00" },
  { id: "snack2", label: "Colación PM", defaultTime: "16:00" },
  { id: "dinner", label: "Cena", defaultTime: "20:00" },
];

const animationDelay = (value: number): CSSProperties => {
  return {
    "--caro-anim-delay": `${value.toFixed(2)}s`,
  } as CSSProperties;
};

interface PlannedMeal {
  meal: Meal;
  time: string;
  id: string;
  note?: string;
  linkedToExercise?: boolean;
}

type WeeklyPlanSlot = typeof MEAL_TIMES[number]["id"];

type WeeklyPlanGrid = {
  [day: string]: {
    [mealTime: string]: PlannedMeal[];
  };
};

type ViewMode = "list" | "create" | "edit";

type SlotEditorState = {
  day: string;
  slot: WeeklyPlanSlot;
  defaultTime: string;
  mode: "add" | "edit";
  mealInstanceId?: string;
};

type SlotEditorFormState = {
  mealId: string;
  quantity: string;
  unit: typeof UNITS[number];
  note: string;
  linkedToExercise: boolean;
};

const UNITS = ["porción", "u", "g", "ml", "taza", "cda"] as const;

type MealGuideline = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
};

interface PatientProfileResponse {
  patient: Patient;
  groups: PatientGroup[];
  latestMeasurement: unknown;
  latestMeasurementCalculations: (MeasurementCalculation & {
    perMealPlan?: Record<string, MealGuideline> | null;
  }) | null;
  measurementCount: number;
  consultations?: {
    consultation: {
      supplements: {
        plan: string;
      };
    };
  }[];
}

export default function WeeklyDietPlanner() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanGrid>(() => createEmptyPlan());
  const [draggedMeal, setDraggedMeal] = useState<Meal | null>(null);
  const [slotEditor, setSlotEditor] = useState<SlotEditorState | null>(null);
  const [planContextPatientId, setPlanContextPatientId] = useState<string>("");
  const [availableTemplates, setAvailableTemplates] = useState<DietTemplate[]>([]);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string>("");
  const [mealGuidelines, setMealGuidelines] = useState<Record<WeeklyPlanSlot, MealGuideline>>({} as Record<WeeklyPlanSlot, MealGuideline>);
  const [nutritionSummary, setNutritionSummary] = useState<{
    maintenanceCalories?: number | null;
    targetCalories?: number | null;
    calorieObjective?: string | null;
    basalMetabolicRate?: string | null;
    activityMultiplier?: string | null;
  } | null>(null);
  const [planSupplements, setPlanSupplements] = useState<string>("");
  const [slotEditorForm, setSlotEditorForm] = useState<SlotEditorFormState>({
    mealId: "",
    quantity: "",
    unit: UNITS[0],
    note: "",
    linkedToExercise: false,
  });
  const [slotEditorSearch, setSlotEditorSearch] = useState("");
  const [slotEditorTime, setSlotEditorTime] = useState("08:00");
  const previousPlanContextIdRef = useRef<string | null>(null);
  const appliedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === appliedTemplateId) ?? null,
    [availableTemplates, appliedTemplateId],
  );
  
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

  const { data: planPatientProfile } = useQuery<PatientProfileResponse>({
    queryKey: ["/api/patients", planContextPatientId, "profile"],
    enabled: Boolean(planContextPatientId),
    queryFn: async () => {
      const response = await fetch(`/api/patients/${planContextPatientId}/profile`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient profile");
      }
      return response.json();
    },
  });

  const { data: templatesData = [] } = useQuery<DietTemplate[]>({
    queryKey: ["/api/diet-templates"],
    queryFn: async () => {
      const response = await fetch(`/api/diet-templates`);
      if (!response.ok) throw new Error("Failed to fetch diet templates");
      return response.json();
    },
  });

  useEffect(() => {
    setAvailableTemplates(templatesData);
  }, [templatesData]);

  useEffect(() => {
    if (!planPatientProfile) return;
    const latestConsultation = planPatientProfile.consultations?.[0]?.consultation;
    if (latestConsultation?.supplements && !planSupplements) {
      const supplementsText = typeof latestConsultation.supplements.plan === "string"
        ? latestConsultation.supplements.plan
        : JSON.stringify(latestConsultation.supplements);
      setPlanSupplements(supplementsText ?? "");
    }
  }, [planPatientProfile, planSupplements]);

  const { data: allMeals = [] } = useQuery<Meal[]>({
    queryKey: ["/api/meals", { scope: "all" }],
    queryFn: async () => {
      const response = await fetch("/api/meals");
      if (!response.ok) throw new Error("Failed to fetch meals");
      return response.json();
    },
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

  useEffect(() => {
    if (viewMode !== "edit" || !editingPlanId) return;
    if (!editingPlanMeals || editingPlanMeals.length === 0) {
      setWeeklyPlan(createEmptyPlan());
      return;
    }

    const basePlan = createEmptyPlan();

    editingPlanMeals.forEach((meal) => {
      const dayIndex = meal.dayOfWeek - 1;
      const dayLabel = DAYS_OF_WEEK[dayIndex];
      const slot = meal.mealSlot as WeeklyPlanSlot;
      const mealInfo = allMeals.find((m) => m.id === meal.mealId) ?? buildCustomMealFromWeeklyMeal(meal);

      if (!dayLabel || !slot) return;

      const plannedMeal: PlannedMeal = {
        id: meal.id,
        meal: mealInfo,
        time: meal.suggestedTime || MEAL_TIMES.find((t) => t.id === slot)?.defaultTime || "08:00",
        note: meal.notes || undefined,
        linkedToExercise: meal.linkedToExercise ?? false,
      };

      basePlan[dayLabel][slot].push(plannedMeal);
    });

    DAYS_OF_WEEK.forEach((day) => {
      MEAL_TIMES.forEach((mealTime) => {
        basePlan[day][mealTime.id].sort((a, b) => {
          const aOrder = editingPlanMeals.find((m) => m.id === a.id)?.slotOrder || 0;
          const bOrder = editingPlanMeals.find((m) => m.id === b.id)?.slotOrder || 0;
          return aOrder - bOrder;
        });
      });
    });

    setWeeklyPlan(basePlan);
  }, [editingPlanMeals, viewMode, editingPlanId, allMeals]);

  useEffect(() => {
    if (!planContextPatientId) {
      setMealGuidelines({} as Record<WeeklyPlanSlot, MealGuideline>);
      setNutritionSummary(null);
      previousPlanContextIdRef.current = null;
      return;
    }

    if (!planPatientProfile) {
      return;
    }

    const calculations = planPatientProfile.latestMeasurementCalculations;

    if (!calculations) {
      setMealGuidelines({} as Record<WeeklyPlanSlot, MealGuideline>);
      setNutritionSummary(null);
      previousPlanContextIdRef.current = planContextPatientId;
      return;
    }

    const isNewSelection = previousPlanContextIdRef.current !== planContextPatientId;
    previousPlanContextIdRef.current = planContextPatientId;

    const parseNumeric = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      const num = typeof value === "number" ? value : parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    const roundedString = (value: string | number | null | undefined): string => {
      const parsed = parseNumeric(value);
      return parsed !== null ? Math.round(parsed).toString() : "";
    };

    const toNumber = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return parseFloat(value.toFixed(1));
      }
      if (typeof value === "string") {
        const num = parseFloat(value);
        if (Number.isFinite(num)) {
          return parseFloat(num.toFixed(1));
        }
      }
      return null;
    };

    const applyIfNeeded = (setter: (value: string | ((prevState: string) => string)) => void, value: string) => {
      setter((prev) => (isNewSelection || !prev ? value : prev));
    };

    if (isNewSelection) {
      const objective = planPatientProfile.patient.objective || "";
      if (objective) {
        setPlanGoal(objective);
      }
      toast({
        title: "Datos precargados",
        description: `Aplicamos las últimas mediciones de ${planPatientProfile.patient.name}.`,
      });
    }

    const targetCalories = parseNumeric(calculations.targetCalories);
    if (targetCalories !== null) {
      applyIfNeeded(setPlanCalories, Math.round(targetCalories).toString());
    }

    const proteinPerDay = roundedString(calculations.proteinPerDay);
    if (proteinPerDay) {
      applyIfNeeded(setPlanProtein, proteinPerDay);
    }

    const carbsPerDay = roundedString(calculations.carbsPerDay);
    if (carbsPerDay) {
      applyIfNeeded(setPlanCarbs, carbsPerDay);
    }

    const fatsPerDay = roundedString(calculations.fatsPerDay);
    if (fatsPerDay) {
      applyIfNeeded(setPlanFats, fatsPerDay);
    }

    let perMealPlanRaw = calculations.perMealPlan as unknown;
    if (typeof perMealPlanRaw === "string") {
      try {
        perMealPlanRaw = JSON.parse(perMealPlanRaw);
      } catch {
        perMealPlanRaw = null;
      }
    }

    const computedGuidelines = MEAL_TIMES.reduce((acc, mealTime) => {
      const entry = (perMealPlanRaw as Record<string, MealGuideline> | null)?.[mealTime.id];
      acc[mealTime.id as WeeklyPlanSlot] = entry
        ? {
            calories: toNumber(entry.calories),
            protein: toNumber(entry.protein),
            carbs: toNumber(entry.carbs),
            fats: toNumber(entry.fats),
          }
        : { calories: null, protein: null, carbs: null, fats: null };
      return acc;
    }, {} as Record<WeeklyPlanSlot, MealGuideline>);

    setMealGuidelines(computedGuidelines);

    setNutritionSummary({
      maintenanceCalories: parseNumeric(calculations.maintenanceCalories),
      targetCalories,
      calorieObjective: calculations.calorieObjective ?? null,
      basalMetabolicRate: calculations.basalMetabolicRate ?? null,
      activityMultiplier: calculations.activityMultiplier ?? null,
    });
  }, [planContextPatientId, planPatientProfile, toast]);

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

  // Generate PDF mutation
  const generatePDFMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", `/api/weekly-plans/${planId}/generate-pdf`, {});
      return await response.json();
    },
    onSuccess: (data: { pdfUrl: string }) => {
      toast({
        title: "PDF generado",
        description: "El plan fue exportado a PDF exitosamente",
      });
      // Open PDF in new tab
      window.open(data.pdfUrl, "_blank");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
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

  function buildCustomMealFromWeeklyMeal(meal: WeeklyPlanMeal): Meal {
    return {
      id: meal.mealId || `custom-${meal.id}`,
      name: meal.customName || "Comida personalizada",
      description: meal.customDescription ?? null,
      category: meal.mealSlot,
      ingredients: [],
      portionSize: null,
      calories: meal.customCalories ? Number(meal.customCalories) : null,
      protein: meal.customProtein != null ? String(meal.customProtein) : null,
      carbs: meal.customCarbs != null ? String(meal.customCarbs) : null,
      fats: meal.customFats != null ? String(meal.customFats) : null,
      fiber: null,
      prepTime: null,
      cookTime: null,
      instructions: null,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      imageUrl: null,
      notes: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Meal;
  }

  function applyTemplateToPlan(template: DietTemplate | null) {
    if (!template) {
      setAppliedTemplateId("");
      toast({
        title: "Plantilla desasignada",
        description: "Podés seguir editando el plan desde cero.",
      });
      return;
    }

    setAppliedTemplateId(template.id);
    setPlanName(template.name || "");
    setPlanDescription(template.description || "");
    setPlanGoal(template.objective || "");
    setPlanNotes(template.content || "");
    setPlanSupplements("");
    if (template.targetCalories) {
      setPlanCalories(String(template.targetCalories));
    }
    toast({
      title: "Plantilla aplicada",
      description: `Usaremos "${template.name}" como base del plan.`,
    });
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
    setPlanContextPatientId("");
    setMealGuidelines({} as Record<WeeklyPlanSlot, MealGuideline>);
    setNutritionSummary(null);
    setPlanSupplements("");
    previousPlanContextIdRef.current = null;
    setAppliedTemplateId("");
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

  function resetSlotEditor() {
    setSlotEditor(null);
    setSlotEditorForm({ mealId: "", quantity: "", unit: UNITS[0], note: "", linkedToExercise: false });
    setSlotEditorSearch("");
    setSlotEditorTime("08:00");
  }

  function parseMealNote(note?: string) {
    if (!note) return { quantity: "", unit: UNITS[0], note: "" };
    try {
      const parsed = JSON.parse(note);
      return {
        quantity: parsed.quantity || "",
        unit: parsed.unit || UNITS[0],
        note: parsed.note || "",
      };
    } catch {
      return { quantity: "", unit: UNITS[0], note: note };
    }
  }

  function formatGuidelineNote(guideline?: MealGuideline) {
    if (!guideline) return "";
    const segments: string[] = [];
    if (guideline.calories !== null) segments.push(`${guideline.calories} kcal`);
    if (guideline.protein !== null) segments.push(`P ${guideline.protein} g`);
    if (guideline.carbs !== null) segments.push(`C ${guideline.carbs} g`);
    if (guideline.fats !== null) segments.push(`G ${guideline.fats} g`);
    return segments.length ? `Objetivo: ${segments.join(" · ")}` : "";
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
        note: JSON.stringify({ quantity: "", unit: UNITS[0], note: "" }),
        linkedToExercise: false,
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
          const mealId = plannedMeal.meal.id;
          const isCustom = mealId.startsWith("custom-");
          const extras = parseMealNote(plannedMeal.note);

          mealsArray.push({
            mealId: isCustom ? null : mealId,
            customName: isCustom ? plannedMeal.meal.name : null,
            customDescription: isCustom ? plannedMeal.meal.description || null : null,
            customCalories: isCustom ? plannedMeal.meal.calories || null : null,
            customProtein: isCustom ? (plannedMeal.meal.protein ?? null) : null,
            customCarbs: isCustom ? (plannedMeal.meal.carbs ?? null) : null,
            customFats: isCustom ? (plannedMeal.meal.fats ?? null) : null,
            dayOfWeek: dayIndex + 1,
            mealSlot: mealTime.id,
            slotOrder: slotOrder + 1,
            suggestedTime: plannedMeal.time,
            linkedToExercise: plannedMeal.linkedToExercise ?? false,
            notes: JSON.stringify(extras),
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
      supplements: planSupplements ? { plan: planSupplements } : null,
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
      if (fullPlan.supplements) {
        setPlanSupplements(
          typeof fullPlan.supplements.plan === "string"
            ? fullPlan.supplements.plan
            : JSON.stringify(fullPlan.supplements),
        );
      } else {
        setPlanSupplements("");
      }
      setPlanVersion(fullPlan.version);
      setAppliedTemplateId("");
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

  function handleOpenAddMeal(day: string, slot: WeeklyPlanSlot, defaultTime: string) {
    const guideline = mealGuidelines[slot];
    const recommendedNote = formatGuidelineNote(guideline);
    setSlotEditor({ day, slot, defaultTime, mode: "add" });
    setSlotEditorForm({ mealId: "", quantity: "", unit: UNITS[0], note: recommendedNote, linkedToExercise: false });
    setSlotEditorSearch("");
    setSlotEditorTime(defaultTime);
  }

  function handleOpenEditMeal(day: string, slot: WeeklyPlanSlot, plannedMeal: PlannedMeal) {
    const extra = parseMealNote(plannedMeal.note);
    const resolvedUnit = UNITS.find((unit) => unit === extra.unit) ?? UNITS[0];
    setSlotEditor({ day, slot, defaultTime: plannedMeal.time, mode: "edit", mealInstanceId: plannedMeal.id });
    setSlotEditorForm({
      mealId: plannedMeal.meal.id,
      quantity: extra.quantity,
      unit: resolvedUnit,
      note: extra.note,
      linkedToExercise: !!plannedMeal.linkedToExercise,
    });
    setSlotEditorSearch(plannedMeal.meal.name);
    setSlotEditorTime(plannedMeal.time);
  }

  function handleSaveSlotEditor() {
    if (!slotEditor) return;
    const meal = allMeals.find((m) => m.id === slotEditorForm.mealId);
    if (!meal) {
      toast({
        title: "Seleccioná un alimento",
        description: "Elige un alimento de la lista para agregarlo al plan",
        variant: "destructive",
      });
      return;
    }

    const notePayload = {
      quantity: slotEditorForm.quantity,
      unit: slotEditorForm.unit,
      note: slotEditorForm.note,
    };

    const plannedMeal: PlannedMeal = {
      id: slotEditor.mode === "edit" && slotEditor.mealInstanceId ? slotEditor.mealInstanceId : `${slotEditor.day}-${slotEditor.slot}-${Date.now()}`,
      meal,
      time: slotEditorTime,
      note: JSON.stringify(notePayload),
      linkedToExercise: slotEditorForm.linkedToExercise,
    };

    setWeeklyPlan((prev) => {
      const slotMeals = [...prev[slotEditor.day][slotEditor.slot]];

      if (slotEditor.mode === "edit" && slotEditor.mealInstanceId) {
        const index = slotMeals.findIndex((m) => m.id === slotEditor.mealInstanceId);
        if (index !== -1) {
          slotMeals[index] = plannedMeal;
        }
      } else {
        slotMeals.push(plannedMeal);
      }

      return {
        ...prev,
        [slotEditor.day]: {
          ...prev[slotEditor.day],
          [slotEditor.slot]: slotMeals,
        },
      };
    });

    resetSlotEditor();
  }

  function handleReorderMeal(day: string, slot: WeeklyPlanSlot, mealInstanceId: string, direction: "up" | "down") {
    setWeeklyPlan((prev) => {
      const slotMeals = [...prev[day][slot]];
      const index = slotMeals.findIndex((m) => m.id === mealInstanceId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= slotMeals.length) return prev;
      const [item] = slotMeals.splice(index, 1);
      slotMeals.splice(newIndex, 0, item);

      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slot]: slotMeals,
        },
      };
    });
  }

  function handleSlotTimeChange(day: string, slot: WeeklyPlanSlot, time: string) {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: prev[day][slot].map((meal) => ({ ...meal, time })),
      },
    }));
  }

  function renderSlot(day: string, slot: WeeklyPlanSlot, defaultTime: string) {
    const slotTime = weeklyPlan[day][slot].length > 0 ? weeklyPlan[day][slot][0].time : defaultTime;
    const guideline = mealGuidelines[slot];
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(day, slot, slotTime)}
        className="border-2 border-dashed border-primary/20 rounded-lg min-h-[120px] bg-primary/5 hover-elevate group"
        data-testid={`dropzone-${day}-${slot}`}
      >
        <div className="p-2 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-primary/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
              <Clock className="w-3.5 h-3.5" />
              <input
                type="time"
                value={slotTime}
                onChange={(e) => handleSlotTimeChange(day, slot, e.target.value)}
                className="text-xs font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
                data-testid={`input-time-${day}-${slot}`}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary hover:bg-primary/10"
              onClick={() => handleOpenAddMeal(day, slot, slotTime)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {guideline && (guideline.calories !== null || guideline.protein !== null || guideline.carbs !== null || guideline.fats !== null) && (
            <div className="rounded-md bg-white/70 text-slate-800 border border-primary/10 px-3 py-2 text-[11px] shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Objetivo</span>
                {nutritionSummary?.calorieObjective && (
                  <span className="text-[10px] font-semibold text-primary-700">{nutritionSummary.calorieObjective}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
                {guideline.calories !== null && <span>{guideline.calories} kcal</span>}
                {guideline.protein !== null && <span>P {guideline.protein} g</span>}
                {guideline.carbs !== null && <span>C {guideline.carbs} g</span>}
                {guideline.fats !== null && <span>G {guideline.fats} g</span>}
              </div>
            </div>
          )}

          {weeklyPlan[day][slot].length === 0 ? (
            <div className="min-h-[70px] flex flex-col items-center justify-center text-[11px] text-primary-500">
              <span>Arrastra alimentos aquí</span>
              <span className="font-semibold">o usa el botón +</span>
            </div>
          ) : (
            <div className="space-y-2">
              {weeklyPlan[day][slot].map((plannedMeal, index) => {
                const extra = parseMealNote(plannedMeal.note);
                return (
                  <div
                    key={plannedMeal.id}
                    className="relative rounded-md bg-white/70 text-slate-800 border border-primary/10 p-2 shadow-sm group/item"
                  >
                    <div className="pr-12 space-y-1">
                      <p className="font-semibold text-sm">{plannedMeal.meal.name}</p>
                      {(extra.quantity || extra.note) && (
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {extra.quantity && (
                            <p>{extra.quantity} {extra.unit}</p>
                          )}
                          {extra.note && <p>{extra.note}</p>}
                        </div>
                      )}
                      {plannedMeal.linkedToExercise && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-cyan-100/60 text-cyan-800 border-cyan-200">
                          Entrenamiento
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:bg-primary/10"
                        onClick={() => handleOpenEditMeal(day, slot, plannedMeal)}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:bg-primary/10"
                        onClick={() => handleReorderMeal(day, slot, plannedMeal.id, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary hover:bg-primary/10"
                        onClick={() => handleReorderMeal(day, slot, plannedMeal.id, "down")}
                        disabled={index === weeklyPlan[day][slot].length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMeal(day, slot, plannedMeal.id)}
                        data-testid={`button-remove-${plannedMeal.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render list view
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between caro-animate" style={animationDelay(0.04)}>
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
          <div className="text-center py-12 caro-animate" style={animationDelay(0.08)}>
            <p className="text-muted-foreground">Cargando planes...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card className="caro-animate-rise" style={animationDelay(0.12)}>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay planes creados aún</p>
              <Button onClick={() => setViewMode("create")} className="mt-4" variant="outline">
                Crear tu primer plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((plan, index) => (
              <Card
                key={plan.id}
                className="hover-elevate caro-animate-rise"
                data-testid={`card-plan-${plan.id}`}
                style={animationDelay(0.12 + index * 0.08)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{plan.name}</span>
                    <Badge variant="secondary" className="caro-soft-tag border border-white/20 uppercase tracking-[0.18em] px-3 py-1 text-[10px]">
                      Template
                    </Badge>
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
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
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
                    <Button 
                      onClick={() => generatePDFMutation.mutate(plan.id)}
                      variant="secondary"
                      className="w-full"
                      disabled={generatePDFMutation.isPending}
                      data-testid={`button-pdf-${plan.id}`}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {generatePDFMutation.isPending ? "Generando..." : "Generar PDF"}
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
      <div className="flex items-center justify-between caro-animate" style={animationDelay(0.04)}>
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
      <Card className="caro-animate-rise" style={animationDelay(0.08)}>
        <CardHeader>
          <CardTitle>Información del Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-patient-source">Precargar con paciente</Label>
                  <Select value={planContextPatientId} onValueChange={setPlanContextPatientId}>
                    <SelectTrigger id="plan-patient-source" data-testid="select-plan-patient-source">
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin selección</SelectItem>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-template-source">Plantilla base</Label>
                  <Select
                    value={appliedTemplateId}
                    onValueChange={(value) => {
                      if (!value) {
                        applyTemplateToPlan(null);
                        return;
                      }
                      const template = availableTemplates.find((t) => t.id === value);
                      if (template) {
                        applyTemplateToPlan(template);
                      }
                    }}
                  >
                    <SelectTrigger id="plan-template-source" data-testid="select-plan-template">
                      <SelectValue placeholder="Sin plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin plantilla</SelectItem>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {appliedTemplate && (
                    <div className="rounded-md border border-white/20 bg-white/15 p-3 text-sm text-white/90 shadow-inner">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold leading-tight">{appliedTemplate.name}</p>
                          {appliedTemplate.description && (
                            <p className="text-white/70 text-xs mt-1 line-clamp-3">{appliedTemplate.description}</p>
                          )}
                          {appliedTemplate.objective && (
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/60">
                              Objetivo: {appliedTemplate.objective}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/70 hover:bg-white/10"
                          onClick={() => applyTemplateToPlan(null)}
                        >
                          Limpiar
                        </Button>
                      </div>
                      <div className="mt-3 max-h-28 overflow-y-auto rounded bg-white/10 p-2 text-[11px] leading-relaxed">
                        {appliedTemplate.content ? appliedTemplate.content.split("\n").slice(0, 12).join("\n") : "Sin contenido"}
                        {appliedTemplate.content && appliedTemplate.content.split("\n").length > 12 && (
                          <p className="mt-2 italic text-white/70">…</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {planContextPatientId ? (
                nutritionSummary ? (
                  <div className="rounded-lg border border-white/20 bg-white/15 p-3 text-white/90 shadow-inner">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      <span>Resumen</span>
                      {nutritionSummary.calorieObjective && <span className="text-[10px] text-white">{nutritionSummary.calorieObjective}</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-[12px] font-medium">
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Calorías meta</span>
                        <span className="text-white text-lg font-semibold">
                          {nutritionSummary.targetCalories ? `${nutritionSummary.targetCalories} kcal` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Calorías mantenimiento</span>
                        <span>{nutritionSummary.maintenanceCalories ? `${nutritionSummary.maintenanceCalories} kcal` : "—"}</span>
                      </div>
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">BMR</span>
                        <span>
                          {(() => {
                            if (!nutritionSummary?.basalMetabolicRate) return "—";
                            const basal = parseFloat(nutritionSummary.basalMetabolicRate);
                            return Number.isFinite(basal) ? `${Math.round(basal)} kcal` : "—";
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Actividad</span>
                        <span>
                          {nutritionSummary.activityMultiplier && Number.isFinite(parseFloat(nutritionSummary.activityMultiplier))
                            ? `x${parseFloat(nutritionSummary.activityMultiplier).toFixed(2)}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/90">
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Proteínas</span>
                        <span>{planProtein ? `${planProtein} g/día` : "—"}</span>
                      </div>
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Carbohidratos</span>
                        <span>{planCarbs ? `${planCarbs} g/día` : "—"}</span>
                      </div>
                      <div>
                        <span className="block text-white/70 text-[10px] uppercase">Grasas</span>
                        <span>{planFats ? `${planFats} g/día` : "—"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-[12px] text-white/80">
                    No encontramos mediciones recientes para este paciente. Registrá una evaluación ISAK 2 para generar objetivos automatizados.
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-[12px] text-white/70">
                  Seleccioná un paciente para precargar calorías y macros automáticamente desde su última medición.
                </div>
              )}
              {planSupplements && (
                <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-[12px] text-white/80">
                  <p className="uppercase tracking-[0.2em] text-[10px] text-white/60">Suplementación sugerida</p>
                  <p className="mt-2 whitespace-pre-wrap font-medium text-white/90">{planSupplements}</p>
                </div>
              )}
            </div>
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
            <div className="col-span-2 space-y-2">
              <Label htmlFor="plan-supplements">Suplementación</Label>
              <Textarea
                id="plan-supplements"
                placeholder="Ej: Creatina 5 g post entrenamiento, Magnesio 400 mg nocturno"
                value={planSupplements}
                onChange={(e) => setPlanSupplements(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <Card className="caro-animate-rise" style={animationDelay(0.13)}>
          <CardHeader>
            <CardTitle>Plan Semanal</CardTitle>
            <CardDescription>
              Ajusta las comidas según horarios, entrenamientos y preferencias alimentarias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[120px_repeat(5,minmax(0,1fr))] gap-1 rounded-lg overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              {MEAL_TIMES.map((mealTime) => (
                <div key={mealTime.id} className="contents">
                  <div className="flex items-center justify-between bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/75">
                    <span>{mealTime.label}</span>
                    <Clock className="h-4 w-4" />
                  </div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={`${day}-${mealTime.id}`} className="border-l border-white/5 bg-white/5/50 p-3">
                      {renderSlot(day, mealTime.id as WeeklyPlanSlot, mealTime.defaultTime)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="sticky top-6 caro-animate-rise" style={animationDelay(0.18)}>
          <CardHeader>
            <CardTitle className="text-lg">Catálogo de Comidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar comidas por nombre o ingredientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-catalog"
                />
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!slotEditor} onOpenChange={(open) => !open && resetSlotEditor()}>
        <DialogContent className="max-w-lg" data-testid="dialog-slot-editor">
          <DialogHeader>
            <DialogTitle>{slotEditor?.mode === "edit" ? "Editar elemento" : "Agregar alimento"}</DialogTitle>
            <DialogDescription>
              Selecciona una comida de tu catálogo, ajusta cantidades y agrega notas personalizadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="meal-search">Buscar alimento</Label>
                <Input
                  id="meal-search"
                  placeholder="Escribe para filtrar..."
                  value={slotEditorSearch}
                  onChange={(e) => setSlotEditorSearch(e.target.value)}
                />
                <ScrollArea className="h-48 border rounded-md">
                  <div className="divide-y">
                    {allMeals
                      .filter((meal) =>
                        meal.name.toLowerCase().includes(slotEditorSearch.toLowerCase()),
                      )
                      .map((meal) => (
                        <button
                          type="button"
                          key={meal.id}
                          onClick={() => setSlotEditorForm((prev) => ({ ...prev, mealId: meal.id }))}
                          className={`w-full px-3 py-2 text-left flex items-start gap-2 transition-colors ${
                            slotEditorForm.mealId === meal.id ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted"
                          }`}
                        >
                          <Checkbox checked={slotEditorForm.mealId === meal.id} className="mt-1 pointer-events-none" />
                          <div>
                            <p className="text-sm font-semibold">{meal.name}</p>
                            {meal.calories && <p className="text-xs text-muted-foreground">{meal.calories} kcal</p>}
                          </div>
                        </button>
                      ))}
                    {allMeals.length === 0 && (
                      <p className="text-sm text-muted-foreground px-3 py-6 text-center">
                        Cargá comidas en el catálogo para poder seleccionarlas aquí.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="slot-time">Horario</Label>
                  <Input
                    id="slot-time"
                    type="time"
                    value={slotEditorTime}
                    onChange={(e) => setSlotEditorTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    placeholder="Ej: 200"
                    value={slotEditorForm.quantity}
                    onChange={(e) => setSlotEditorForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                  <Label className="sr-only" htmlFor="unit">Unidad</Label>
                  <Select
                    value={slotEditorForm.unit}
                    onValueChange={(value) => setSlotEditorForm((prev) => ({ ...prev, unit: value as typeof UNITS[number] }))}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Instrucciones, variantes, etc."
                    value={slotEditorForm.note}
                    onChange={(e) => setSlotEditorForm((prev) => ({ ...prev, note: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="linked-to-exercise"
                    checked={slotEditorForm.linkedToExercise}
                    onCheckedChange={(checked) =>
                      setSlotEditorForm((prev) => ({ ...prev, linkedToExercise: checked === true }))
                    }
                  />
                  <Label htmlFor="linked-to-exercise">Marcar como colación asociada a entrenamiento</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => resetSlotEditor()}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSlotEditor}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
