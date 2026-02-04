import { AlertTriangle, Calendar, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
}

function AlertCard({ icon: Icon, label, count, colorClass, bgClass, onClick }: AlertCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-0",
        bgClass
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorClass)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{count}</p>
          <p className="text-sm text-slate-600">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface DemandaAlertCardsProps {
  atrasadasCount: number;
  hojeCount: number;
  altaPrioridadeCount: number;
  onClickAtrasadas?: () => void;
  onClickHoje?: () => void;
  onClickAltaPrioridade?: () => void;
}

export function DemandaAlertCards({
  atrasadasCount,
  hojeCount,
  altaPrioridadeCount,
  onClickAtrasadas,
  onClickHoje,
  onClickAltaPrioridade,
}: DemandaAlertCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AlertCard
        icon={AlertTriangle}
        label="Atrasadas"
        count={atrasadasCount}
        colorClass="bg-red-500"
        bgClass="bg-red-50 hover:bg-red-100"
        onClick={onClickAtrasadas}
      />
      <AlertCard
        icon={Calendar}
        label="Para Hoje"
        count={hojeCount}
        colorClass="bg-amber-500"
        bgClass="bg-amber-50 hover:bg-amber-100"
        onClick={onClickHoje}
      />
      <AlertCard
        icon={ArrowUp}
        label="Alta Prioridade"
        count={altaPrioridadeCount}
        colorClass="bg-orange-500"
        bgClass="bg-orange-50 hover:bg-orange-100"
        onClick={onClickAltaPrioridade}
      />
    </div>
  );
}
