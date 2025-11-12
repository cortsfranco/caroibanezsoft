import { useState } from "react";
import { PatientCard } from "@/components/patient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  const mockPatients = [
    {
      id: "1",
      name: "Franco Corts",
      age: 31,
      lastMeasurement: "15/08/2023",
      nextAppointment: "20/12/2024",
      objective: "ganancia" as const,
      group: "Gimnasia",
    },
    {
      id: "2",
      name: "María González",
      age: 28,
      lastMeasurement: "10/12/2024",
      nextAppointment: "17/12/2024",
      objective: "pérdida" as const,
      group: "Consultorio",
    },
    {
      id: "3",
      name: "Juan Pérez",
      age: 35,
      lastMeasurement: "05/12/2024",
      nextAppointment: "19/12/2024",
      objective: "mantenimiento" as const,
      group: "Consultorio",
    },
    {
      id: "4",
      name: "Ana Martínez",
      age: 24,
      lastMeasurement: "12/12/2024",
      nextAppointment: "22/12/2024",
      objective: "pérdida" as const,
      group: "Consultorio",
    },
    {
      id: "5",
      name: "Carlos Rodríguez",
      age: 29,
      lastMeasurement: "08/12/2024",
      nextAppointment: "18/12/2024",
      objective: "ganancia" as const,
      group: "Gimnasia",
    },
    {
      id: "6",
      name: "Laura Fernández",
      age: 32,
      lastMeasurement: "11/12/2024",
      objective: "pérdida" as const,
      group: "Fútbol",
    },
  ];

  const filteredPatients = mockPatients.filter((patient) => {
    const matchesSearch = patient.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesGroup =
      selectedGroup === "all" || patient.group === selectedGroup;
    return matchesSearch && matchesGroup;
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

      <div className="flex gap-4 flex-wrap">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <PatientCard key={patient.id} {...patient} />
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No se encontraron pacientes con los filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
}
