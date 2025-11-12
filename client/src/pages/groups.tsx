import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, X } from "lucide-react";
import type { PatientGroup } from "@shared/schema";

type Patient = {
  id: string;
  name: string;
  email: string;
  version: number;
};

type GroupMembership = {
  id: string;
  patientId: string;
  groupId: string;
  version: number;
};

export default function Groups() {
  const { toast } = useToast();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroupForPatient, setSelectedGroupForPatient] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useQuery<PatientGroup[]>({
    queryKey: ["/api/groups"],
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: memberships = [] } = useQuery<GroupMembership[]>({
    queryKey: ["/api/memberships"],
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest("POST", "/api/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      toast({
        title: "Grupo creado",
        description: "El grupo se creó exitosamente",
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

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, name, description, version }: { id: string; name: string; description?: string; version: number }) => {
      return await apiRequest("PATCH", `/api/groups/${id}`, { name, description, version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setEditingGroupId(null);
      toast({
        title: "Grupo actualizado",
        description: "El grupo se actualizó exitosamente",
      });
    },
    onError: (error: any) => {
      const isConflict = error?.message?.includes("409");
      toast({
        title: "Error",
        description: isConflict 
          ? "El grupo fue modificado por otro usuario. Recarga la página." 
          : "No se pudo actualizar el grupo",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      toast({
        title: "Grupo eliminado",
        description: "El grupo se eliminó exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el grupo",
        variant: "destructive",
      });
    },
  });

  const createMembershipMutation = useMutation({
    mutationFn: async (data: { patientId: string; groupId: string }) => {
      return await apiRequest("POST", "/api/memberships", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      setSelectedGroupForPatient(null);
      setSelectedPatientId("");
      toast({
        title: "Paciente asignado",
        description: "El paciente se asignó al grupo exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el paciente al grupo",
        variant: "destructive",
      });
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/memberships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      toast({
        title: "Paciente removido",
        description: "El paciente se removió del grupo exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo remover el paciente del grupo",
        variant: "destructive",
      });
    },
  });

  const getGroupPatients = (groupId: string) => {
    const groupMemberships = memberships.filter((m) => m.groupId === groupId);
    return patients.filter((p) => groupMemberships.some((m) => m.patientId === p.id));
  };

  const getMembershipId = (patientId: string, groupId: string) => {
    return memberships.find((m) => m.patientId === patientId && m.groupId === groupId)?.id;
  };

  const getUnassignedPatients = () => {
    const assignedPatientIds = new Set(memberships.map((m) => m.patientId));
    return patients.filter((p) => !assignedPatientIds.has(p.id));
  };

  const handleSaveGroupName = (group: PatientGroup) => {
    if (editingGroupName.trim() && editingGroupName !== group.name) {
      updateGroupMutation.mutate({
        id: group.id,
        name: editingGroupName,
        description: group.description || undefined,
        version: group.version,
      });
    } else {
      setEditingGroupId(null);
    }
  };

  const handleStartEdit = (group: PatientGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleAddPatientToGroup = () => {
    if (selectedPatientId && selectedGroupForPatient) {
      createMembershipMutation.mutate({
        patientId: selectedPatientId,
        groupId: selectedGroupForPatient,
      });
    }
  };

  if (loadingGroups || loadingPatients) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-groups-title">
            Grupos de Pacientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Organiza y gestiona tus pacientes por grupos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-group">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-group">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
              <DialogDescription>
                Crea un nuevo grupo para organizar tus pacientes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="groupName" className="text-sm font-medium">
                  Nombre del Grupo *
                </label>
                <Input
                  id="groupName"
                  data-testid="input-group-name"
                  placeholder="Ej: Deportistas, Adultos Mayores, etc."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="groupDescription" className="text-sm font-medium">
                  Descripción (opcional)
                </label>
                <Input
                  id="groupDescription"
                  data-testid="input-group-description"
                  placeholder="Describe el grupo..."
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createGroupMutation.mutate({
                    name: newGroupName,
                    description: newGroupDescription,
                  })
                }
                disabled={!newGroupName.trim() || createGroupMutation.isPending}
                data-testid="button-submit-create"
              >
                {createGroupMutation.isPending ? "Creando..." : "Crear Grupo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay grupos creados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primer grupo para organizar pacientes
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const groupPatients = getGroupPatients(group.id);
            const isEditing = editingGroupId === group.id;

            return (
              <Card
                key={group.id}
                className="hover-elevate"
                data-testid={`card-group-${group.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <Input
                        data-testid={`input-edit-group-${group.id}`}
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={() => handleSaveGroupName(group)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGroupName(group);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        autoFocus
                        className="flex-1"
                      />
                    ) : (
                      <CardTitle
                        className="flex-1 cursor-pointer"
                        onClick={() => handleStartEdit(group)}
                        data-testid={`text-group-name-${group.id}`}
                      >
                        {group.name}
                      </CardTitle>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(group)}
                        data-testid={`button-edit-group-${group.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-group-description-${group.id}`}>
                      {group.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pacientes</span>
                    <Badge variant="secondary" data-testid={`badge-patient-count-${group.id}`}>
                      {groupPatients.length}
                    </Badge>
                  </div>

                  {groupPatients.length > 0 ? (
                    <div className="space-y-2">
                      {groupPatients.map((patient) => {
                        const membershipId = getMembershipId(patient.id, group.id);
                        return (
                          <div
                            key={patient.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            data-testid={`patient-item-${patient.id}-${group.id}`}
                          >
                            <span className="text-sm">{patient.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => membershipId && deleteMembershipMutation.mutate(membershipId)}
                              data-testid={`button-remove-patient-${patient.id}-${group.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay pacientes en este grupo
                    </p>
                  )}

                  <Dialog
                    open={selectedGroupForPatient === group.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedGroupForPatient(null);
                        setSelectedPatientId("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedGroupForPatient(group.id)}
                        data-testid={`button-add-patient-${group.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Paciente
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid={`dialog-add-patient-${group.id}`}>
                      <DialogHeader>
                        <DialogTitle>Agregar Paciente a {group.name}</DialogTitle>
                        <DialogDescription>
                          Selecciona un paciente para agregarlo a este grupo
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                          <SelectTrigger data-testid="select-patient">
                            <SelectValue placeholder="Selecciona un paciente" />
                          </SelectTrigger>
                          <SelectContent>
                            {getUnassignedPatients().map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name} - {patient.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedGroupForPatient(null);
                            setSelectedPatientId("");
                          }}
                          data-testid="button-cancel-add-patient"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleAddPatientToGroup}
                          disabled={!selectedPatientId || createMembershipMutation.isPending}
                          data-testid="button-submit-add-patient"
                        >
                          {createMembershipMutation.isPending ? "Agregando..." : "Agregar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
