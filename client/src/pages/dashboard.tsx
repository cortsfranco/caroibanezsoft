import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, Activity, Scale, TrendingUp } from "lucide-react";

interface GroupStatistics {
  groupId: string;
  groupName: string;
  patientCount: number;
  measurementCount: number;
  avgWeight: number | null;
  avgHeight: number | null;
  avgBMI: number | null;
  avgWaist: number | null;
  weightTrend: { date: string; value: number }[];
  bmiTrend: { date: string; value: number }[];
}

export default function Dashboard() {
  const { data: statistics = [], isLoading } = useQuery<GroupStatistics[]>({
    queryKey: ["/api/dashboard/statistics"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Prepare data for comparison charts
  const groupComparisonData = statistics.map((stat) => ({
    grupo: stat.groupName,
    pacientes: stat.patientCount,
    mediciones: stat.measurementCount,
    peso: stat.avgWeight ? Number(stat.avgWeight.toFixed(1)) : null,
    imc: stat.avgBMI ? Number(stat.avgBMI.toFixed(1)) : null,
    cintura: stat.avgWaist ? Number(stat.avgWaist.toFixed(1)) : null,
  }));

  // Calculate totals
  const totalPatients = statistics.reduce((sum, stat) => sum + stat.patientCount, 0);
  const totalMeasurements = statistics.reduce((sum, stat) => sum + stat.measurementCount, 0);
  const groupsWithData = statistics.filter((stat) => stat.measurementCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
          Dashboard de Estadísticas
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualización de datos agregados por grupos de pacientes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.length}</div>
            <p className="text-xs text-muted-foreground">
              {groupsWithData} con mediciones
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Distribuidos en {statistics.length} grupos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mediciones</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeasurements}</div>
            <p className="text-xs text-muted-foreground">
              {totalPatients > 0 ? (totalMeasurements / totalPatients).toFixed(1) : 0} promedio/paciente
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Promedio Global</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.length > 0
                ? (
                    statistics.reduce((sum, s) => sum + (s.avgWeight || 0), 0) /
                    statistics.filter((s) => s.avgWeight !== null).length
                  ).toFixed(1)
                : "-"}{" "}
              kg
            </div>
            <p className="text-xs text-muted-foreground">Entre todos los grupos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Patient Count */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Distribución de Pacientes por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupComparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="grupo"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="pacientes"
                  fill="hsl(var(--primary))"
                  name="Pacientes"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group Measurement Count */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Mediciones Registradas por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupComparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="grupo"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="mediciones"
                  fill="hsl(var(--chart-2))"
                  name="Mediciones"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Weight Comparison */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Peso Promedio por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupComparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="grupo"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="peso"
                  fill="hsl(var(--chart-3))"
                  name="Peso (kg)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average BMI Comparison */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              IMC Promedio por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupComparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="grupo"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  domain={["dataMin - 2", "dataMax + 2"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="imc"
                  fill="hsl(var(--chart-4))"
                  name="IMC"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trends by Group */}
      {statistics.filter((stat) => stat.weightTrend.length > 0).length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Tendencias Temporales por Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {statistics
                .filter((stat) => stat.weightTrend.length > 0)
                .map((stat) => (
                  <div key={stat.groupId}>
                    <h3 className="text-lg font-semibold mb-4">{stat.groupName}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={stat.weightTrend.map((point, idx) => ({
                          date: new Date(point.date).toLocaleDateString("es-ES", {
                            month: "short",
                            year: "2-digit",
                          }),
                          peso: point.value,
                          imc: stat.bmiTrend[idx]?.value || null,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          yAxisId="left"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="peso"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          name="Peso Promedio (kg)"
                          dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="imc"
                          stroke="hsl(var(--chart-4))"
                          strokeWidth={2}
                          name="IMC Promedio"
                          dot={{ fill: "hsl(var(--chart-4))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
