import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PatientCard } from "@/components/patient-card";
import { PatientsTable } from "@/components/patients-table";
import { ExcelImportExport } from "@/components/excel-import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, LayoutGrid, Table2 } from "lucide-react";
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
import type { Patient } from "@shared/schema";

export default function Patients() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    objective: "",
    notes: "",
  });

  // Fetch patients from API
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: typeof newPatient) => {
      const payload: any = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        birthDate: data.birthDate || null,
        gender: data.gender || null,
        objective: data.objective || null,
        notes: data.notes || null,
      };
      return await apiRequest("POST", "/api/patients", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsCreateDialogOpen(false);
      setNewPatient({
        name: "",
        email: "",
        phone: "",
        birthDate: "",
        gender: "",
        objective: "",
        notes: "",
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

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
          <DialogContent className="max-w-2xl" data-testid="dialog-create-patient">
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
                  onValueChange={(value) => setNewPatient({ ...newPatient, objective: value })}
                >
                  <SelectTrigger id="objective" data-testid="select-patient-objective">
                    <SelectValue placeholder="Seleccionar objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pérdida">Pérdida de peso</SelectItem>
                    <SelectItem value="ganancia">Ganancia de masa</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  data-testid="input-patient-notes"
                  placeholder="Observaciones adicionales..."
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
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
                <SelectItem value="Consultorio">Consultorio</SelectItem>
                <SelectItem value="Gimnasia">Gimnasia</SelectItem>
                <SelectItem value="Fútbol">Fútbol</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando pacientes...</p>
        </div>
      ) : viewMode === "table" ? (
        <PatientsTable patients={filteredPatients} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                id={patient.id}
                name={patient.name}
                age={patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 0}
                objective={patient.objective as "pérdida" | "ganancia" | "mantenimiento" | undefined}
              />
            ))}
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
