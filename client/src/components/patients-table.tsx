import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
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
import { ArrowUpDown, Search } from "lucide-react";
import { useAutosave } from "@/hooks/use-autosave";
import type { Patient } from "@shared/schema";

interface EditableCellProps {
  value: any;
  row: any;
  column: any;
  table: any;
}

function EditableCell({ value: initialValue, row, column, table }: EditableCellProps) {
  const [value, setValue] = useState(initialValue || "");
  const columnId = column.id;
  const patientId = row.original.id;

  const { save } = useAutosave({
    endpoint: `/api/patients/${patientId}`,
    method: "PATCH",
    debounceMs: 1000,
    invalidateQueries: [["/api/patients"]],
  });

  const handleChange = (newValue: string) => {
    setValue(newValue);
    save({ [columnId]: newValue });
  };

  if (columnId === "objective") {
    return (
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full border-0 focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pérdida">Pérdida</SelectItem>
          <SelectItem value="ganancia">Ganancia</SelectItem>
          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-2"
      data-testid={`input-${columnId}-${patientId}`}
    />
  );
}

interface PatientsTableProps {
  patients: Patient[];
}

export function PatientsTable({ patients }: PatientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover-elevate active-elevate-2"
            >
              Nombre
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row, column, table }) => (
          <EditableCell
            value={row.getValue("name")}
            row={row}
            column={column}
            table={table}
          />
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row, column, table }) => (
          <EditableCell
            value={row.getValue("email")}
            row={row}
            column={column}
            table={table}
          />
        ),
      },
      {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row, column, table }) => (
          <EditableCell
            value={row.getValue("phone")}
            row={row}
            column={column}
            table={table}
          />
        ),
      },
      {
        accessorKey: "objective",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover-elevate active-elevate-2"
            >
              Objetivo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row, column, table }) => (
          <EditableCell
            value={row.getValue("objective")}
            row={row}
            column={column}
            table={table}
          />
        ),
      },
      {
        accessorKey: "notes",
        header: "Notas",
        cell: ({ row, column, table }) => (
          <EditableCell
            value={row.getValue("notes")}
            row={row}
            column={column}
            table={table}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover-elevate active-elevate-2"
            >
              Fecha de Registro
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as Date;
          return <div className="px-2">{new Date(date).toLocaleDateString()}</div>;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
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
        <div className="flex gap-2">
          <Select
            value={(table.getColumn("objective")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn("objective")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[180px]" data-testid="select-objective-filter">
              <SelectValue placeholder="Filtrar por objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pérdida">Pérdida</SelectItem>
              <SelectItem value="ganancia">Ganancia</SelectItem>
              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  data-testid={`row-patient-${row.original.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron pacientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Mostrando {table.getFilteredRowModel().rows.length} de {patients.length} pacientes
        </div>
      </div>
    </div>
  );
}
