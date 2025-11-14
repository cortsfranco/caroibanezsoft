import { useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BarChart2, Users, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getObjectiveBadgeClasses, getObjectiveLabel, normalizeObjective } from "@/lib/objectives";
import type { Patient, PatientGroup } from "@shared/schema";

interface GroupMembership {
  id: string;
  patientId: string | null;
  groupId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface MeasurementWithMeta {
  id: string;
  patientId: string;
  measurementDate: string;
  weight: string | null;
  height: string | null;
  notes: string | null;
  calculations?: {
    bodyFatPercentage: string | null;
    leanMass: string | null;
    adiposeMassKg: string | null;
    muscleMassKg: string | null;
  } | null;
}

interface GroupInsightsResponse {
  group: PatientGroup;
  memberships: GroupMembership[];
  patients: Patient[];
  measurementsByPatient: Record<string, MeasurementWithMeta[]>;
}

function computeLatestMeasurement(measurements: MeasurementWithMeta[]): MeasurementWithMeta | null {
  if (!measurements || measurements.length === 0) return null;
  return [...measurements].sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())[0];
}

const PIE_COLORS = ["#38bdf8", "#f472b6", "#34d399", "#f97316", "#c084fc"]; // consistent palette

export default function GroupDetailPage() {
  const [, params] = useRoute("/grupos/:id");
  const [, setLocation] = useLocation();
  const groupId = params?.id ?? "";

  const { data, isLoading } = useQuery<GroupInsightsResponse | null>({
    queryKey: ["/api/groups", groupId, "insights"],
    enabled: Boolean(groupId),
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/insights`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to load group insights");
      }
      return response.json();
    },
  });

  const patientSummaries = useMemo(() => {
    if (!data) return [] as Array<{
      patient: Patient;
      latestMeasurement: MeasurementWithMeta | null;
      trend: Array<{ date: string; weight: number | null; fat: number | null; lean: number | null }>;
    }>;

    return data.patients.map((patient) => {
      const measurements = data.measurementsByPatient[patient.id] ?? [];
      const latestMeasurement = computeLatestMeasurement(measurements);
      const trend = measurements
        .slice()
        .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
        .map((measurement) => ({
          date: new Date(measurement.measurementDate).toLocaleDateString(),
          weight: measurement.weight ? parseFloat(measurement.weight) : null,
          fat: measurement.calculations?.bodyFatPercentage ? parseFloat(measurement.calculations.bodyFatPercentage) : null,
          lean: measurement.calculations?.leanMass ? parseFloat(measurement.calculations.leanMass) : null,
        }));

      return { patient, latestMeasurement, trend };
    });
  }, [data]);

  const objectiveDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const summary of patientSummaries) {
      const normalized = normalizeObjective(summary.patient.objective ?? undefined);
      const key = normalized ?? "sin-objetivo";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([key, value]) => ({
      key,
      label: key === "sin-objetivo" ? "Sin objetivo" : getObjectiveLabel(key),
      value,
    }));
  }, [patientSummaries]);

  const weightTimeline = useMemo(() => {
    const aggregateMap = new Map<string, { weightSum: number; weightCount: number; fatSum: number; fatCount: number }>();
    patientSummaries.forEach(({ trend }) => {
      trend.forEach(({ date, weight, fat }) => {
        if (!aggregateMap.has(date)) {
          aggregateMap.set(date, { weightSum: 0, weightCount: 0, fatSum: 0, fatCount: 0 });
        }
        const entry = aggregateMap.get(date)!;
        if (typeof weight === "number" && !Number.isNaN(weight)) {
          entry.weightSum += weight;
          entry.weightCount += 1;
        }
        if (typeof fat === "number" && !Number.isNaN(fat)) {
          entry.fatSum += fat;
          entry.fatCount += 1;
        }
      });
    });

    return Array.from(aggregateMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, entry]) => ({
        date,
        pesoPromedio: entry.weightCount > 0 ? Number((entry.weightSum / entry.weightCount).toFixed(1)) : null,
        grasaPromedio: entry.fatCount > 0 ? Number((entry.fatSum / entry.fatCount).toFixed(1)) : null,
      }));
  }, [patientSummaries]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setLocation("/grupos")}>Volver</Button>
        <Card>
          <CardHeader>
            <CardTitle>Grupo no encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No pudimos encontrar información para este grupo. Verificá el enlace o volvé a la lista.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { group } = data;
  const totalMembers = patientSummaries.length;
  const activeMembers = totalMembers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 inline-flex items-center gap-2 text-muted-foreground" onClick={() => setLocation("/grupos")}> 
            <ArrowLeft className="h-4 w-4" /> Volver a grupos
          </Button>
          <h1 className="text-3xl font-heading font-semibold text-foreground">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 text-sm">
            <Users className="h-4 w-4" /> {totalMembers} pacientes
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 text-sm">
            <Activity className="h-4 w-4" /> {weightTimeline.length} registros
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5 text-primary" /> Evolución del grupo</CardTitle>
            <CardDescription>
              Promedios de peso y porcentaje de grasa a lo largo del tiempo entre los integrantes del grupo.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pesoPromedio" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Peso promedio (kg)" />
                <Line type="monotone" dataKey="grasaPromedio" stroke="#f472b6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="% grasa promedio" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por objetivo</CardTitle>
            <CardDescription>Conocé cómo se distribuyen los objetivos nutricionales dentro del grupo.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={objectiveDistribution} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={6}> 
                  {objectiveDistribution.map((entry, index) => (
                    <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {objectiveDistribution.map((entry, index) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    {entry.label}
                  </span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Pacientes del grupo</CardTitle>
          <CardDescription>
            Resumen de los indicadores principales por paciente y su última medición registrada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeMembers === 0 ? (
            <p className="text-muted-foreground">Todavía no hay pacientes asignados a este grupo.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objetivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Última medición</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peso (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">% Grasa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Masa magra (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {patientSummaries.map(({ patient, latestMeasurement }) => (
                    <tr key={patient.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {patient.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {patient.objective ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getObjectiveBadgeClasses(patient.objective)}`}>
                            {getObjectiveLabel(patient.objective)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin objetivo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {latestMeasurement ? new Date(latestMeasurement.measurementDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {latestMeasurement?.weight ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {latestMeasurement?.calculations?.bodyFatPercentage ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {latestMeasurement?.calculations?.leanMass ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
