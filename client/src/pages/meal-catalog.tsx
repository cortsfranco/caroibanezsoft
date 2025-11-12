import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Meal, MealTag } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Edit, Trash2, Upload, Sparkles, Image as ImageIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form schema - form fields are all strings, transformed when submitting
const mealFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category: z.string().optional(),
  ingredients: z.string().optional(),
  portionSize: z.string().optional(),
  calories: z.string().optional(),
  protein: z.string().optional(),
  carbs: z.string().optional(),
  fats: z.string().optional(),
  fiber: z.string().optional(),
  prepTime: z.string().optional(),
  cookTime: z.string().optional(),
  instructions: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  notes: z.string().optional(),
});

type MealFormValues = z.infer<typeof mealFormSchema>;

export default function MealCatalogPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Fetch meals with filters
  const { data: meals = [], isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ["/api/meals", { category: selectedCategory, search: searchQuery, tagIds: selectedTags }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      selectedTags.forEach(tagId => params.append("tagIds", tagId));
      
      const response = await fetch(`/api/meals?${params}`);
      if (!response.ok) throw new Error("Failed to fetch meals");
      return response.json();
    },
  });

  // Get unique categories from existing meals for suggestions
  const existingCategories = Array.from(
    new Set(
      meals
        .map(meal => meal.category)
        .filter((cat): cat is string => cat !== null && cat !== undefined && cat !== "")
    )
  ).sort();

  // Fetch meal tags
  const { data: allTags = [] } = useQuery<MealTag[]>({
    queryKey: ["/api/meal-tags"],
  });

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: async (data: MealFormValues) => {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Comida creada",
        description: "La comida se ha agregado al catálogo exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la comida",
        variant: "destructive",
      });
    },
  });

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data, version }: { id: string; data: Partial<MealFormValues>; version: number }) => {
      const response = await fetch(`/api/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, version }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      setEditingMeal(null);
      toast({
        title: "Comida actualizada",
        description: "Los cambios se han guardado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la comida",
        variant: "destructive",
      });
    },
  });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/meals/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({
        title: "Comida eliminada",
        description: "La comida se ha eliminado del catálogo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la comida",
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/meals/${id}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({
        title: "Imagen subida",
        description: "La imagen se ha agregado exitosamente a la comida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive",
      });
    },
  });

  // Generate AI image mutation
  const generateImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/meals/${id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({
        title: "Imagen generada",
        description: "La imagen se ha generado exitosamente con IA.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar la imagen",
        variant: "destructive",
      });
    },
  });

  // Check AI image generation status
  const { data: aiStatus } = useQuery<{ available: boolean; provider: string | null }>({
    queryKey: ["/api/image-generation/status"],
    staleTime: Infinity,
  });

  // Form for create/edit
  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      ingredients: "",
      portionSize: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      fiber: "",
      prepTime: "",
      cookTime: "",
      instructions: "",
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      notes: "",
    },
  });

  const onSubmit = (data: MealFormValues) => {
    // Transform form values to API format
    // calories/prepTime/cookTime: string → integer
    // protein/carbs/fats/fiber: string → string (decimals)
    const apiData: any = {
      name: data.name,
      category: data.category,
      description: data.description || undefined,
      ingredients: data.ingredients || undefined,
      portionSize: data.portionSize || undefined,
      calories: data.calories && data.calories !== "" ? parseInt(data.calories) : undefined,
      protein: data.protein || undefined,
      carbs: data.carbs || undefined,
      fats: data.fats || undefined,
      fiber: data.fiber || undefined,
      prepTime: data.prepTime && data.prepTime !== "" ? parseInt(data.prepTime) : undefined,
      cookTime: data.cookTime && data.cookTime !== "" ? parseInt(data.cookTime) : undefined,
      instructions: data.instructions || undefined,
      isVegetarian: data.isVegetarian,
      isVegan: data.isVegan,
      isGlutenFree: data.isGlutenFree,
      isDairyFree: data.isDairyFree,
      notes: data.notes || undefined,
    };

    if (editingMeal) {
      updateMealMutation.mutate({
        id: editingMeal.id,
        data: apiData,
        version: editingMeal.version,
      });
    } else {
      createMealMutation.mutate(apiData);
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    form.reset({
      name: meal.name,
      description: String(meal.description ?? ""),
      category: meal.category,
      ingredients: String(meal.ingredients ?? ""),
      portionSize: String(meal.portionSize ?? ""),
      calories: String(meal.calories ?? ""),
      protein: String(meal.protein ?? ""),
      carbs: String(meal.carbs ?? ""),
      fats: String(meal.fats ?? ""),
      fiber: String(meal.fiber ?? ""),
      prepTime: String(meal.prepTime ?? ""),
      cookTime: String(meal.cookTime ?? ""),
      instructions: String(meal.instructions ?? ""),
      isVegetarian: meal.isVegetarian ?? false,
      isVegan: meal.isVegan ?? false,
      isGlutenFree: meal.isGlutenFree ?? false,
      isDairyFree: meal.isDairyFree ?? false,
      notes: String(meal.notes ?? ""),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta comida?")) {
      deleteMealMutation.mutate(id);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // Loading state
  if (mealsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Catálogo de Comidas</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Comidas</h1>
          <p className="text-muted-foreground">
            Gestiona tu biblioteca de comidas reutilizables
          </p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingMeal} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingMeal(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-meal"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Comida
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMeal ? "Editar Comida" : "Nueva Comida"}
              </DialogTitle>
              <DialogDescription>
                {editingMeal
                  ? "Modifica los detalles de la comida"
                  : "Agrega una nueva comida al catálogo"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-meal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría (opcional)</FormLabel>
                      <FormControl>
                        <div>
                          <Input 
                            {...field} 
                            list="categories-suggestions"
                            placeholder="ej: Desayuno, Almuerzo, Cena, Colación..."
                            data-testid="input-meal-category"
                          />
                          <datalist id="categories-suggestions">
                            {existingCategories.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escribe una categoría nueva o selecciona una existente
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field}) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-meal-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="calories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calorías</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ej: 250" data-testid="input-meal-calories" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="portionSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porción</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ej: 200g" data-testid="input-meal-portion" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proteína (g)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ej: 20" data-testid="input-meal-protein" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbos (g)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ej: 30" data-testid="input-meal-carbs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grasas (g)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ej: 10" data-testid="input-meal-fats" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 flex-wrap">
                  <FormField
                    control={form.control}
                    name="isVegetarian"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-vegetarian"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Vegetariano</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isVegan"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-vegan"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Vegano</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isGlutenFree"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-gluten-free"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Sin Gluten</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isDairyFree"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-dairy-free"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Sin Lácteos</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingMeal(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMealMutation.isPending || updateMealMutation.isPending}
                    data-testid="button-save-meal"
                  >
                    {editingMeal ? "Guardar Cambios" : "Crear Comida"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-meals"
                />
              </div>
            </div>

            <div className="min-w-[200px]">
              <Label htmlFor="category-filter">Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-filter" data-testid="select-filter-category">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory || searchQuery || selectedTags.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                  setSelectedTags([]);
                }}
                data-testid="button-clear-filters"
              >
                Limpiar Filtros
              </Button>
            ) : null}
          </div>

          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex gap-2 flex-wrap">
                {allTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleTagToggle(tag.id)}
                    data-testid={`badge-tag-${tag.id}`}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meals Grid */}
      {mealsLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando comidas...</p>
        </div>
      ) : meals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory || selectedTags.length > 0
                ? "No se encontraron comidas con los filtros seleccionados"
                : "No hay comidas en el catálogo. ¡Crea la primera!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meals.map((meal) => (
            <Card key={meal.id} className="hover-elevate" data-testid={`card-meal-${meal.id}`}>
              {meal.imageUrl && (
                <div className="relative w-full h-48 overflow-hidden rounded-t-md">
                  <img 
                    src={meal.imageUrl} 
                    alt={meal.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-meal-${meal.id}`}
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{meal.name}</CardTitle>
                    {meal.category && (
                      <Badge variant="outline" className="mt-1">
                        {meal.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(meal)}
                      data-testid={`button-edit-meal-${meal.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(meal.id)}
                      data-testid={`button-delete-meal-${meal.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {meal.description && (
                  <CardDescription>{meal.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {meal.calories && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calorías:</span>
                    <span className="font-medium">{meal.calories}</span>
                  </div>
                )}
                {(meal.protein || meal.carbs || meal.fats) && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {meal.protein && (
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">Proteína</div>
                        <div className="font-medium">{meal.protein}g</div>
                      </div>
                    )}
                    {meal.carbs && (
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">Carbos</div>
                        <div className="font-medium">{meal.carbs}g</div>
                      </div>
                    )}
                    {meal.fats && (
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">Grasas</div>
                        <div className="font-medium">{meal.fats}g</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-1 flex-wrap">
                  {meal.isVegetarian && <Badge variant="secondary">Vegetariano</Badge>}
                  {meal.isVegan && <Badge variant="secondary">Vegano</Badge>}
                  {meal.isGlutenFree && <Badge variant="secondary">Sin Gluten</Badge>}
                  {meal.isDairyFree && <Badge variant="secondary">Sin Lácteos</Badge>}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 border-t pt-4">
                <label htmlFor={`upload-${meal.id}`} className="flex-1">
                  <input
                    id={`upload-${meal.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImageMutation.mutate({ id: meal.id, file });
                      }
                    }}
                    data-testid={`input-upload-image-${meal.id}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={uploadImageMutation.isPending}
                    asChild
                  >
                    <span>
                      <Upload className="w-3 h-3 mr-1" />
                      {uploadImageMutation.isPending ? "Subiendo..." : "Subir"}
                    </span>
                  </Button>
                </label>
                {aiStatus?.available && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => generateImageMutation.mutate(meal.id)}
                    disabled={generateImageMutation.isPending}
                    data-testid={`button-generate-image-${meal.id}`}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {generateImageMutation.isPending ? "Generando..." : "Generar IA"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
