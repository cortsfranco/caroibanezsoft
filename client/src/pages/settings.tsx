import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  profileName: z.string().optional().nullable(),
  proteinMultiplierLoss: z.coerce.number().min(0.5).max(5),
  proteinMultiplierMaintain: z.coerce.number().min(0.5).max(5),
  proteinMultiplierGain: z.coerce.number().min(0.5).max(5),
  fatPerKg: z.coerce.number().min(0.1).max(5),
  whatsappTemplateClassic: z.string().optional().nullable(),
  whatsappTemplateWithDocs: z.string().optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type SettingsResponse = SettingsFormValues & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      profileName: "Carolina Ibáñez",
      proteinMultiplierLoss: 1.8,
      proteinMultiplierMaintain: 1.8,
      proteinMultiplierGain: 2,
      fatPerKg: 0.9,
      whatsappTemplateClassic: "Hola {{nombre}}! ¿Cómo venís con el plan?",
      whatsappTemplateWithDocs:
        "Hola {{nombre}}! Te adjunto tu plan y el informe actualizados. Cualquier cosa escribime ❤️",
    },
  });

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        profileName: data.profileName ?? "",
        proteinMultiplierLoss: data.proteinMultiplierLoss,
        proteinMultiplierMaintain: data.proteinMultiplierMaintain,
        proteinMultiplierGain: data.proteinMultiplierGain,
        fatPerKg: data.fatPerKg,
        whatsappTemplateClassic: data.whatsappTemplateClassic ?? "",
        whatsappTemplateWithDocs: data.whatsappTemplateWithDocs ?? "",
      });
    }
  }, [data, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      await apiRequest("PUT", "/api/settings", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configuración actualizada",
        description: "Usaremos estos valores en los cálculos y envíos automáticos.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configuración de Carolina</h1>
        <p className="text-muted-foreground mt-1">
          Ajustá tus parámetros clínicos, mensajes y preferencias para que el sistema trabaje con tu estilo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros nutricionales</CardTitle>
          <CardDescription>
            Estas constantes se aplican automáticamente cada vez que registrás una medición ISAK.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="profileName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del perfil</FormLabel>
                      <FormControl>
                        <Input placeholder="Carolina Ibáñez" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fatPerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grasas (g/kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="proteinMultiplierLoss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteínas (déficit)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proteinMultiplierMaintain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteínas (mantenimiento)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proteinMultiplierGain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteínas (ganancia/hipertrofia)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="whatsappTemplateClassic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje WhatsApp (seguimiento)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Hola [Paciente]!"
                          rows={4}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappTemplateWithDocs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje WhatsApp (plan + informe)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Hola [Paciente]! Te comparto tu plan: [LinkPlan]"
                          rows={4}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => data && form.reset({
                    profileName: data.profileName ?? "",
                    proteinMultiplierLoss: data.proteinMultiplierLoss,
                    proteinMultiplierMaintain: data.proteinMultiplierMaintain,
                    proteinMultiplierGain: data.proteinMultiplierGain,
                    fatPerKg: data.fatPerKg,
                    whatsappTemplateClassic: data.whatsappTemplateClassic ?? "",
                    whatsappTemplateWithDocs: data.whatsappTemplateWithDocs ?? "",
                  })}
                  disabled={updateSettingsMutation.isPending || isLoading}
                >
                  Deshacer cambios
                </Button>
                <Button type="submit" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? "Guardando…" : "Guardar configuración"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
