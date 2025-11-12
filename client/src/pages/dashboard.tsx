import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ruler, Calendar, TrendingUp } from "lucide-react";
import { AreaChart, BarChart, DonutChart } from "@tremor/react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Pacientes",
      value: "47",
      icon: Users,
      description: "5 nuevos este mes",
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Mediciones Pendientes",
      value: "8",
      icon: Ruler,
      description: "Programadas esta semana",
    },
    {
      title: "Próximas Citas",
      value: "12",
      icon: Calendar,
      description: "Esta semana",
    },
    {
      title: "Tasa de Éxito",
      value: "87%",
      icon: TrendingUp,
      description: "Objetivos alcanzados",
      trend: { value: 5, isPositive: true },
    },
  ];

  const evolutionData = [
    { mes: "Ene", pacientes: 32 },
    { mes: "Feb", pacientes: 35 },
    { mes: "Mar", pacientes: 38 },
    { mes: "Abr", pacientes: 42 },
    { mes: "May", pacientes: 45 },
    { mes: "Jun", pacientes: 47 },
  ];

  const groupData = [
    { grupo: "Consultorio", pacientes: 28 },
    { grupo: "Gimnasia", pacientes: 12 },
    { grupo: "Fútbol", pacientes: 7 },
  ];

  const objectiveData = [
    { nombre: "Pérdida de peso", value: 25 },
    { nombre: "Ganancia muscular", value: 15 },
    { nombre: "Mantenimiento", value: 7 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general de tu práctica nutricional
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={evolutionData}
              index="mes"
              categories={["pacientes"]}
              colors={["blue"]}
              valueFormatter={(value) => `${value} pacientes`}
              showLegend={false}
              showGridLines={false}
              className="h-72"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Grupos</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={groupData}
              index="grupo"
              categories={["pacientes"]}
              colors={["blue"]}
              valueFormatter={(value) => `${value}`}
              showLegend={false}
              className="h-72"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos de Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <DonutChart
              data={objectiveData}
              category="value"
              index="nombre"
              colors={["blue", "green", "gray"]}
              className="h-72"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
