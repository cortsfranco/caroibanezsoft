import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Mail, Phone, User, Edit, FileDown, Activity, Utensils, Heart, MessageSquareShare, MessageCircle, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignDietDialog } from "@/components/assign-diet-dialog";
import { PatientEditDialog } from "@/components/patient-edit-dialog";
import { MeasurementsHistory } from "@/components/measurements-history";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, DietAssignment, Measurement, Report } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ConsultationSummary = {
  consultation: {
    id: string;
    patientId: string;
    consultationDate: string;
    anamnesis: Record<string, unknown> | null;
    activity: Record<string, unknown> | null;
    dietaryPreferences: Record<string, unknown> | null;
    supplements: Record<string, unknown> | null;
    notes: string | null;
    attachments: unknown;
  };
  measurements: Measurement[];
  dietAssignments: DietAssignment[];
  reports: Report[];
};

type PatientWithObjective = Patient & { objective: string | null };

interface DietAssignmentWithRelations extends DietAssignment {
  diet?: { name: string } | null;
}

export default function PatientProfile() {
  const [match, params] = useRoute("/pacientes/:id");
  const [location, setLocation] = useLocation();
  const patientId = params?.id;
  
  // Extract tab from URL query params
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tabParam = searchParams.get('tab');
  const validTabs = ['datos', 'dietas', 'mediciones', 'informes', 'consultas'];
  const initialTab = validTabs.includes(tabParam || '') ? tabParam! : 'datos';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConsultationDialogOpen, setIsConsultationDialogOpen] = useState(false);
  const [consultationDate, setConsultationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [consultationNotes, setConsultationNotes] = useState("");
  const [consultationActivity, setConsultationActivity] = useState("");
  const [consultationDietary, setConsultationDietary] = useState("");
  const [consultationSupplements, setConsultationSupplements] = useState("");
  const { toast } = useToast();
  
  // Sync URL when tab changes
  useEffect(() => {
    const currentPath = location.split('?')[0];
    const newLocation = activeTab === 'datos' 
      ? currentPath 
      : `${currentPath}?tab=${activeTab}`;
    if (location !== newLocation) {
      setLocation(newLocation, { replace: true });
    }
  }, [activeTab, location, setLocation]);

  const { data: patientProfile, isLoading: isLoadingProfile } = useQuery<{
    patient: Patient;
    consultations: ConsultationSummary[];
    latestMeasurementCalculations?: { targetCalories?: number } | null;
  }>({
    queryKey: ["/api/patients", patientId, "profile"],
    enabled: !!patientId,
  });

  const patient = patientProfile?.patient;

  const { data: dietAssignments = [] } = useQuery<DietAssignment[]>({
    queryKey: ["/api/diet-assignments", { patientId }],
    queryFn: async () => {
      const response = await fetch(`/api/diet-assignments?patientId=${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch diet assignments");
      return response.json();
    },
    enabled: !!patientId,
  });

  const profileConsultations = patientProfile?.consultations ?? [];

  const createConsultationMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) return;
      await apiRequest("POST", "/api/consultations", {
        patientId,
        consultationDate,
        notes: consultationNotes || null,
        activity: consultationActivity ? { description: consultationActivity } : null,
        dietaryPreferences: consultationDietary ? { notes: consultationDietary } : null,
        supplements: consultationSupplements ? { plan: consultationSupplements } : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "profile"] });
      setIsConsultationDialogOpen(false);
      setConsultationNotes("");
      setConsultationActivity("");
      setConsultationDietary("");
      setConsultationSupplements("");
      toast({
        title: "Consulta registrada",
        description: "La consulta quedó disponible en el historial.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar la consulta",
        variant: "destructive",
      });
    },
  });

  // All hooks MUST be before any conditional returns
  const formattedPhone = useMemo(() => {
    if (!patient?.phone) return null;
    const digits = patient.phone.replace(/[^0-9]/g, "");
    return digits.length >= 10 ? digits : null;
  }, [patient?.phone]);

  const sortedConsultations = useMemo(() => {
    return [...profileConsultations].sort(
      (a, b) =>
        new Date(b.consultation.consultationDate).getTime() -
        new Date(a.consultation.consultationDate).getTime(),
    );
  }, [profileConsultations]);

  // Helper functions (can be after hooks but before returns)
  const handleWhatsAppOpen = (mode: "simple" | "with_documents") => {
    if (!formattedPhone) return;
    const baseUrl = `https://wa.me/${formattedPhone}`;
    const defaultText = mode === "with_documents"
      ? `Hola ${patient?.name?.split(" ")[0] || ""}! Te comparto tu plan e informe actualizados. Cualquier duda me escribis ❤️`
      : `Hola ${patient?.name?.split(" ")[0] || ""}! ¿Cómo venís con el plan nutricional?`;
    const encoded = encodeURIComponent(defaultText);
    window.open(`${baseUrl}?text=${encoded}`, "_blank");
  };

  // Early returns AFTER all hooks
  if (!match || !patientId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Paciente no encontrado</p>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Paciente no encontrado</h2>
          <p className="text-muted-foreground">El paciente solicitado no existe</p>
        </div>
      </div>
    );
  }

  // Derived values (after conditional returns is OK)
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const age = patient.birthDate
    ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    : null;

  const sectionCardClass = (index: number) =>
    cn(
      "shadow-md border border-slate-200/70 dark:border-white/10 transition-colors duration-200",
      index % 2 === 0
        ? "bg-white dark:bg-slate-900/60"
        : "bg-[hsla(203,89%,53%,0.08)] dark:bg-[hsla(203,89%,53%,0.18)]"
    );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-2 border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                {patient.avatarUrl ? (
                  <AvatarImage src={patient.avatarUrl} alt={patient.name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold text-primary">{patient.name}</h1>
                  {patient.objective && (
                    <Badge className="text-sm px-3 py-1 bg-gradient-to-r from-primary/80 to-primary text-white">
                      {patient.objective}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {age && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{age} años</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${patient.email}`} className="hover:text-primary transition-colors">
                        {patient.email}
                      </a>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {formattedPhone ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="px-0 h-auto text-primary hover:bg-transparent">
                              {patient.phone}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64">
                            <DropdownMenuLabel>Contacto rápido</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleWhatsAppOpen("simple")}>
                              <MessageCircle className="h-4 w-4 mr-2 text-primary" />
                              Enviar mensaje por WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleWhatsAppOpen("with_documents")}> 
                              <MessageSquareShare className="h-4 w-4 mr-2 text-primary" />
                              Compartir plan + informe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => navigator.clipboard.writeText(patient.phone!)}>
                              Copiar número
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span>{patient.phone}</span>
                      )}
                    </div>
                  )}
                  {patient.birthDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(patient.birthDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {patient.notes && (
                  <p className="text-sm text-muted-foreground italic mt-2 max-w-3xl">
                    {patient.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AssignDietDialog patientId={patient.id} patientName={patient.name} />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)}
                data-testid="button-edit-patient"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" variant="secondary" data-testid="button-export-patient">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar ficha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-primary/10">
          <TabsTrigger value="datos" data-testid="tab-datos">Datos Personales</TabsTrigger>
          <TabsTrigger value="dietas" data-testid="tab-dietas">Dietas Asignadas</TabsTrigger>
          <TabsTrigger value="mediciones" data-testid="tab-mediciones">Mediciones</TabsTrigger>
          <TabsTrigger value="informes" data-testid="tab-informes">Informes</TabsTrigger>
          <TabsTrigger value="consultas" data-testid="tab-consultas">Consultas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="datos" className="space-y-4">
          <Card className={sectionCardClass(0)}>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                <p className="text-lg font-semibold">{patient.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Género</p>
                <p className="text-lg font-semibold">
                  {patient.gender === "M" ? "Masculino" : patient.gender === "F" ? "Femenino" : "Otro"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg font-semibold">{patient.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                <p className="text-lg font-semibold">{patient.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                <p className="text-lg font-semibold">
                  {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objetivo</p>
                <p className="text-lg font-semibold">{patient.objective || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Activity Section */}
          <Card className={sectionCardClass(1)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Actividad Física</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Realiza Ejercicio</p>
                <p className="text-lg font-semibold">{patient.exercisesRegularly ? "Sí" : "No"}</p>
              </div>
              {patient.exercisesRegularly && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo de Deporte/Actividad</p>
                    <p className="text-lg font-semibold">{patient.sportType || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Días que Entrena</p>
                    <p className="text-lg font-semibold">{patient.exerciseDays || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Horarios</p>
                    <p className="text-lg font-semibold">{patient.exerciseSchedule || "-"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Dietary Preferences Section */}
          <Card className={sectionCardClass(2)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <CardTitle>Preferencias Dietarias</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vegetariano</p>
                <p className="text-lg font-semibold">{patient.isVegetarian ? "Sí" : "No"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vegano</p>
                <p className="text-lg font-semibold">{patient.isVegan ? "Sí" : "No"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Alergias Alimentarias</p>
                <p className="text-lg">{patient.foodAllergies || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Alimentos que No Consume</p>
                <p className="text-lg">{patient.foodDislikes || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information Section */}
          <Card className={sectionCardClass(3)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>Información Médica</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Condiciones Médicas</p>
                <p className="text-lg">{patient.medicalConditions || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medicamentos Actuales</p>
                <p className="text-lg">{patient.medications || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dietas" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Dietas Asignadas</CardTitle>
            </CardHeader>
            <CardContent>
              {dietAssignments.length > 0 ? (
                <div className="space-y-3">
                  {dietAssignments.map((assignment) => (
                    <Card key={assignment.id} className="hover-elevate">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">Dieta #{assignment.dietId.substring(0, 8)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(assignment.startDate).toLocaleDateString()} 
                              {assignment.endDate && ` - ${new Date(assignment.endDate).toLocaleDateString()}`}
                            </p>
                            {assignment.notes && (
                              <p className="text-sm mt-2">{assignment.notes}</p>
                            )}
                          </div>
                          <Badge variant={assignment.isActive ? "default" : "secondary"}>
                            {assignment.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No hay dietas asignadas para este paciente
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mediciones" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Historial de Mediciones</h2>
              <p className="text-sm text-muted-foreground">
                Evolución antropométrica y cálculos ISAK 2
              </p>
            </div>
            <Button onClick={() => setLocation("/mediciones")} data-testid="button-new-measurement-from-profile">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Medición
            </Button>
          </div>
          <MeasurementsHistory patientId={patientId!} />
        </TabsContent>

        <TabsContent value="informes" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Informes Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                No hay informes generados para este paciente
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Historial de Consultas</h2>
              <p className="text-sm text-muted-foreground">
                Cada consulta agrupa anamnesis, mediciones, planes e informes.
              </p>
            </div>
            <Button onClick={() => setIsConsultationDialogOpen(true)}>
              Registrar nueva consulta
            </Button>
          </div>

          {sortedConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aún no cargaste consultas para este paciente.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedConsultations.map((entry) => {
                const { consultation, measurements, dietAssignments: diets, reports } = entry;
                const date = new Date(consultation.consultationDate).toLocaleDateString();

                return (
                  <Card key={consultation.id} className="shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle>Consulta del {date}</CardTitle>
                        <CardDescription>
                          {consultation.notes ? consultation.notes.slice(0, 160) : "Sin notas registradas"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{measurements.length} mediciones</span>
                        <span>• {diets.length} dietas</span>
                        <span>• {reports.length} informes</span>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm">
                      {consultation.anamnesis && (
                        <div>
                          <p className="text-muted-foreground">Anamnesis</p>
                          <pre className="rounded bg-muted/40 p-3 mt-1 whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(consultation.anamnesis, null, 2)}
                          </pre>
                        </div>
                      )}
                      {consultation.activity && (
                        <div>
                          <p className="text-muted-foreground">Actividad</p>
                          <pre className="rounded bg-muted/40 p-3 mt-1 whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(consultation.activity, null, 2)}
                          </pre>
                        </div>
                      )}
                      {consultation.dietaryPreferences && (
                        <div>
                          <p className="text-muted-foreground">Preferencias dietarias</p>
                          <pre className="rounded bg-muted/40 p-3 mt-1 whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(consultation.dietaryPreferences, null, 2)}
                          </pre>
                        </div>
                      )}
                      {consultation.supplements && (
                        <div>
                          <p className="text-muted-foreground">Suplementación</p>
                          <pre className="rounded bg-muted/40 p-3 mt-1 whitespace-pre-wrap font-mono text-xs">
                            {JSON.stringify(consultation.supplements, null, 2)}
                          </pre>
                        </div>
                      )}
                      {diets.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Dietas asociadas</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {diets.map((diet) => (
                              <Badge key={diet.id} variant={diet.isActive ? "default" : "secondary"}>
                                Plan #{diet.dietId.slice(0, 8)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {reports.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Informes generados</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {reports.map((report) => (
                              <Badge key={report.id} variant="outline">
                                Informe #{report.id.slice(0, 8)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isConsultationDialogOpen} onOpenChange={setIsConsultationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar consulta</DialogTitle>
            <DialogDescription>
              Guardamos toda la información relevante de esta sesión para reutilizarla en dietas e informes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="consultation-date">Fecha</label>
              <Input
                id="consultation-date"
                type="date"
                value={consultationDate}
                onChange={(e) => setConsultationDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="consultation-notes">Notas generales</label>
              <Textarea
                id="consultation-notes"
                placeholder="Apuntes rápidos, machetes, sensaciones del paciente…"
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="consultation-activity">Actividad/Entrenamiento</label>
              <Textarea
                id="consultation-activity"
                placeholder="Ej: Funcional en club, doble turno lunes/miércoles"
                value={consultationActivity}
                onChange={(e) => setConsultationActivity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="consultation-dietary">Preferencias dietarias</label>
              <Textarea
                id="consultation-dietary"
                placeholder="Restricciones, preferencias, variantes para hotel, etc."
                value={consultationDietary}
                onChange={(e) => setConsultationDietary(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="consultation-supplements">Suplementación</label>
              <Textarea
                id="consultation-supplements"
                placeholder="Ej: Creatina 5 g post entrenamiento, Magnesio 400 mg nocturno"
                value={consultationSupplements}
                onChange={(e) => setConsultationSupplements(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsultationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createConsultationMutation.mutate()}
              disabled={createConsultationMutation.isPending}
            >
              {createConsultationMutation.isPending ? "Guardando…" : "Guardar consulta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PatientEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        patient={patient as PatientWithObjective}
      />
    </div>
  );
}
