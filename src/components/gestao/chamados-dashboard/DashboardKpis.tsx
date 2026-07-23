import { CheckCircle2, Clock, MessageSquare, Timer, UserCheck } from 'lucide-react';
import { KpiHero } from '@/components/dashboard/momentum';
import {
  type DashboardStats,
  fmtHorasOuDias,
  periodoLabels,
} from '@/lib/gestaoChamadosDashboardAnalytics';

interface DashboardKpisProps {
  stats: DashboardStats;
  periodo: string;
  loading: boolean;
}

export function DashboardKpis({ stats, periodo, loading }: DashboardKpisProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiHero
        label="Total"
        value={stats.total}
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        variation={{ label: periodoLabels[periodo] ?? '' }}
        loading={loading}
      />
      <KpiHero
        label="Respondidos"
        value={stats.respondidos}
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        variation={{ value: stats.taxaResposta, label: 'taxa de resposta' }}
        loading={loading}
      />
      <KpiHero
        label="Sem Resposta"
        value={stats.semResposta}
        icon={<Clock className="h-3.5 w-3.5" />}
        variation={{ label: 'aguardando 1ª resposta' }}
        loading={loading}
      />
      <KpiHero
        label="Resolvidos"
        value={stats.resolvidos}
        icon={<UserCheck className="h-3.5 w-3.5" />}
        variation={{ label: 'fechados ou resolvidos' }}
        loading={loading}
      />
      <KpiHero
        label="Tempo Médio Resposta"
        value={fmtHorasOuDias(stats.tempoMedioResposta)}
        icon={<Timer className="h-3.5 w-3.5" />}
        variation={{ label: 'até a primeira resposta' }}
        loading={loading}
      />
      <KpiHero
        label="Tempo Médio Resolução"
        value={fmtHorasOuDias(stats.tempoMedioResolucao)}
        icon={<Timer className="h-3.5 w-3.5" />}
        variant="solid"
        variation={{ label: 'até o fechamento' }}
        loading={loading}
      />
    </div>
  );
}
