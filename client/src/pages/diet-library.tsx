import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, TrendingUp, Calendar, Trash2 } from "lucide-react";
import type { DietTemplate } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const templateFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  objective: z.string().optional(),
  content: z.string().min(50, "El contenido debe tener al menos 50 caracteres"),
  targetCalories: z.number().min(800).max(5000).optional(),
  isActive: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function DietLibrary() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DietTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DietTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<DietTemplate[]>({
    queryKey: ["/api/diet-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const response = await apiRequest("POST", "/api/diet-templates", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-templates"] });
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setSelectedTemplate(null);
      form.reset();
      toast({
        title: "Plantilla creada",
        description: "La plantilla de dieta ha sido creada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la plantilla",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormValues }) => {
      const response = await apiRequest("PATCH", `/api/diet-templates/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-templates"] });
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setSelectedTemplate(null);
      form.reset();
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla de dieta ha sido actualizada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la plantilla",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/diet-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-templates"] });
      setTemplateToDelete(null);
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla de dieta se eliminó correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive",
      });
    },
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      objective: "",
      content: "",
      isActive: true,
    },
  });

  const onSubmit = (data: TemplateFormValues) => {
    if (isEditMode && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando biblioteca...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Biblioteca de Dietas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus plantillas de planes nutricionales
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedTemplate(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template" onClick={() => {
              setIsEditMode(false);
              setSelectedTemplate(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Plantilla de Dieta" : "Crear Plantilla de Dieta"}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Modifica la plantilla existente"
                  : "Crea una nueva plantilla que la IA usará como referencia para generar planes personalizados"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Plantilla</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Plan de Pérdida de Peso - Alto Proteína"
                          data-testid="input-template-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve descripción de esta plantilla..."
                          data-testid="input-template-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-objective">
                              <SelectValue placeholder="Selecciona objetivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="loss">Pérdida de Peso</SelectItem>
                            <SelectItem value="gain">Ganancia Muscular</SelectItem>
                            <SelectItem value="maintain">Mantenimiento</SelectItem>
                            <SelectItem value="rendimiento">Rendimiento Deportivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calorías Objetivo (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2000"
                            data-testid="input-template-calories"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido del Plan</FormLabel>
                      <FormDescription>
                        Pega aquí uno de tus planes nutricionales semanales completos. Este será usado como ejemplo para la IA.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Lunes&#10;Desayuno 9:00 hs: Café con leche 200cc + 2 tostadas integrales...&#10;Almuerzo 13:30 hs: 180gr carne roja + ensalada..."
                          className="min-h-[200px] font-mono text-sm"
                          data-testid="input-template-content"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Plantilla Activa</FormLabel>
                        <FormDescription>
                          Las plantillas activas serán usadas por la IA para generar planes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-template-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setIsEditMode(false);
                      setSelectedTemplate(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    data-testid="button-save-template"
                  >
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending
                      ? "Guardando..."
                      : isEditMode
                      ? "Actualizar Plantilla"
                      : "Guardar Plantilla"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!templates || templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Crea tu primera plantilla de dieta para que la IA pueda generar planes personalizados
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
                    {template.isActive ? (
                      <Badge variant="default" className="shrink-0">Activa</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Inactiva</Badge>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {template.objective && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{template.objective}</span>
                    </div>
                  )}
                  {template.targetCalories && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{template.targetCalories} kcal/día</span>
                    </div>
                  )}
                  {template.successRate !== null && (
                    <div className="text-sm text-muted-foreground">
                      Tasa de éxito: <span className="font-semibold text-foreground">{template.successRate}%</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    data-testid={`button-view-${template.id}`}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    Ver Detalles
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    data-testid={`button-edit-${template.id}`}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsEditMode(true);
                      form.reset({
                        name: template.name,
                        description: template.description || "",
                        objective: template.objective || "",
                        content: template.content || "",
                        targetCalories: template.targetCalories || undefined,
                        isActive: template.isActive,
                      });
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="aspect-square"
                    onClick={() => setTemplateToDelete(template)}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            {selectedTemplate?.description && (
              <DialogDescription>{selectedTemplate.description}</DialogDescription>
            )}
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Objetivo</p>
                  <p className="text-sm capitalize">{selectedTemplate.objective || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Calorías Objetivo</p>
                  <p className="text-sm">{selectedTemplate.targetCalories ? `${selectedTemplate.targetCalories} kcal/día` : "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <p className="text-sm">
                    {selectedTemplate.isActive ? (
                      <Badge variant="default">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </p>
                </div>
                {selectedTemplate.successRate !== null && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tasa de Éxito</p>
                    <p className="text-sm">{selectedTemplate.successRate}%</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Contenido del Plan</p>
                <div className="rounded-md border p-4 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {selectedTemplate.content || "Sin contenido"}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
              data-testid="button-close-view"
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedTemplate) {
                  setIsEditMode(true);
                  form.reset({
                    name: selectedTemplate.name,
                    description: selectedTemplate.description || "",
                    objective: selectedTemplate.objective || "",
                    content: selectedTemplate.content || "",
                    targetCalories: selectedTemplate.targetCalories || undefined,
                    isActive: selectedTemplate.isActive,
                  });
                  setIsCreateDialogOpen(true);
                }
              }}
              data-testid="button-edit-from-view"
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés eliminar "{templateToDelete?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => templateToDelete && deleteTemplateMutation.mutate(templateToDelete.id)}
            >
              {deleteTemplateMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
