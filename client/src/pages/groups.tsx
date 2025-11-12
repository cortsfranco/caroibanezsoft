import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import type { PatientGroup } from "@shared/schema";
import { getGroupGradient, getGroupBorderColor, getGroupBadgeBg, getGroupAccentColor } from "@/lib/group-colors";

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
  const confirmDialog = useConfirmDialog();
  
  // Estados para CREAR grupo
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Estados para EDITAR grupo
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("#3b82f6");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PatientGroup | null>(null);
  
  // Otros estados
  const [selectedGroupForPatient, setSelectedGroupForPatient] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      return await apiRequest("POST", "/api/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupColor("#3b82f6");
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
    mutationFn: async ({ id, name, description, color, version }: { id: string; name: string; description?: string; color?: string; version: number }) => {
      return await apiRequest("PATCH", `/api/groups/${id}`, { name, description, color, version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      handleCloseEditDialog();
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

  const handleOpenEditDialog = (group: PatientGroup) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || "");
    setEditGroupColor(group.color || "#3b82f6");
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingGroup(null);
    setEditGroupName("");
    setEditGroupDescription("");
    setEditGroupColor("#3b82f6");
  };

  const handleSaveEdit = () => {
    if (!editingGroup) return;
    
    updateGroupMutation.mutate({
      id: editingGroup.id,
      name: editGroupName,
      description: editGroupDescription || undefined,
      color: editGroupColor,
      version: editingGroup.version,
    });
  };

  const handleAddPatientToGroup = () => {
    if (selectedPatientId && selectedGroupForPatient) {
      createMembershipMutation.mutate({
        patientId: selectedPatientId,
        groupId: selectedGroupForPatient,
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const groupMembers = memberships.filter(m => m.groupId === groupId).length;
    const confirmed = await confirmDialog.confirm({
      title: "Eliminar Grupo",
      description: `¿Estás seguro de que deseas eliminar el grupo "${group?.name}"?${groupMembers > 0 ? ` Este grupo tiene ${groupMembers} paciente(s).` : ''} Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });
    
    if (confirmed) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleRemoveMembership = async (membershipId: string, patientId: string, groupId: string) => {
    const patient = patients.find(p => p.id === patientId);
    const group = groups.find(g => g.id === groupId);
    const confirmed = await confirmDialog.confirm({
      title: "Remover Paciente",
      description: `¿Estás seguro de que deseas remover a "${patient?.name}" del grupo "${group?.name}"?`,
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
    });
    
    if (confirmed) {
      deleteMembershipMutation.mutate(membershipId);
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
              <div className="space-y-2">
                <label htmlFor="groupColor" className="text-sm font-medium">
                  Color del Grupo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="groupColor"
                    data-testid="input-group-color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="h-10 w-20 rounded-md border border-input cursor-pointer"
                  />
                  <div 
                    className="flex-1 h-10 rounded-md border"
                    style={{
                      background: getGroupGradient(newGroupColor),
                      borderColor: getGroupBorderColor(newGroupColor)
                    }}
                  />
                </div>
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
                    color: newGroupColor,
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

      {/* Diálogo de Editar Grupo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-group">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Modifica la información del grupo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="editGroupName" className="text-sm font-medium">
                Nombre del Grupo *
              </label>
              <Input
                id="editGroupName"
                data-testid="input-edit-group-name"
                placeholder="Ej: Deportistas, Adultos Mayores, etc."
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGroupDescription" className="text-sm font-medium">
                Descripción (opcional)
              </label>
              <Input
                id="editGroupDescription"
                data-testid="input-edit-group-description"
                placeholder="Describe el grupo..."
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGroupColor" className="text-sm font-medium">
                Color del Grupo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="editGroupColor"
                  data-testid="input-edit-group-color"
                  value={editGroupColor}
                  onChange={(e) => setEditGroupColor(e.target.value)}
                  className="h-10 w-20 rounded-md border border-input cursor-pointer"
                />
                <div 
                  className="flex-1 h-10 rounded-md border"
                  style={{
                    background: getGroupGradient(editGroupColor),
                    borderColor: getGroupBorderColor(editGroupColor)
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditDialog}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editGroupName.trim() || updateGroupMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateGroupMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            const isEditing = editingGroup?.id === group.id;
            const isExpanded = expandedGroups.has(group.id);
            const groupColor = group.color || "#3b82f6";

            return (
              <Card
                key={group.id}
                className="hover-elevate relative overflow-hidden"
                data-testid={`card-group-${group.id}`}
                style={{
                  background: getGroupGradient(groupColor),
                  borderColor: getGroupBorderColor(groupColor),
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle
                      className="flex-1"
                      data-testid={`text-group-name-${group.id}`}
                    >
                      {group.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(group)}
                        data-testid={`button-edit-group-${group.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGroup(group.id)}
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
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => {
                      const newExpanded = new Set(expandedGroups);
                      if (open) {
                        newExpanded.add(group.id);
                      } else {
                        newExpanded.delete(group.id);
                      }
                      setExpandedGroups(newExpanded);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2 p-0 hover:bg-transparent"
                          data-testid={`button-toggle-patients-${group.id}`}
                        >
                          <span className="text-sm font-medium">Pacientes</span>
                          <Badge 
                            variant="secondary" 
                            data-testid={`badge-patient-count-${group.id}`}
                            style={{
                              backgroundColor: getGroupBadgeBg(groupColor),
                              color: getGroupAccentColor(groupColor),
                              borderColor: getGroupBorderColor(groupColor),
                            }}
                          >
                            {groupPatients.length}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="space-y-2 pt-2">
                      {groupPatients.length > 0 ? (
                        <div className="space-y-2">
                          {groupPatients.map((patient) => {
                            const membershipId = getMembershipId(patient.id, group.id);
                            return (
                              <div
                                key={patient.id}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover-elevate"
                                data-testid={`patient-item-${patient.id}-${group.id}`}
                              >
                                <Link
                                  href={`/patients/${patient.id}`}
                                  className="text-sm hover:underline flex-1"
                                  data-testid={`link-patient-${patient.id}`}
                                  style={{ color: getGroupAccentColor(groupColor) }}
                                >
                                  {patient.name}
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => membershipId && handleRemoveMembership(membershipId, patient.id, group.id)}
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
                    </CollapsibleContent>
                  </Collapsible>

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

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => !open && confirmDialog.handleCancel()}
        title={confirmDialog.options.title}
        description={confirmDialog.options.description}
        confirmLabel={confirmDialog.options.confirmLabel}
        cancelLabel={confirmDialog.options.cancelLabel}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        variant="destructive"
      />
    </div>
  );
}
