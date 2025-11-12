import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import type { Patient } from "@shared/schema";

interface ExcelImportExportProps {
  patients: Patient[];
}

export function ExcelImportExport({ patients }: ExcelImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (patientsData: any[]) => {
      const promises = patientsData.map((data) =>
        apiRequest("POST", "/api/patients", data)
      );
      return await Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${results.length} pacientes correctamente`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la importación",
        description: error.message || "No se pudieron importar los pacientes",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    try {
      const exportData = patients.map((p) => ({
        Nombre: p.name,
        Email: p.email || "",
        Teléfono: p.phone || "",
        "Fecha de Nacimiento": p.birthDate ? new Date(p.birthDate).toLocaleDateString() : "",
        Género: p.gender === "M" ? "Masculino" : p.gender === "F" ? "Femenino" : "Otro",
        Objetivo: p.objective || "",
        Notas: p.notes || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pacientes_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${patients.length} pacientes a Excel`,
      });
    } catch (error) {
      toast({
        title: "Error en la exportación",
        description: "No se pudo exportar a Excel",
        variant: "destructive",
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const patientsData = jsonData.map((row: any) => {
          const birthDate = row["Fecha de Nacimiento"]
            ? new Date(row["Fecha de Nacimiento"]).toISOString()
            : null;

          let gender = "";
          if (row["Género"]) {
            const g = row["Género"].toLowerCase();
            if (g.includes("masc")) gender = "M";
            else if (g.includes("fem")) gender = "F";
            else gender = "Other";
          }

          return {
            name: row["Nombre"] || "",
            email: row["Email"] || null,
            phone: row["Teléfono"] || null,
            birthDate,
            gender: gender || null,
            objective: row["Objetivo"] || null,
            notes: row["Notas"] || null,
          };
        });

        const validPatients = patientsData.filter((p) => p.name.trim() !== "");

        if (validPatients.length === 0) {
          toast({
            title: "Error",
            description: "No se encontraron pacientes válidos en el archivo",
            variant: "destructive",
          });
          return;
        }

        importMutation.mutate(validPatients);
      } catch (error) {
        toast({
          title: "Error al leer el archivo",
          description: "El archivo Excel no tiene el formato correcto",
          variant: "destructive",
        });
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
        data-testid="input-excel-import"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={importMutation.isPending}
        data-testid="button-import-excel"
      >
        <Upload className="h-4 w-4 mr-2" />
        {importMutation.isPending ? "Importando..." : "Importar Excel"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={patients.length === 0}
        data-testid="button-export-excel"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar Excel
      </Button>
    </div>
  );
}
