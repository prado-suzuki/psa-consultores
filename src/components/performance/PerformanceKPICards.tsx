import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, CheckSquare, MessageSquare, Users, Zap, Target } from 'lucide-react';
import type { PerformanceProject } from '@/hooks/usePerformanceData';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subItems?: { label: string; value: string | number; color?: string }[];
  topLineColor?: string;
  onClick?: () => void;
}

const KPICard = ({ title, value, icon, subItems, topLineColor = '#10B981', onClick }: KPICardProps) => (
  <Card
    className="min-w-[200px] flex-1 cursor-pointer hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
    onClick={onClick}
  >
    <div className="h-[3px] w-full" style={{ backgroundColor: topLineColor }} />
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-[28px] font-bold text-foreground leading-none mb-2">{value}</p>
      {subItems && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {subItems.map((s, i) => (
            <span key={i} className="text-xs" style={{ color: s.color || '#6B7280' }}>
              {s.label}: <strong>{s.value}</strong>
            </span>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

interface Props {
  projects: PerformanceProject[];
  tickets: { total: number; resolved: number; pendingOver7: number } | undefined;
  totalMembers: number;
  activeMembers: number;
  metas: any[];
  ciclo: any;
  roiData: any[];
  periodTasks: any[];
  previousPeriodTasks?: any[];
  isLoading: boolean;
}

export const PerformanceKPICards = ({
  projects, tickets, totalMembers, activeMembers, metas, ciclo, roiData, periodTasks, isLoading,
}: Props) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-xl" />
        ))}
      </div>
    );
  }

  const emDia = projects.filter(p => p.computed_status === 'em_dia').length;
  const emRisco = projects.filter(p => p.computed_status === 'em_risco').length;
  const atrasados = projects.filter(p => p.computed_status === 'atrasado').length;

  const projectColor = atrasados > 0 ? '#EF4444' : emRisco > 0 ? '#D97706' : '#10B981';

  const completedTasks = periodTasks.filter(t => t.status === 'concluida').length;
  const openTasks = periodTasks.length - completedTasks;

  const ticketColor = (tickets?.pendingOver7 || 0) > 0 ? '#EF4444' : '#10B981';

  const metaAvg = metas.length > 0
    ? Math.round(metas.filter(m => m.nivel === 'individual').reduce((acc: number, m: any) => acc + (m.progresso_atual || 0), 0) / Math.max(metas.filter(m => m.nivel === 'individual').length, 1))
    : null;

  const metasNoPrazo = metas.filter(m => {
    if (!m.prazo) return true;
    return m.progresso_atual >= 70 || new Date(m.prazo) > new Date();
  }).length;

  const metasEmRisco = metas.length - metasNoPrazo;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Projetos Ativos"
        value={projects.length}
        icon={<FolderKanban className="h-4 w-4" />}
        topLineColor={projectColor}
        subItems={[
          { label: 'Em dia', value: emDia, color: '#10B981' },
          { label: 'Em risco', value: emRisco, color: '#D97706' },
          { label: 'Atrasados', value: atrasados, color: '#EF4444' },
        ]}
      />
      <KPICard
        title="Tarefas do Período"
        value={periodTasks.length}
        icon={<CheckSquare className="h-4 w-4" />}
        topLineColor="#3B82F6"
        subItems={[
          { label: 'Concluídas', value: completedTasks, color: '#10B981' },
          { label: 'Em aberto', value: openTasks, color: '#6B7280' },
        ]}
      />
      <KPICard
        title="Chamados"
        value={tickets?.total || 0}
        icon={<MessageSquare className="h-4 w-4" />}
        topLineColor={ticketColor}
        subItems={[
          { label: 'Resolvidos', value: tickets?.resolved || 0, color: '#10B981' },
          { label: '> 7 dias', value: tickets?.pendingOver7 || 0, color: (tickets?.pendingOver7 || 0) > 0 ? '#EF4444' : '#6B7280' },
        ]}
      />
      <KPICard
        title="Membros Ativos"
        value={activeMembers}
        icon={<Users className="h-4 w-4" />}
        topLineColor="#8B5CF6"
        subItems={[
          { label: 'Total cadastrados', value: totalMembers },
        ]}
      />
      <KPICard
        title="ROI Acumulado"
        value={roiData.length > 0 ? `R$ ${roiData.reduce((a: number, r: any) => a + (r.annual_savings || 0), 0).toLocaleString('pt-BR')}` : '—'}
        icon={<Zap className="h-4 w-4" />}
        topLineColor="#10B981"
        subItems={roiData.length > 0 ? [{ label: 'Automações ativas', value: roiData.length }] : [{ label: 'Sem dados de ROI', value: '' }]}
      />
      <KPICard
        title="Metas do Ciclo"
        value={metaAvg !== null ? `${metaAvg}%` : '—'}
        icon={<Target className="h-4 w-4" />}
        topLineColor={ciclo ? '#3B82F6' : '#9CA3AF'}
        subItems={ciclo ? [
          { label: 'No prazo', value: metasNoPrazo, color: '#10B981' },
          { label: 'Em risco', value: metasEmRisco, color: '#D97706' },
        ] : [{ label: 'Sem ciclo ativo', value: '' }]}
      />
    </div>
  );
};
