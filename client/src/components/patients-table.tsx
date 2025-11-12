import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Patient } from "@shared/schema";

interface PatientsTableProps {
  patients: Patient[];
}

type EditedPatient = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  objective: string;
  notes: string;
};

type SortColumn = "name" | "email" | "phone" | "birthDate" | "gender" | "objective" | "notes";
type SortDirection = "asc" | "desc" | null;

export function PatientsTable({ patients }: PatientsTableProps) {
  const { toast } = useToast();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<EditedPatient>({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    objective: "",
    notes: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, data, version }: { id: string; data: Partial<EditedPatient>; version: number }) => {
      return await apiRequest("PATCH", `/api/patients/${id}`, { ...data, version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditingId(null);
      toast({
        title: "Paciente actualizado",
        description: "Los cambios se guardaron exitosamente",
      });
    },
    onError: (error: any) => {
      const isConflict = error?.message?.includes("409");
      toast({
        title: "Error",
        description: isConflict 
          ? "El paciente fue modificado por otro usuario. Recarga la página." 
          : "No se pudo actualizar el paciente",
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
      toast({
        title: "Paciente eliminado",
        description: "El paciente se eliminó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el paciente",
        variant: "destructive",
      });
    },
  });

  const sortedAndFilteredPatients = useMemo(() => {
    // First filter
    let result = patients.filter((patient) =>
      patient.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
      patient.email?.toLowerCase().includes(globalFilter.toLowerCase()) ||
      patient.phone?.toLowerCase().includes(globalFilter.toLowerCase())
    );

    // Then sort
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let aValue = a[sortColumn];
        let bValue = b[sortColumn];

        // Handle nulls
        if (aValue === null || aValue === undefined) return sortDirection === "asc" ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDirection === "asc" ? -1 : 1;

        // Handle dates
        if (sortColumn === "birthDate") {
          const aDate = new Date(aValue as string).getTime();
          const bDate = new Date(bValue as string).getTime();
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }

        // Handle strings
        const comparison = String(aValue).localeCompare(String(bValue), 'es', { sensitivity: 'base' });
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [patients, globalFilter, sortColumn, sortDirection]);

  const isAllSelected = sortedAndFilteredPatients.length > 0 && selectedIds.size === sortedAndFilteredPatients.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < sortedAndFilteredPatients.length;

  const handleEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setEditedData({
      name: patient.name,
      email: patient.email || "",
      phone: patient.phone || "",
      birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : "",
      gender: patient.gender || "",
      objective: patient.objective || "",
      notes: patient.notes || "",
    });
  };

  const handleSave = (patient: Patient) => {
    updatePatientMutation.mutate({
      id: patient.id,
      data: editedData,
      version: patient.version,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({
      name: "",
      email: "",
      phone: "",
      birthDate: "",
      gender: "",
      objective: "",
      notes: "",
    });
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (patientToDelete) {
      deletePatientMutation.mutate(patientToDelete.id);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === sortedAndFilteredPatients.length && sortedAndFilteredPatients.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAndFilteredPatients.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    const deletePromises = Array.from(selectedIds).map(id => 
      apiRequest("DELETE", `/api/patients/${id}`)
    );
    
    try {
      await Promise.all(deletePromises);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      toast({
        title: "Pacientes eliminados",
        description: `Se eliminaron ${selectedIds.size} pacientes exitosamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar algunos pacientes",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction: asc -> desc -> null -> asc
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en todos los campos..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              data-testid="input-global-search"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar seleccionados
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                    onCheckedChange={handleToggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("name")}
                    data-testid="sort-name"
                  >
                    Nombre
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("email")}
                    data-testid="sort-email"
                  >
                    Email
                    {getSortIcon("email")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("phone")}
                    data-testid="sort-phone"
                  >
                    Teléfono
                    {getSortIcon("phone")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("birthDate")}
                    data-testid="sort-birthDate"
                  >
                    Fecha de Nacimiento
                    {getSortIcon("birthDate")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("gender")}
                    data-testid="sort-gender"
                  >
                    Género
                    {getSortIcon("gender")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("objective")}
                    data-testid="sort-objective"
                  >
                    Objetivo
                    {getSortIcon("objective")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3 hover:bg-transparent"
                    onClick={() => handleSort("notes")}
                    data-testid="sort-notes"
                  >
                    Notas
                    {getSortIcon("notes")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPatients.length > 0 ? (
                sortedAndFilteredPatients.map((patient, index) => {
                  const isEditing = editingId === patient.id;
                  const isEvenRow = index % 2 === 0;
                  const isSelected = selectedIds.has(patient.id);
                  return (
                    <TableRow 
                      key={patient.id} 
                      data-testid={`row-patient-${patient.id}`}
                      className={`${isEvenRow ? 'bg-sky-50/50 dark:bg-sky-950/10' : ''} ${isEditing ? 'ring-2 ring-primary/40' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(patient.id)}
                          data-testid={`checkbox-patient-${patient.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedData.name}
                            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            className="h-8"
                            data-testid={`input-name-${patient.id}`}
                          />
                        ) : (
                          <span className="font-medium">{patient.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editedData.email}
                            onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                            className="h-8"
                            data-testid={`input-email-${patient.id}`}
                          />
                        ) : (
                          <span>{patient.email || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedData.phone}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            className="h-8"
                            data-testid={`input-phone-${patient.id}`}
                          />
                        ) : (
                          <span>{patient.phone || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.birthDate}
                            onChange={(e) => setEditedData({ ...editedData, birthDate: e.target.value })}
                            className="h-8"
                            data-testid={`input-birthDate-${patient.id}`}
                          />
                        ) : (
                          <span>{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editedData.gender}
                            onValueChange={(value) => setEditedData({ ...editedData, gender: value })}
                          >
                            <SelectTrigger className="h-8" data-testid={`select-gender-${patient.id}`}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Masculino</SelectItem>
                              <SelectItem value="F">Femenino</SelectItem>
                              <SelectItem value="Other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>
                            {patient.gender === "M" ? "Masculino" : patient.gender === "F" ? "Femenino" : patient.gender === "Other" ? "Otro" : "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editedData.objective}
                            onValueChange={(value) => setEditedData({ ...editedData, objective: value })}
                          >
                            <SelectTrigger className="h-8" data-testid={`select-objective-${patient.id}`}>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pérdida">Pérdida</SelectItem>
                              <SelectItem value="ganancia">Ganancia</SelectItem>
                              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{patient.objective || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedData.notes}
                            onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                            className="h-8"
                            data-testid={`input-notes-${patient.id}`}
                          />
                        ) : (
                          <span className="truncate max-w-[200px] inline-block">{patient.notes || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleSave(patient)}
                                disabled={!editedData.name.trim() || updatePatientMutation.isPending}
                                data-testid={`button-save-${patient.id}`}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCancel}
                                disabled={updatePatientMutation.isPending}
                                data-testid={`button-cancel-${patient.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(patient)}
                                data-testid={`button-edit-${patient.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(patient)}
                                data-testid={`button-delete-${patient.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No se encontraron pacientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {sortedAndFilteredPatients.length} de {patients.length} pacientes
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-patient">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{patientToDelete?.name}</strong>?
              Esta acción no se puede deshacer y se eliminarán todas las mediciones y datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} paciente{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedIds.size} paciente{selectedIds.size > 1 ? 's' : ''}?
              Esta acción no se puede deshacer y se eliminarán todas las mediciones y datos asociados a estos pacientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              Eliminar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
