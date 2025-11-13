import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Activity, Scale, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_TYPES, ChartType, getAllVividColors } from "@/lib/chart-colors";

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

const CHART_BACKGROUND = "#0f1d32";
const GRID_COLOR = "rgba(148, 163, 184, 0.25)";
const AXIS_COLOR = "#cbd5f5";
const PRIMARY_LINE = "#7dd3fc";
const SECONDARY_LINE = "#38bdf8";
const PIE_COLORS = getAllVividColors();

const delayStyle = (step: number): CSSProperties => ({
  ["--caro-anim-delay" as const]: `${step.toFixed(2)}s`,
});

export default function Dashboard() {
  const { data: statistics = [], isLoading } = useQuery<GroupStatistics[]>({
    queryKey: ["/api/dashboard/statistics"],
  });
  const [patientChartType, setPatientChartType] = useState<ChartType>("bar");
  const [measurementChartType, setMeasurementChartType] = useState<ChartType>("line");

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
      title: "Total Grupos",
      icon: <Users className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/15",
      value: statistics.length,
      subtitle: `${groupsWithData} con mediciones`,
      suffix: "",
    },
    {
      title: "Total Pacientes",
      icon: <Users className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-[hsla(var(--caro-pink)/0.15)] text-[hsla(var(--caro-pink)/0.9)] dark:bg-[hsla(var(--caro-pink)/0.45)]",
      value: totalPatients,
      subtitle: `Distribuidos en ${statistics.length} grupos`,
      suffix: "",
    },
    {
      title: "Total Mediciones",
      icon: <Activity className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/12",
      value: totalMeasurements,
      subtitle: `${totalPatients > 0 ? (totalMeasurements / totalPatients).toFixed(1) : 0} promedio/paciente`,
      suffix: "",
    },
    {
      title: "Peso Promedio Global",
      icon: <Scale className="h-4 w-4 text-slate-600 dark:text-white" />,
      iconBg: "bg-white/80 text-slate-700 dark:bg-white/15",
      value: statistics.length > 0
        ? (
            statistics.reduce((sum, s) => sum + (s.avgWeight || 0), 0) /
            statistics.filter((s) => s.avgWeight !== null).length
          ).toFixed(1)
        : "-",
      subtitle: "Entre todos los grupos",
      suffix: " kg",
    },
  ];

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
