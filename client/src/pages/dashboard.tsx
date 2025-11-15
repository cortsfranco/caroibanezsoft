import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, Activity, Scale, TrendingUp, PieChart as PieIcon, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_TYPES, ChartType, getAllVividColors } from "@/lib/chart-colors";
import { getObjectiveBadgeClasses, getObjectiveLabel, normalizeObjective } from "@/lib/objectives";
import { Separator } from "@/components/ui/separator";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { getDefaultTimeRange, getTimeRangeKey, rangeToQueryParams, type TimeRangeValue } from "@/lib/time-range";
import type { MeasurementCalculation } from "@shared/schema";

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

interface MeasurementWithPatient {
  id: string;
  patientId: string | null;
  measurementDate: string;
  weight: string | null;
  notes: string | null;
  patient?: { id: string | null; name: string | null; objective: string | null } | null;
  calculations?: MeasurementCalculation | null;
}

const CHART_BACKGROUND = "#0f1d32";
const GRID_COLOR = "rgba(148, 163, 184, 0.25)";
const AXIS_COLOR = "#cbd5f5";
const PRIMARY_LINE = "#7dd3fc";
const SECONDARY_LINE = "#38bdf8";
const PIE_COLORS = getAllVividColors();

const delayStyle = (step: number): React.CSSProperties => ({
  ["--caro-anim-delay" as any]: `${step.toFixed(2)}s`,
});

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => getDefaultTimeRange());
  const [patientChartType, setPatientChartType] = useState<ChartType>("bar");
  const [measurementChartType, setMeasurementChartType] = useState<ChartType>("line");

  const rangeKey = getTimeRangeKey(timeRange);

  const { data: statistics = [], isLoading } = useQuery<GroupStatistics[]>({
    queryKey: ["/api/dashboard/statistics", rangeKey],
    queryFn: async () => {
      const params = new URLSearchParams(rangeToQueryParams(timeRange));
      const query = params.toString();
      const response = await fetch(`/api/dashboard/statistics${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard statistics");
      return response.json();
    },
  });

  const { data: measurements = [] } = useQuery<MeasurementWithPatient[]>({
    queryKey: ["/api/measurements", { rangeKey }],
    queryFn: async () => {
      const params = new URLSearchParams(rangeToQueryParams(timeRange));
      const query = params.toString();
      const response = await fetch(`/api/measurements${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
  });

  const latestMeasurementsByPatient = useMemo(() => {
    const latestMap = new Map<string, MeasurementWithPatient>();
    measurements.forEach((measurement) => {
      if (!measurement.patientId) return;
      const existing = latestMap.get(measurement.patientId);
      if (!existing || new Date(measurement.measurementDate) > new Date(existing.measurementDate)) {
        latestMap.set(measurement.patientId, measurement);
      }
    });
    return latestMap;
  }, [measurements]);

  const patientsWithMeasurements = latestMeasurementsByPatient.size;

  const averageBodyFat = useMemo(() => {
    let sum = 0;
    let count = 0;
    latestMeasurementsByPatient.forEach((measurement) => {
      const fat = measurement.calculations?.bodyFatPercentage ? parseFloat(measurement.calculations.bodyFatPercentage) : null;
      if (typeof fat === "number" && !Number.isNaN(fat)) {
        sum += fat;
        count += 1;
      }
    });
    return count > 0 ? Number((sum / count).toFixed(1)) : null;
  }, [latestMeasurementsByPatient]);

  const averageLeanMass = useMemo(() => {
    let sum = 0;
    let count = 0;
    latestMeasurementsByPatient.forEach((measurement) => {
      const lean = measurement.calculations?.leanMass ? parseFloat(measurement.calculations.leanMass) : null;
      if (typeof lean === "number" && !Number.isNaN(lean)) {
        sum += lean;
        count += 1;
      }
    });
    return count > 0 ? Number((sum / count).toFixed(1)) : null;
  }, [latestMeasurementsByPatient]);

  const groupComparisonData = useMemo(() => (
    statistics.map((stat) => ({
      grupo: stat.groupName,
      pacientes: stat.patientCount,
      mediciones: stat.measurementCount,
      peso: stat.avgWeight ? Number(stat.avgWeight.toFixed(1)) : null,
      imc: stat.avgBMI ? Number(stat.avgBMI.toFixed(1)) : null,
      cintura: stat.avgWaist ? Number(stat.avgWaist.toFixed(1)) : null,
    }))
  ), [statistics]);

  const totalPatients = statistics.reduce((sum, stat) => sum + stat.patientCount, 0);
  const totalMeasurements = statistics.reduce((sum, stat) => sum + stat.measurementCount, 0);
  const groupsWithData = statistics.filter((stat) => stat.measurementCount > 0).length;

  const summaryCards = [
    {
      title: "Pacientes activos",
      icon: <Users className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/15",
      value: totalPatients,
      subtitle: `${statistics.length} grupos registrados` ,
      suffix: "",
    },
    {
      title: "Con medición reciente",
      icon: <Activity className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-[hsla(var(--caro-pink)/0.15)] text-[hsla(var(--caro-pink)/0.9)] dark:bg-[hsla(var(--caro-pink)/0.45)]",
      value: patientsWithMeasurements,
      subtitle: `${totalMeasurements} mediciones totales`,
      suffix: "",
    },
    {
      title: "% Grasa corporal promedio",
      icon: <PieIcon className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/15",
      value: averageBodyFat !== null ? averageBodyFat : "-",
      subtitle: "Últimas mediciones por paciente",
      suffix: averageBodyFat !== null ? " %" : "",
    },
    {
      title: "Masa magra promedio",
      icon: <Scale className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/15",
      value: averageLeanMass !== null ? averageLeanMass : "-",
      subtitle: "Kg promedio en la medición más reciente",
      suffix: averageLeanMass !== null ? " kg" : "",
    },
  ];

  const objectiveDistribution = useMemo(() => {
    const counts: Record<string, { total: number; fatSum: number; fatCount: number; leanSum: number; leanCount: number }> = {};

    latestMeasurementsByPatient.forEach((measurement) => {
      const normalizedObjective = normalizeObjective(measurement.patient?.objective ?? undefined);
      const key = normalizedObjective ?? "sin-objetivo";
      if (!counts[key]) {
        counts[key] = { total: 0, fatSum: 0, fatCount: 0, leanSum: 0, leanCount: 0 };
      }
      counts[key].total += 1;
      const fat = measurement.calculations?.bodyFatPercentage ? parseFloat(measurement.calculations.bodyFatPercentage) : null;
      const lean = measurement.calculations?.leanMass ? parseFloat(measurement.calculations.leanMass) : null;
      if (typeof fat === "number" && !Number.isNaN(fat)) {
        counts[key].fatSum += fat;
        counts[key].fatCount += 1;
      }
      if (typeof lean === "number" && !Number.isNaN(lean)) {
        counts[key].leanSum += lean;
        counts[key].leanCount += 1;
      }
    });

    return Object.entries(counts).map(([key, value]) => {
      const isUndefinedObjective = key === "sin-objetivo";
      const label = isUndefinedObjective
        ? "Sin objetivo"
        : key === "loss"
          ? getObjectiveLabel("loss")
          : key === "gain"
            ? getObjectiveLabel("gain")
            : getObjectiveLabel("maintain");
      const badgeClass = isUndefinedObjective
        ? "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800"
        : key === "loss"
          ? getObjectiveBadgeClasses("loss")
          : key === "gain"
            ? getObjectiveBadgeClasses("gain")
            : getObjectiveBadgeClasses("maintain");

      return {
        key,
        label,
        badgeClass,
        total: value.total,
        avgFat: value.fatCount > 0 ? Number((value.fatSum / value.fatCount).toFixed(1)) : null,
        avgLean: value.leanCount > 0 ? Number((value.leanSum / value.leanCount).toFixed(1)) : null,
      };
    });
  }, [latestMeasurementsByPatient]);

  const objectiveTimeline = useMemo(() => {
    const timelineMap = new Map<string, { loss: number[]; gain: number[]; maintain: number[] }>();
    measurements
      .slice()
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .forEach((measurement) => {
        const dateLabel = new Date(measurement.measurementDate).toLocaleDateString();
        if (!timelineMap.has(dateLabel)) {
          timelineMap.set(dateLabel, { loss: [], gain: [], maintain: [] });
        }
        const entry = timelineMap.get(dateLabel)!;
        const weightValue = measurement.weight ? parseFloat(measurement.weight) : null;
        const normalized = normalizeObjective(measurement.patient?.objective ?? undefined);
        if (weightValue === null || Number.isNaN(weightValue) || !normalized) return;
        entry[normalized].push(weightValue);
      });

    return Array.from(timelineMap.entries()).map(([date, entry]) => ({
      date,
      perdida: entry.loss.length ? Number((entry.loss.reduce((sum, weight) => sum + weight, 0) / entry.loss.length).toFixed(1)) : null,
      mantenimiento: entry.maintain.length ? Number((entry.maintain.reduce((sum, weight) => sum + weight, 0) / entry.maintain.length).toFixed(1)) : null,
      ganancia: entry.gain.length ? Number((entry.gain.reduce((sum, weight) => sum + weight, 0) / entry.gain.length).toFixed(1)) : null,
    }));
  }, [measurements]);

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

  const renderComparisonChart = (type: ChartType, dataKey: "pacientes" | "mediciones", color: string) => {
    const data = groupComparisonData.filter(item => item[dataKey] !== null);

    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
            <XAxis dataKey="grupo" tick={{ fill: AXIS_COLOR, fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis tick={{ fill: AXIS_COLOR }} stroke={GRID_COLOR} />
            <Tooltip contentStyle={{ backgroundColor: CHART_BACKGROUND, border: "1px solid #1e3765", borderRadius: "8px", color: "white" }} />
            <Legend wrapperStyle={{ color: AXIS_COLOR }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
            <XAxis dataKey="grupo" tick={{ fill: AXIS_COLOR, fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis tick={{ fill: AXIS_COLOR }} stroke={GRID_COLOR} />
            <Tooltip contentStyle={{ backgroundColor: CHART_BACKGROUND, border: "1px solid #1e3765", borderRadius: "8px", color: "white" }} />
            <Legend wrapperStyle={{ color: AXIS_COLOR }} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#gradient-${dataKey})`} />
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart>
            <Tooltip contentStyle={{ backgroundColor: CHART_BACKGROUND, border: "1px solid #1e3765", borderRadius: "8px", color: "white" }} />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="grupo"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.grupo}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case "bar":
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
            <XAxis dataKey="grupo" tick={{ fill: AXIS_COLOR, fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis tick={{ fill: AXIS_COLOR }} stroke={GRID_COLOR} />
            <Tooltip contentStyle={{ backgroundColor: CHART_BACKGROUND, border: "1px solid #1e3765", borderRadius: "8px", color: "white" }} />
            <Legend wrapperStyle={{ color: AXIS_COLOR }} />
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="caro-animate" style={delayStyle(0)}>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[hsla(var(--caro-pink)/0.85)]">
          <TrendingUp className="h-3.5 w-3.5" />
          Panorama General
        </span>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-dashboard-title">
          Dashboard de Estadísticas
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualización de datos agregados por grupos de pacientes
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-xs text-muted-foreground">
          Filtrar informes por rango temporal
        </p>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <Card
            key={card.title}
            className="shadow-lg caro-animate-rise text-slate-900 dark:text-white"
            style={delayStyle(0.08 + index * 0.08)}
          >
            <CardHeader className="space-y-4 pb-0">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
                  {card.title}
                </CardTitle>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-lg ${card.iconBg}`}>
                  {card.icon}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold leading-none text-slate-900 dark:text-white">
                  {card.value}
                  {card.suffix}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-white/80">
                <span className="h-2 w-2 rounded-full bg-[hsla(var(--caro-pink)/0.9)] shadow-[0_0_0_3px_rgba(255,255,255,0.18)]" />
                <span>{card.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl caro-animate-rise text-slate-900 dark:text-white" style={delayStyle(0.32)}>
          <CardHeader className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="h-5 w-5 text-slate-600 dark:text-white" />
                Evolución del peso por objetivo
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-white/80">
                Promedio de peso en kg según el objetivo de cada paciente.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={objectiveTimeline}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fill: AXIS_COLOR }} stroke={GRID_COLOR} />
                <Tooltip contentStyle={{ backgroundColor: CHART_BACKGROUND, border: "1px solid #1e3765", borderRadius: "8px", color: "white" }} />
                <Legend wrapperStyle={{ color: AXIS_COLOR }} />
                <Line type="monotone" dataKey="perdida" stroke="#f87171" strokeWidth={3} dot={{ r: 3 }} name="Pérdida" />
                <Line type="monotone" dataKey="mantenimiento" stroke="#34d399" strokeWidth={3} dot={{ r: 3 }} name="Mantenimiento" />
                <Line type="monotone" dataKey="ganancia" stroke="#fb923c" strokeWidth={3} dot={{ r: 3 }} name="Ganancia" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl caro-animate-rise text-slate-900 dark:text-white" style={delayStyle(0.36)}>
          <CardHeader className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <PieIcon className="h-5 w-5 text-slate-600 dark:text-white" />
                Balance por objetivo
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-white/80">
                Pacientes, % grasa y masa magra promedio de la última medición.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectiveDistribution.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aún no hay mediciones recientes para mostrar.</p>
            ) : (
              <div className="space-y-3">
                {objectiveDistribution.map((item) => (
                  <div key={item.key} className="rounded-xl border border-white/10 bg-white/60 p-4 shadow-sm dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${item.badgeClass}`}>
                          {item.label}
                        </span>
                        <span className="text-sm text-muted-foreground">{item.total} pacientes</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{
                        item.avgFat !== null ? `${item.avgFat}% grasa` : "-"
                      }</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Grasa corporal promedio</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{item.avgFat !== null ? `${item.avgFat}%` : "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Masa magra promedio</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{item.avgLean !== null ? `${item.avgLean} kg` : "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl caro-animate-rise text-slate-900 dark:text-white" style={delayStyle(0.42)}>
          <CardHeader className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="h-5 w-5 text-slate-600 dark:text-white" />
                Distribución de Pacientes por Grupo
              </CardTitle>
              <p className="text-xs text-slate-600 dark:text-white/80">
                Seleccioná el tipo de visualización para comparar los grupos.
              </p>
            </div>
            <Select value={patientChartType} onValueChange={(value: ChartType) => setPatientChartType(value)}>
              <SelectTrigger className="w-36 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[hsla(var(--caro-pink)/0.35)] dark:border-white/30 dark:bg-white/10 dark:text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="border border-slate-200 bg-white text-slate-700 shadow-2xl dark:border-white/15 dark:bg-[#13284b]/90 dark:text-white">
                {Object.values(CHART_TYPES).map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderComparisonChart(patientChartType, "pacientes", PRIMARY_LINE)}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl caro-animate-rise text-slate-900 dark:text-white" style={delayStyle(0.5)}>
          <CardHeader className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Activity className="h-5 w-5 text-slate-600 dark:text-white" />
                Mediciones Registradas por Grupo
              </CardTitle>
              <p className="text-xs text-slate-600 dark:text-white/80">
                Visualizá la carga de mediciones según el grupo.
              </p>
            </div>
            <Select value={measurementChartType} onValueChange={(value: ChartType) => setMeasurementChartType(value)}>
              <SelectTrigger className="w-36 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[hsla(var(--caro-pink)/0.35)] dark:border-white/30 dark:bg-white/10 dark:text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="border border-slate-200 bg-white text-slate-700 shadow-2xl dark:border-white/15 dark:bg-[#13284b]/90 dark:text-white">
                {Object.values(CHART_TYPES).map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderComparisonChart(measurementChartType, "mediciones", SECONDARY_LINE)}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
