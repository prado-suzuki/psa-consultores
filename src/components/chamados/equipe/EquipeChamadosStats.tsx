import { AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { getTicketStats } from '@/lib/equipeChamados';
import { chamadoStatusColors } from '@/lib/chamadoStatusColors';

interface EquipeChamadosStatsProps {
  stats: ReturnType<typeof getTicketStats>;
}

export function EquipeChamadosStats({ stats }: EquipeChamadosStatsProps) {
  // Cada KPI pega a cor do STATUS que ele conta, do mesmo mapa que pinta a pílula
  // na tabela — o número e a pílula do mesmo estado passam a ser a mesma cor.
  // `Total` não conta um status, e por isso é o único que fica em `muted`.
  //
  // O ícone vem a 70% do tom cheio porque o desenho original já tinha dois pesos
  // (ícone claro, número escuro), e o papel entrega um tom só.
  const cards = [
    { label: 'Total', value: stats.total, icon: MessageSquare, iconClass: 'text-muted-foreground/70', valueClass: '' },
    { label: 'Abertos', value: stats.abertos, icon: AlertTriangle, iconClass: `${chamadoStatusColors.aberto.text}/70`, valueClass: chamadoStatusColors.aberto.text },
    { label: 'Em Andamento', value: stats.emAndamento, icon: Clock, iconClass: `${chamadoStatusColors.em_andamento.text}/70`, valueClass: chamadoStatusColors.em_andamento.text },
    { label: 'Resolvidos', value: stats.resolvidos, icon: CheckCircle, iconClass: `${chamadoStatusColors.resolvido.text}/70`, valueClass: chamadoStatusColors.resolvido.text },
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
