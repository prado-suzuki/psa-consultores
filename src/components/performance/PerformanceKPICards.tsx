import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, CheckSquare, MessageSquare, Users, Zap, Target } from 'lucide-react';
import type { PerformanceProject } from '@/hooks/usePerformanceData';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  topLineColor?: string;
  subItems?: { label: string; value: string | number; color?: string }[];
}

const KPICard = ({ title, value, icon, iconBg = 'var(--board-blue-s)', topLineColor = 'var(--board-green)', subItems }: KPICardProps) => (
  <div className="board-kpi">
    <div className="board-kpi-bar" style={{ backgroundColor: topLineColor }} />
    <div className="board-kpi-icon" style={{ backgroundColor: iconBg }}>
      {icon}
    </div>
    <div className="board-kpi-val">{value}</div>
    <div className="board-kpi-label">{title}</div>
    {subItems && subItems.length > 0 && (
      <div className="flex flex-col gap-[3px]">
        {subItems.map((s, i) => (
          <span key={i} className="text-[11px] flex items-center gap-[5px]" style={{ color: 'var(--board-t3)' }}>
            <span className="board-dot" style={{ backgroundColor: s.color || 'var(--board-t4)' }} />
            {s.label}: <strong style={{ color: 'var(--board-t2)' }}>{s.value}</strong>
          </span>
        ))}
      </div>
    )}
  </div>
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-xl" />
        ))}
      </div>
    );
  }

  const emDia = projects.filter(p => p.computed_status === 'em_dia').length;
  const emRisco = projects.filter(p => p.computed_status === 'em_risco').length;
  const atrasados = projects.filter(p => p.computed_status === 'atrasado').length;
  const projectColor = atrasados > 0 ? 'var(--board-red)' : emRisco > 0 ? 'var(--board-amber)' : 'var(--board-green)';

  const completedTasks = periodTasks.filter(t => t.status === 'concluida').length;
  const openTasks = periodTasks.length - completedTasks;
  const ticketColor = (tickets?.pendingOver7 || 0) > 0 ? 'var(--board-red)' : 'var(--board-green)';

  const metaAvg = metas.length > 0
    ? Math.round(metas.filter(m => m.nivel === 'individual').reduce((acc: number, m: any) => acc + (m.progresso_atual || 0), 0) / Math.max(metas.filter(m => m.nivel === 'individual').length, 1))
    : null;

  const metasNoPrazo = metas.filter(m => {
    if (!m.prazo) return true;
    return m.progresso_atual >= 70 || new Date(m.prazo) > new Date();
  }).length;
  const metasEmRisco = metas.length - metasNoPrazo;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard title="Projetos Ativos" value={projects.length} icon={<FolderKanban className="h-[15px] w-[15px]" style={{ color: 'var(--board-blue)' }} />} iconBg="var(--board-blue-s)" topLineColor={projectColor}
        subItems={[
          { label: 'Em dia', value: emDia, color: 'var(--board-green)' },
          { label: 'Em risco', value: emRisco, color: 'var(--board-amber)' },
          { label: 'Atrasados', value: atrasados, color: 'var(--board-red)' },
        ]} />
      <KPICard title="Tarefas do Periodo" value={periodTasks.length} icon={<CheckSquare className="h-[15px] w-[15px]" style={{ color: 'var(--board-indigo)' }} />} iconBg="var(--board-indigo-s)" topLineColor="var(--board-indigo)"
        subItems={[
          { label: 'Concluidas', value: completedTasks, color: 'var(--board-green)' },
          { label: 'Em aberto', value: openTasks, color: 'var(--board-t4)' },
        ]} />
      <KPICard title="Chamados" value={tickets?.total || 0} icon={<MessageSquare className="h-[15px] w-[15px]" style={{ color: 'var(--board-amber)' }} />} iconBg="var(--board-amber-s)" topLineColor={ticketColor}
        subItems={[
          { label: 'Resolvidos', value: tickets?.resolved || 0, color: 'var(--board-green)' },
          { label: '> 7 dias', value: tickets?.pendingOver7 || 0, color: (tickets?.pendingOver7 || 0) > 0 ? 'var(--board-red)' : 'var(--board-t4)' },
        ]} />
      <KPICard title="Membros Ativos" value={activeMembers} icon={<Users className="h-[15px] w-[15px]" style={{ color: 'var(--board-purple)' }} />} iconBg="var(--board-purple-s)" topLineColor="var(--board-purple)"
        subItems={[{ label: 'Total cadastrados', value: totalMembers }]} />
      <KPICard title="ROI Acumulado" value={roiData.length > 0 ? `R$ ${roiData.reduce((a: number, r: any) => a + (r.annual_savings || 0), 0).toLocaleString('pt-BR')}` : '—'} icon={<Zap className="h-[15px] w-[15px]" style={{ color: 'var(--board-green)' }} />} iconBg="var(--board-green-s)" topLineColor="var(--board-green)"
        subItems={roiData.length > 0 ? [{ label: 'Automacoes ativas', value: roiData.length }] : [{ label: 'Sem dados de ROI', value: '' }]} />
      <KPICard title="Metas do Ciclo" value={metaAvg !== null ? `${metaAvg}%` : '—'} icon={<Target className="h-[15px] w-[15px]" style={{ color: 'var(--board-indigo)' }} />} iconBg="var(--board-indigo-s)" topLineColor={ciclo ? 'var(--board-indigo)' : 'var(--board-t4)'}
        subItems={ciclo ? [
          { label: 'No prazo', value: metasNoPrazo, color: 'var(--board-green)' },
          { label: 'Em risco', value: metasEmRisco, color: 'var(--board-amber)' },
        ] : [{ label: 'Sem ciclo ativo', value: '' }]} />
    </div>
  );
};
