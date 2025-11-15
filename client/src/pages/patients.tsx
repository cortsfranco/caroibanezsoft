import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PatientsTable } from "@/components/patients-table";
import { ExcelImportExport } from "@/components/excel-import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, LayoutGrid, Table2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Patient, PatientGroup, GroupMembership, MeasurementCalculation } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import {
  getObjectiveBadgeClasses,
  getObjectiveLabel,
  type NormalizedObjective,
} from "@/lib/objectives";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { getDefaultTimeRange, getTimeRangeKey, rangeToQueryParams, type TimeRangeValue } from "@/lib/time-range";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type MeasurementWithPatient = {
  id: string;
  patientId: string;
  measurementDate: string;
  weight: string | number | null;
  waist: string | number | null;
  hip: string | number | null;
  notes: string | null;
  patient: {
    id: string | null;
    name: string | null;
    objective: string | null;
  } | null;
  calculations?: MeasurementCalculation | null;
};

export default function Patients() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => getDefaultTimeRange());
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    objective: "" as NormalizedObjective | "",
    notes: "",
    exercisesRegularly: false,
    sportType: "",
    exerciseDays: "",
    exerciseSchedule: "",
    isVegetarian: false,
    isVegan: false,
    foodAllergies: "",
    foodDislikes: "",
    medicalConditions: "",
    medications: "",
    groupId: undefined as string | undefined,
  });

  // Fetch patients from API
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch groups from API
  const { data: groups = [] } = useQuery<PatientGroup[]>({
    queryKey: ["/api/groups"],
  });

  const { data: memberships = [] } = useQuery<GroupMembership[]>({
    queryKey: ["/api/memberships"],
  });

  const rangeKey = getTimeRangeKey(timeRange);

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery<MeasurementWithPatient[]>({
    queryKey: ["/api/measurements", "all", rangeKey],
    queryFn: async () => {
      const params = new URLSearchParams(rangeToQueryParams(timeRange));
      const query = params.toString();
      const response = await fetch(`/api/measurements${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
  });

  const groupNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of groups) {
      map[group.id] = group.name;
    }
    return map;
  }, [groups]);

  const patientGroupIdsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const membership of memberships) {
      if (!membership.patientId || !membership.groupId) continue;
      if (!map[membership.patientId]) {
        map[membership.patientId] = [];
      }
      if (!map[membership.patientId].includes(membership.groupId)) {
        map[membership.patientId].push(membership.groupId);
      }
    }
    return map;
  }, [memberships]);

  const patientGroupNamesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [patientId, groupIds] of Object.entries(patientGroupIdsMap)) {
      map[patientId] = groupIds
        .map((id) => groupNameById[id])
        .filter((name): name is string => Boolean(name));
    }
    return map;
  }, [patientGroupIdsMap, groupNameById]);

  const measurementsByPatient = useMemo(() => {
    const grouped: Record<string, { date: Date; weight: number | null; bodyFat: number | null }[]> = {};
    for (const measurement of measurements) {
      if (!measurement.patientId) continue;
      const date = new Date(measurement.measurementDate);
      const weight = measurement.weight !== null && measurement.weight !== undefined
        ? Number(measurement.weight)
        : null;
      const bodyFat = measurement.calculations?.bodyFatPercentage
        ? Number(measurement.calculations.bodyFatPercentage)
        : null;
      if (!grouped[measurement.patientId]) {
        grouped[measurement.patientId] = [];
      }
      grouped[measurement.patientId].push({ date, weight: Number.isFinite(weight) ? weight : null, bodyFat });
    }

    Object.values(grouped).forEach((entries) => {
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    });

    return grouped;
  }, [measurements]);

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/groups", {
        name,
        description: null,
        color: "#3b82f6",
      });
      const created: PatientGroup = await response.json();
      return created;
    },
    onSuccess: (createdGroup) => {
      queryClient.setQueryData<PatientGroup[]>(["/api/groups"], (current) => {
        if (!current) return [createdGroup];
        const exists = current.some((group) => group.id === createdGroup.id);
        return exists ? current : [...current, createdGroup];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Grupo creado",
        description: "El grupo se creó correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el grupo",
        variant: "destructive",
      });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: typeof newPatient) => {
      const { groupId, ...patientData } = data;
      
      const payload: any = {
        name: patientData.name,
        email: patientData.email || null,
        phone: patientData.phone || null,
        birthDate: patientData.birthDate || null,
        gender: patientData.gender || null,
        objective: patientData.objective || null,
        notes: patientData.notes || null,
        exercisesRegularly: patientData.exercisesRegularly,
        sportType: patientData.sportType || null,
        exerciseDays: patientData.exerciseDays || null,
        exerciseSchedule: patientData.exerciseSchedule || null,
        isVegetarian: patientData.isVegetarian,
        isVegan: patientData.isVegan,
        foodAllergies: patientData.foodAllergies || null,
        foodDislikes: patientData.foodDislikes || null,
        medicalConditions: patientData.medicalConditions || null,
        medications: patientData.medications || null,
      };
      const response = await apiRequest("POST", "/api/patients", payload);
      const patient: Patient = await response.json();
      
      // Si se seleccionó un grupo, crear la membresía
      if (groupId) {
        await apiRequest("POST", "/api/memberships", {
          patientId: patient.id,
          groupId,
        });
      }
      
      return patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      setIsCreateDialogOpen(false);
      setNewPatient({
        name: "",
        email: "",
        phone: "",
        birthDate: "",
        gender: "",
        objective: "",
        notes: "",
        exercisesRegularly: false,
        sportType: "",
        exerciseDays: "",
        exerciseSchedule: "",
        isVegetarian: false,
        isVegan: false,
        foodAllergies: "",
        foodDislikes: "",
        medicalConditions: "",
        medications: "",
        groupId: undefined,
      });
      toast({
        title: "Paciente creado",
        description: "El paciente se creó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el paciente",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return patients.filter((patient) => {
      const groupIds = patientGroupIdsMap[patient.id] || [];
      const groupNames = patientGroupNamesMap[patient.id] || [];

      const matchesGroup = selectedGroup === "all" || groupIds.includes(selectedGroup);
      if (!matchesGroup) return false;

      if (!term) return true;

      const hayCoincidenciaEnNombre = patient.name?.toLowerCase().includes(term);
      const hayCoincidenciaEnEmail = patient.email?.toLowerCase().includes(term);
      const hayCoincidenciaEnGrupo = groupNames.some((name) => name.toLowerCase().includes(term));

      return hayCoincidenciaEnNombre || hayCoincidenciaEnEmail || hayCoincidenciaEnGrupo;
    });
  }, [patients, searchTerm, selectedGroup, patientGroupIdsMap, patientGroupNamesMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus pacientes y sus mediciones
          </p>
        </div>
        <div className="flex gap-2">
          <ExcelImportExport patients={patients} />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-patient">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-patient">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Paciente</DialogTitle>
              <DialogDescription>
                Completa los datos del nuevo paciente
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  data-testid="input-patient-name"
                  placeholder="Juan Pérez"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-patient-email"
                  placeholder="juan@example.com"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  data-testid="input-patient-phone"
                  placeholder="+56 9 1234 5678"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  data-testid="input-patient-birthdate"
                  value={newPatient.birthDate}
                  onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}
                >
                  <SelectTrigger id="gender" data-testid="select-patient-gender">
                    <SelectValue placeholder="Seleccionar género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="Other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Select
                  value={newPatient.objective}
                  onValueChange={(value) =>
                    setNewPatient({
                      ...newPatient,
                      objective: (value as NormalizedObjective | ""),
                    })
                  }
                >
                  <SelectTrigger id="objective" data-testid="select-patient-objective">
                    <SelectValue placeholder="Seleccionar objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      Sin objetivo
                    </SelectItem>
                    <SelectItem value="loss">Pérdida de grasa</SelectItem>
                    <SelectItem value="gain">Ganancia muscular</SelectItem>
                    <SelectItem value="maintain">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-3">
                <Label htmlFor="group">Grupo</Label>
                <Select
                  value={newPatient.groupId || "none"}
                  onValueChange={(value) => setNewPatient({ ...newPatient, groupId: value === "none" ? undefined : value })}
                >
                  <SelectTrigger id="group" data-testid="select-patient-group">
                    <SelectValue placeholder="Sin grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  data-testid="input-patient-notes"
                  placeholder="Observaciones adicionales..."
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  className="min-h-20"
                />
              </div>

              {/* Activity Section */}
              <div className="col-span-2 pt-4 border-t">
                <h3 className="font-semibold mb-3">Actividad Física</h3>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="exercisesRegularly"
                  checked={newPatient.exercisesRegularly}
                  onChange={(e) => setNewPatient({ ...newPatient, exercisesRegularly: e.target.checked })}
                  className="h-4 w-4 rounded border-primary"
                />
                <Label htmlFor="exercisesRegularly" className="font-normal cursor-pointer">
                  Hace ejercicio regularmente
                </Label>
              </div>
              {newPatient.exercisesRegularly && (
                <>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="sportType">Tipo de Deporte/Actividad</Label>
                    <Input
                      id="sportType"
                      placeholder="Ej: Fútbol, Gimnasio, Natación..."
                      value={newPatient.sportType}
                      onChange={(e) => setNewPatient({ ...newPatient, sportType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exerciseDays">Días que Entrena</Label>
                    <Input
                      id="exerciseDays"
                      placeholder="Ej: Lunes, Miércoles, Viernes"
                      value={newPatient.exerciseDays}
                      onChange={(e) => setNewPatient({ ...newPatient, exerciseDays: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exerciseSchedule">Horarios</Label>
                    <Input
                      id="exerciseSchedule"
                      placeholder="Ej: 18:00-19:30"
                      value={newPatient.exerciseSchedule}
                      onChange={(e) => setNewPatient({ ...newPatient, exerciseSchedule: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Dietary Preferences Section */}
              <div className="col-span-2 pt-4 border-t">
                <h3 className="font-semibold mb-3">Preferencias Dietarias</h3>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isVegetarian"
                  checked={newPatient.isVegetarian}
                  onChange={(e) => setNewPatient({ ...newPatient, isVegetarian: e.target.checked })}
                  className="h-4 w-4 rounded border-primary"
                />
                <Label htmlFor="isVegetarian" className="font-normal cursor-pointer">
                  Vegetariano
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isVegan"
                  checked={newPatient.isVegan}
                  onChange={(e) => setNewPatient({ ...newPatient, isVegan: e.target.checked })}
                  className="h-4 w-4 rounded border-primary"
                />
                <Label htmlFor="isVegan" className="font-normal cursor-pointer">
                  Vegano
                </Label>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="foodAllergies">Alergias Alimentarias</Label>
                <Textarea
                  id="foodAllergies"
                  placeholder="Ej: Maní, mariscos, lácteos..."
                  value={newPatient.foodAllergies}
                  onChange={(e) => setNewPatient({ ...newPatient, foodAllergies: e.target.value })}
                  className="min-h-16"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="foodDislikes">Alimentos que No Consume</Label>
                <Textarea
                  id="foodDislikes"
                  placeholder="Alimentos que no le gustan o prefiere evitar..."
                  value={newPatient.foodDislikes}
                  onChange={(e) => setNewPatient({ ...newPatient, foodDislikes: e.target.value })}
                  className="min-h-16"
                />
              </div>

              {/* Medical Information Section */}
              <div className="col-span-2 pt-4 border-t">
                <h3 className="font-semibold mb-3">Información Médica</h3>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="medicalConditions">Condiciones Médicas</Label>
                <Textarea
                  id="medicalConditions"
                  placeholder="Ej: Diabetes, hipertensión, hipotiroidismo..."
                  value={newPatient.medicalConditions}
                  onChange={(e) => setNewPatient({ ...newPatient, medicalConditions: e.target.value })}
                  className="min-h-16"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="medications">Medicamentos Actuales</Label>
                <Textarea
                  id="medications"
                  placeholder="Medicamentos que toma actualmente..."
                  value={newPatient.medications}
                  onChange={(e) => setNewPatient({ ...newPatient, medications: e.target.value })}
                  className="min-h-16"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create-patient"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createPatientMutation.mutate(newPatient)}
                disabled={!newPatient.name.trim() || createPatientMutation.isPending}
                data-testid="button-submit-create-patient"
              >
                {createPatientMutation.isPending ? "Creando..." : "Crear Paciente"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "cards" | "table")}>
          <TabsList>
            <TabsTrigger value="cards" data-testid="tab-cards-view">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="table" data-testid="tab-table-view">
              <Table2 className="h-4 w-4 mr-2" />
              Tabla
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "cards" && (
          <>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-patient"
              />
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[200px]" data-testid="select-group-filter">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Rango temporal para las gráficas</p>
              <p className="text-xs text-muted-foreground">Afecta los sparklines de cada paciente y las estadísticas resumidas.</p>
            </div>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando pacientes...</p>
        </div>
      ) : viewMode === "table" ? (
        <PatientsTable patients={filteredPatients} patientGroupNamesMap={patientGroupNamesMap} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => {
              const cardBgClass = patient.gender === "F"
                ? "bg-pink-200/35 dark:bg-pink-950/30"
                : patient.gender === "M"
                  ? "bg-sky-200/35 dark:bg-sky-950/30"
                  : "bg-slate-200/25 dark:bg-slate-900/30";
              const objectiveLabel = getObjectiveLabel(patient.objective);
              const objectiveBadgeClass = getObjectiveBadgeClasses(patient.objective);
              const groupNames = patientGroupNamesMap[patient.id] || [];
              const patientMeasurements = measurementsByPatient[patient.id] || [];
              const measurementCount = patientMeasurements.length;
              const lastMeasurement = patientMeasurements[0];
              const chartData = patientMeasurements
                .slice()
                .reverse()
                .slice(-8)
                .map((entry) => ({
                  date: entry.date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
                  weight: entry.weight ?? undefined,
                }));
              const hasChartData = chartData.some((entry) => typeof entry.weight === "number");

              return (
                <Link key={patient.id} to={`/pacientes/${patient.id}`}>
                  <Card
                    className={`hover-elevate cursor-pointer h-full min-h-[230px] border border-primary/10 backdrop-blur ${cardBgClass}`}
                    data-testid={`patient-card-${patient.id}`}
                  >
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div className="space-y-2">
                        <h2 className="text-lg font-heading font-semibold text-foreground">{patient.name}</h2>
                        <p className="text-sm text-muted-foreground">{patient.email || "Sin email"}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {objectiveLabel && (
                            <Badge variant="outline" className={`font-medium ${objectiveBadgeClass}`}>
                              {objectiveLabel}
                            </Badge>
                          )}
                          {patient.gender && (
                            <Badge variant="outline" className="bg-white/30 text-slate-700 dark:bg-white/10 dark:text-white/90">
                              {patient.gender === "M" ? "Masculino" : patient.gender === "F" ? "Femenino" : "Otro"}
                            </Badge>
                          )}
                        </div>
                        {groupNames.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {groupNames.map((name) => (
                              <Badge key={name} variant="secondary" className="border-transparent bg-white/40 text-foreground/90 dark:bg-white/10 dark:text-white/90">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg bg-white/75 p-3 text-xs text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          <span>Mediciones</span>
                          {lastMeasurement ? (
                            <span className="font-semibold text-primary">
                              {lastMeasurement.weight !== null && lastMeasurement.weight !== undefined
                                ? `${Number(lastMeasurement.weight).toFixed(1)} kg`
                                : "-"}
                            </span>
                          ) : (
                            <span className="font-semibold text-primary">-</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{measurementCount} registro{measurementCount !== 1 ? "s" : ""}</span>
                          <span>
                            {lastMeasurement
                              ? lastMeasurement.date.toLocaleDateString("es-AR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "Sin registros"}
                          </span>
                        </div>
                        <div className="mt-2 h-20">
                          {hasChartData ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 2, left: -8 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200/70" />
                                <XAxis
                                  dataKey="date"
                                  hide
                                />
                                <YAxis hide domain={["auto", "auto"]} />
                                <Tooltip
                                  cursor={{ stroke: "#0ea5e9", strokeWidth: 1, strokeDasharray: "4 4" }}
                                  formatter={(value: unknown) => {
                                    if (typeof value === "number" && Number.isFinite(value)) {
                                      return [`${value.toFixed(1)} kg`, "Peso"];
                                    }
                                    return ["-", "Peso"];
                                  }}
                                  labelFormatter={(label) => `Fecha: ${label}`}
                                  contentStyle={{
                                    fontSize: "0.75rem",
                                    borderRadius: "0.5rem",
                                    borderColor: "#0ea5e9",
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="weight"
                                  stroke="#0ea5e9"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                              {loadingMeasurements ? "Cargando mediciones..." : "Sin datos suficientes"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{groupNames.length} grupo{groupNames.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Alta {new Date(patient.createdAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No se encontraron pacientes con los filtros aplicados
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
