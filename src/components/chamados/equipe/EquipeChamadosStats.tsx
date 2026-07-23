import { AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { getTicketStats } from '@/lib/equipeChamados';

interface EquipeChamadosStatsProps {
  stats: ReturnType<typeof getTicketStats>;
}

export function EquipeChamadosStats({ stats }: EquipeChamadosStatsProps) {
  const cards = [
    { label: 'Total', value: stats.total, icon: MessageSquare, iconClass: 'text-gray-400', valueClass: '' },
    { label: 'Abertos', value: stats.abertos, icon: AlertTriangle, iconClass: 'text-blue-400', valueClass: 'text-blue-600' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: Clock, iconClass: 'text-yellow-400', valueClass: 'text-yellow-600' },
    { label: 'Resolvidos', value: stats.resolvidos, icon: CheckCircle, iconClass: 'text-green-400', valueClass: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, icon: Icon, iconClass, valueClass }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>{label}</CardDescription>
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
            <CardTitle className={`text-3xl ${valueClass}`}>{value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
