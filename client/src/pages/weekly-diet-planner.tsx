import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Meal } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, GripVertical, X, Clock, Plus, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  id: string; // unique id for each meal instance
}

type WeeklyPlan = {
  [day: string]: {
    [mealTime: string]: PlannedMeal[];
  };
};

export default function WeeklyDietPlanner() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() => {
    const initialPlan: WeeklyPlan = {};
    DAYS_OF_WEEK.forEach(day => {
      initialPlan[day] = {};
      MEAL_TIMES.forEach(mealTime => {
        initialPlan[day][mealTime.id] = [];
      });
    });
    return initialPlan;
  });
  const [draggedMeal, setDraggedMeal] = useState<Meal | null>(null);

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

  const handleDragStart = (meal: Meal) => {
    setDraggedMeal(meal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (day: string, mealTimeId: string, defaultTime: string) => {
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
  };

  const handleRemoveMeal = (day: string, mealTimeId: string, mealInstanceId: string) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealTimeId]: prev[day][mealTimeId].filter(m => m.id !== mealInstanceId),
      },
    }));
  };

  const handleTimeChange = (day: string, mealTimeId: string, mealInstanceId: string, time: string) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealTimeId]: prev[day][mealTimeId].map(m =>
          m.id === mealInstanceId ? { ...m, time } : m
        ),
      },
    }));
  };

  const handleSavePlan = () => {
    // TODO: Implement save to backend
    console.log("Saving weekly plan:", weeklyPlan);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Creador de Planes Semanales</h1>
          <p className="text-muted-foreground mt-1">
            Arrastra comidas del catálogo hacia la grilla semanal
          </p>
        </div>
        <Button onClick={handleSavePlan} data-testid="button-save-plan">
          <Save className="w-4 h-4 mr-2" />
          Guardar Plan
        </Button>
      </div>

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

              <ScrollArea className="h-[calc(100vh-400px)]">
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
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-muted/50 font-medium text-sm w-32">Horario</th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th key={day} className="border p-2 bg-muted/50 font-medium text-sm">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEAL_TIMES.map((mealTime) => (
                      <tr key={mealTime.id}>
                        <td className="border p-2 bg-muted/30 font-medium text-sm align-top">
                          {mealTime.label}
                        </td>
                        {DAYS_OF_WEEK.map((day) => {
                          const plannedMeals = weeklyPlan[day]?.[mealTime.id] || [];
                          return (
                            <td
                              key={`${day}-${mealTime.id}`}
                              className="border p-2 align-top min-w-[200px]"
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(day, mealTime.id, mealTime.defaultTime)}
                              data-testid={`cell-${day}-${mealTime.id}`}
                            >
                              <div className="space-y-2 min-h-[100px]">
                                {plannedMeals.length === 0 ? (
                                  <div className="flex items-center justify-center h-20 text-muted-foreground text-xs border-2 border-dashed rounded">
                                    Arrastra aquí
                                  </div>
                                ) : (
                                  plannedMeals.map((plannedMeal) => (
                                    <div key={plannedMeal.id} className="p-2 border rounded-md bg-card space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm">{plannedMeal.meal.name}</p>
                                          {plannedMeal.meal.portionSize && (
                                            <p className="text-xs text-muted-foreground">
                                              {plannedMeal.meal.portionSize}
                                            </p>
                                          )}
                                        </div>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => handleRemoveMeal(day, mealTime.id, plannedMeal.id)}
                                          data-testid={`button-remove-${plannedMeal.id}`}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <Input
                                          type="time"
                                          value={plannedMeal.time}
                                          onChange={(e) => handleTimeChange(day, mealTime.id, plannedMeal.id, e.target.value)}
                                          className="h-7 text-xs"
                                          data-testid={`input-time-${plannedMeal.id}`}
                                        />
                                      </div>
                                      {plannedMeal.meal.calories && (
                                        <Badge variant="secondary" className="text-xs">
                                          {plannedMeal.meal.calories} kcal
                                        </Badge>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
