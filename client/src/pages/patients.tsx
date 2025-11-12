import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PatientCard } from "@/components/patient-card";
import { PatientsTable } from "@/components/patients-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, Table2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Patient } from "@shared/schema";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Fetch patients from API
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
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
        <Button data-testid="button-add-patient">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
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
