import {
  AlarmClockOff,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Timer,
  UserCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { KpiHero } from '@/components/dashboard/momentum';
import { cn } from '@/lib/utils';
import {
  type DashboardStats,
  fmtHorasOuDias,
  periodoLabels,
  type RecortePrazo,
} from '@/lib/gestaoChamadosDashboardAnalytics';

interface DashboardKpisProps {
  stats: DashboardStats;
  periodo: string;
  loading: boolean;
  /** Recorte aberto na tabela de detalhe, ou `null` com ela fechada. */
  recorte: RecortePrazo | null;
  onRecorteToggle: (recorte: RecortePrazo) => void;
}

/**
 * Torna o card inteiro clicável sem mexer no `KpiHero`, que é compartilhado com
 * os dashboards de área e de cliente — lá o card não abre nada.
 */
function KpiDrill({
  ativo,
  onClick,
  titulo,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      title={titulo}
      className={cn(
        'h-full rounded-2xl text-left transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        ativo && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      {children}
    </button>
  );
}

export function DashboardKpis({
  stats,
  periodo,
  loading,
  recorte,
  onRecorteToggle,
}: DashboardKpisProps) {
  return (
    // Duas linhas de quatro com leituras distintas: a de cima responde "estamos
    // cumprindo prazo?", com os três cards de prazo juntos e os dois clicáveis
    // lado a lado; a de baixo é o apoio de volume e tempos.
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <KpiHero
        label="Total"
        value={stats.total}
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        variation={{ label: periodoLabels[periodo] ?? '' }}
        loading={loading}
      />
      <KpiHero
        label="No Prazo"
        value={stats.noPrazo}
        icon={<CalendarCheck className="h-3.5 w-3.5" />}
        variation={{ value: stats.taxaNoPrazo, label: 'dos respondidos' }}
        loading={loading}
      />
      <KpiDrill
        ativo={recorte === 'fora'}
        onClick={() => onRecorteToggle('fora')}
        titulo="Ver os chamados respondidos fora do prazo"
      >
        <KpiHero
          label="Fora do Prazo"
          value={stats.foraPrazo}
          icon={<AlarmClockOff className="h-3.5 w-3.5" />}
          variation={{ label: 'clique para ver quais' }}
          loading={loading}
          className="h-full"
        />
      </KpiDrill>
      <KpiDrill
        ativo={recorte === 'sem_resposta'}
        onClick={() => onRecorteToggle('sem_resposta')}
        titulo="Ver os chamados sem resposta"
      >
        <KpiHero
          label="Sem Resposta"
          value={stats.semResposta}
          icon={<Clock className="h-3.5 w-3.5" />}
          variation={{ label: 'clique para ver quais' }}
          loading={loading}
          className="h-full"
        />
      </KpiDrill>
      <KpiHero
        label="Respondidos"
        value={stats.respondidos}
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        variation={{ value: stats.taxaResposta, label: 'taxa de resposta' }}
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
