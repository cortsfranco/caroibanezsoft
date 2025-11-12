import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Mail, Phone, User, Edit, FileDown, Activity, Utensils, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignDietDialog } from "@/components/assign-diet-dialog";
import { PatientEditDialog } from "@/components/patient-edit-dialog";
import { MeasurementsHistory } from "@/components/measurements-history";
import type { Patient, DietAssignment } from "@shared/schema";

export default function PatientProfile() {
  const [match, params] = useRoute("/pacientes/:id");
  const [location, setLocation] = useLocation();
  const patientId = params?.id;
  
  // Extract tab from URL query params
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tabParam = searchParams.get('tab');
  const validTabs = ['datos', 'dietas', 'mediciones', 'informes'];
  const initialTab = validTabs.includes(tabParam || '') ? tabParam! : 'datos';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
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

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId,
  });

  const { data: dietAssignments = [] } = useQuery<DietAssignment[]>({
    queryKey: ["/api/diet-assignments", { patientId }],
    queryFn: async () => {
      const response = await fetch(`/api/diet-assignments?patientId=${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch diet assignments");
      return response.json();
    },
    enabled: !!patientId,
  });

  if (!match || !patientId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Paciente no encontrado</p>
      </div>
    );
  }

  if (isLoading) {
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

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const age = patient.birthDate
    ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    : null;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-2">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{patient.name}</h1>
                  {patient.objective && (
                    <Badge className="text-sm px-3 py-1">
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
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{patient.phone}</span>
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
                  <p className="text-sm text-muted-foreground italic mt-2">
                    {patient.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
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
              <Button size="sm" data-testid="button-export-patient">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="datos" data-testid="tab-datos">Datos Personales</TabsTrigger>
          <TabsTrigger value="dietas" data-testid="tab-dietas">Dietas Asignadas</TabsTrigger>
          <TabsTrigger value="mediciones" data-testid="tab-mediciones">Mediciones</TabsTrigger>
          <TabsTrigger value="informes" data-testid="tab-informes">Informes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="datos" className="space-y-4">
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
      </Tabs>

      {/* Edit Patient Dialog */}
      <PatientEditDialog
        patient={patient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
