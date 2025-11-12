import { useState } from "react";
import { DietCard } from "@/components/diet-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

export default function Diets() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockDiets = [
    {
      id: "1",
      name: "Plan Deportivo Alta Intensidad",
      calories: 2800,
      protein: 175,
      carbs: 320,
      fats: 85,
      tags: ["Deportivo", "Alta Intensidad"],
      description: "Plan nutricional para deportistas de alto rendimiento con entrenamiento intenso",
    },
    {
      id: "2",
      name: "Pérdida de Peso Moderada",
      calories: 1800,
      protein: 120,
      carbs: 180,
      fats: 60,
      tags: ["Pérdida de Peso", "Balanceado"],
      description: "Déficit calórico controlado para pérdida de peso gradual y sostenible",
    },
    {
      id: "3",
      name: "Ganancia Muscular",
      calories: 3200,
      protein: 200,
      carbs: 400,
      fats: 90,
      tags: ["Ganancia", "Hipertrofia"],
      description: "Superávit calórico optimizado para ganancia de masa muscular",
    },
    {
      id: "4",
      name: "Mantenimiento Saludable",
      calories: 2200,
      protein: 140,
      carbs: 250,
      fats: 70,
      tags: ["Mantenimiento", "Salud General"],
      description: "Plan equilibrado para mantenimiento de peso y salud general",
    },
    {
      id: "5",
      name: "Plan Vegetariano",
      calories: 2000,
      protein: 110,
      carbs: 260,
      fats: 65,
      tags: ["Vegetariano", "Pérdida de Peso"],
      description: "Dieta basada en plantas con adecuado aporte proteico",
    },
    {
      id: "6",
      name: "Deportista Resistencia",
      calories: 3000,
      protein: 150,
      carbs: 450,
      fats: 75,
      tags: ["Deportivo", "Resistencia"],
      description: "Alto contenido de carbohidratos para deportes de resistencia",
    },
  ];

  const filteredDiets = mockDiets.filter((diet) =>
    diet.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Biblioteca de Dietas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus plantillas de planes nutricionales
          </p>
        </div>
        <Button data-testid="button-add-diet">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Dieta
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar dieta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-diet"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiets.map((diet) => (
          <DietCard key={diet.id} {...diet} />
        ))}
      </div>

      {filteredDiets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No se encontraron dietas con el término de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}
