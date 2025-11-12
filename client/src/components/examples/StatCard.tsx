import { StatCard } from '../stat-card';
import { Users } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <StatCard
        title="Total Pacientes"
        value="47"
        icon={Users}
        description="5 nuevos este mes"
        trend={{ value: 12, isPositive: true }}
      />
    </div>
  );
}
