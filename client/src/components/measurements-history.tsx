import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Scale, Ruler } from "lucide-react";

interface Measurement {
  id: string;
  patientId: string;
  measurementDate: string;
  weight: number | null;
  height: number | null;
  seatedHeight: number | null;
  biacromial: number | null;
  thoraxTransverse: number | null;
  thoraxAnteroposterior: number | null;
  biiliocristideo: number | null;
  humeral: number | null;
  femoral: number | null;
  head: number | null;
  relaxedArm: number | null;
  flexedArm: number | null;
  forearm: number | null;
  thoraxCirc: number | null;
  waist: number | null;
  hip: number | null;
  thighSuperior: number | null;
  thighMedial: number | null;
  calf: number | null;
  triceps: number | null;
  subscapular: number | null;
  supraspinal: number | null;
  abdominal: number | null;
  thighSkinfold: number | null;
  calfSkinfold: number | null;
  notes: string | null;
  version: number;
}

interface MeasurementsHistoryProps {
  patientId: string;
}

export function MeasurementsHistory({ patientId }: MeasurementsHistoryProps) {
  const { data: measurements = [], isLoading } = useQuery<Measurement[]>({
    queryKey: ["/api/measurements", { patientId }],
    queryFn: async () => {
      const response = await fetch(`/api/measurements?patientId=${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
    enabled: !!patientId,
  });

  // Sort measurements by date (newest first)
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
  );

  // Prepare chart data (reverse for chronological order in chart)
  const chartData = [...sortedMeasurements].reverse().map((m) => ({
    date: new Date(m.measurementDate).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    }),
    peso: m.weight,
    imc: m.weight && m.height ? (m.weight / ((m.height / 100) ** 2)).toFixed(1) : null,
    cintura: m.waist,
    cadera: m.hip,
  }));

  // Calculate BMI for each measurement
  const calculateBMI = (weight: number | null, height: number | null) => {
    if (!weight || !height) return null;
    return (weight / ((height / 100) ** 2)).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (sortedMeasurements.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Historial de Mediciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay mediciones registradas para este paciente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Evolución del Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="peso" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Peso (kg)"
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* BMI Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Índice de Masa Corporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="imc" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="IMC"
                  dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Waist/Hip Chart */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              Perímetros: Cintura y Cadera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="cintura" 
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3) / 0.2)"
                  strokeWidth={2}
                  name="Cintura (cm)"
                />
                <Area 
                  type="monotone" 
                  dataKey="cadera" 
                  stroke="hsl(var(--chart-4))" 
                  fill="hsl(var(--chart-4) / 0.2)"
                  strokeWidth={2}
                  name="Cadera (cm)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Registro Detallado de Mediciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Talla (cm)</TableHead>
                  <TableHead className="text-right">IMC</TableHead>
                  <TableHead className="text-right">Cintura (cm)</TableHead>
                  <TableHead className="text-right">Cadera (cm)</TableHead>
                  <TableHead className="text-right">Σ Pliegues (mm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMeasurements.map((measurement) => {
                  const sumSkinfolds = [
                    measurement.triceps,
                    measurement.subscapular,
                    measurement.supraspinal,
                    measurement.abdominal,
                    measurement.thighSkinfold,
                    measurement.calfSkinfold,
                  ].filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);

                  return (
                    <TableRow 
                      key={measurement.id}
                      className="hover-elevate"
                      data-testid={`row-measurement-${measurement.id}`}
                    >
                      <TableCell>
                        {new Date(measurement.measurementDate).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {measurement.weight?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {measurement.height?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {calculateBMI(measurement.weight, measurement.height) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {measurement.waist?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {measurement.hip?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sumSkinfolds > 0 ? sumSkinfolds.toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
