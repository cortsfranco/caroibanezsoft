import { useMemo, useState } from "react";
import { ChevronsUpDown, Check, Loader2, PlusCircle } from "lucide-react";
import type { PatientGroup } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CreateGroupHandler = (name: string) => Promise<PatientGroup | null>;

interface GroupMultiSelectProps {
  groups: PatientGroup[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateGroup?: CreateGroupHandler;
  placeholder?: string;
  disabled?: boolean;
}

export function GroupMultiSelect({
  groups,
  selectedIds,
  onChange,
  onCreateGroup,
  placeholder = "Seleccionar grupos",
  disabled = false,
}: GroupMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedIds.includes(group.id)),
    [groups, selectedIds],
  );

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, search]);

  const toggleGroup = (groupId: string) => {
    if (disabled) return;
    const exists = selectedIds.includes(groupId);
    if (exists) {
      onChange(selectedIds.filter((id) => id !== groupId));
    } else {
      onChange([...selectedIds, groupId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!onCreateGroup) return;
    const name = newGroupName.trim();
    if (!name) return;

    try {
      setIsCreating(true);
      const created = await onCreateGroup(name);
      if (created) {
        onChange([...selectedIds, created.id]);
        setNewGroupName("");
        setSearch("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate text-left">
            {selectedGroups.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {selectedGroups.map((group) => (
                  <Badge key={group.id} variant="secondary" className="font-medium">
                    {group.name}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar grupo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontraron grupos.</CommandEmpty>
            <CommandGroup heading="Grupos disponibles">
              {filteredGroups.map((group) => {
                const isSelected = selectedIds.includes(group.id);
                return (
                  <CommandItem
                    key={group.id}
                    value={group.id}
                    onSelect={() => toggleGroup(group.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{group.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {onCreateGroup && (
          <div className="border-t border-border/80 bg-background/60 p-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Crear nuevo grupo
            </p>
            <Input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Nombre del grupo"
              className="h-9"
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={handleCreateGroup}
              disabled={isCreating || !newGroupName.trim()}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              Crear y seleccionar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
