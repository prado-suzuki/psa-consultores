import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, CheckCircle2, Ticket, Users, Calendar, ArrowRight, ClipboardList, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BoardDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';

  const { projectsQuery, ticketsQuery, membersQuery } = usePerformanceData('30d', 'todas');
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);

  const projects = projectsQuery.data || [];
  const tickets = ticketsQuery.data;
  const members = membersQuery.data?.members || [];
  const profiles = membersQuery.data?.profiles || [];

  const emDia = projects.filter(p => p.computed_status === 'em_dia').length;
  const emRisco = projects.filter(p => p.computed_status === 'em_risco').length;
  const atrasados = projects.filter(p => p.computed_status === 'atrasado').length;

  const { data: recentActivity } = useQuery({
    queryKey: ['board-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('performed_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: criticalTasks } = useQuery({
    queryKey: ['board-critical-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('fiscal_tasks').select('id, title, due_date, status, project_id, assigned_to').neq('status', 'done').not('due_date', 'is', null).order('due_date', { ascending: true }).limit(5);
      return data ?? [];
    },
  });

  const getTemporalProgress = () => {
    if (!cicloAtivo) return 0;
    const start = new Date(cicloAtivo.data_inicio).getTime();
    const end = new Date(cicloAtivo.data_fim).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const isLoading = projectsQuery.isLoading;
  const riskyProjects = projects.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado').slice(0, 5);

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
  const getInitials = (id: string) => {
    const p = profileMap.get(id) as any;
    if (!p) return '??';
    return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
  };

  const kpis = [
    { label: 'Projetos Ativos', value: projects.length, icon: FolderKanban, color: 'var(--board-blue)', iconBg: 'var(--board-blue-s)', barColor: atrasados > 0 ? 'var(--board-red)' : emRisco > 0 ? 'var(--board-amber)' : 'var(--board-green)', subs: [
      { label: 'Em dia', value: emDia, color: 'var(--board-green)' },
      { label: 'Em risco', value: emRisco, color: 'var(--board-amber)' },
      { label: 'Atrasados', value: atrasados, color: 'var(--board-red)' },
    ] },
    { label: 'Tarefas Abertas', value: criticalTasks?.length ?? 0, icon: CheckCircle2, color: 'var(--board-green)', iconBg: 'var(--board-green-s)', barColor: 'var(--board-green)', subs: [] },
    { label: 'Chamados', value: tickets?.total ?? 0, icon: Ticket, color: 'var(--board-amber)', iconBg: 'var(--board-amber-s)', barColor: (tickets?.pendingOver7 || 0) > 0 ? 'var(--board-red)' : 'var(--board-green)', subs: [
      { label: 'Resolvidos', value: tickets?.resolved ?? 0, color: 'var(--board-green)' },
      { label: '> 7 dias', value: tickets?.pendingOver7 ?? 0, color: 'var(--board-red)' },
    ] },
    { label: 'Membros Ativos', value: members.length, icon: Users, color: 'var(--board-purple)', iconBg: 'var(--board-purple-s)', barColor: 'var(--board-indigo)', subs: [
      { label: 'Total cadastrados', value: profiles.length, color: 'var(--board-t3)' },
    ] },
  ];

  return (
    <BoardLayout title="Dashboard" subtitle="Visao consolidada da operacao">
      <div className="space-y-5">
        {/* Header greeting */}
        <div className="mb-2">
          <h2 className="text-[20px] font-bold tracking-[-0.02em]" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--board-t1)' }}>Bom dia, {firstName}</h2>
          <p className="text-[12.5px]" style={{ color: 'var(--board-t3)' }}>
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} — Atualizado agora
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="board-kpi">
                <div className="board-kpi-bar" style={{ backgroundColor: kpi.barColor }} />
                <div className="board-kpi-icon" style={{ backgroundColor: kpi.iconBg }}>
                  <kpi.icon className="h-[15px] w-[15px]" style={{ color: kpi.color }} />
                </div>
                <div className="board-kpi-val">{kpi.value}</div>
                <div className="board-kpi-label">{kpi.label}</div>
                {kpi.subs.length > 0 && (
                  <div className="flex flex-col gap-[3px]">
                    {kpi.subs.map((s, si) => (
                      <span key={si} className="text-[11px] flex items-center gap-[5px]" style={{ color: 'var(--board-t3)' }}>
                        <span className="board-dot" style={{ backgroundColor: s.color }} />
                        {s.label}: <strong style={{ color: 'var(--board-t2)' }}>{s.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Insight Box */}
        <div className="board-ai-box">
          <div className="flex items-center gap-[6px] text-[9.5px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: 'var(--board-indigo)' }}>
            <Sun className="h-3 w-3" /> Insight do periodo
          </div>
          <p className="text-[12.5px] leading-[1.55]" style={{ color: 'var(--board-t2)' }}>
            {riskyProjects.length > 0 ? (
              <><strong style={{ color: 'var(--board-t1)' }}>{riskyProjects.length} projeto(s)</strong> em risco ou atrasados requerem atencao imediata.</>
            ) : (
              <>Todos os projetos estao em dia. A equipe esta no caminho certo.</>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
          {/* Risky projects */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title flex justify-between items-center">
              <span>Projetos em risco ou atrasados</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/equipe/board/performance')} style={{ color: 'var(--board-indigo)' }}>Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
            {riskyProjects.length === 0 && (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="h-8 w-8 mb-2" style={{ color: 'var(--board-t4)' }} />
                <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Todos os projetos estao em dia.</p>
              </div>
            )}
            <div className="space-y-2">
              {riskyProjects.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                const barColor = p.computed_status === 'atrasado' ? 'var(--board-red)' : 'var(--board-amber)';
                return (
                  <div key={p.id} className="flex items-center gap-3 p-[10px] rounded-lg hover:bg-[#F7FAFF] transition-colors">
                    <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: 'var(--board-t1)' }}>{p.name}</span>
                    {p.area_name && <span className="board-chip" style={{ background: 'var(--board-blue-s)', color: 'var(--board-blue)' }}>{p.area_name}</span>}
                    <span className="board-chip" style={{ background: p.computed_status === 'atrasado' ? 'var(--board-red-s)' : 'var(--board-amber-s)', color: p.computed_status === 'atrasado' ? 'var(--board-red)' : 'var(--board-amber)' }}>
                      {p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}
                    </span>
                    <div className="w-16 h-[4px] board-pb">
                      <div className="board-pb-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cycle goals */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title flex justify-between items-center">
              <span>Metas do ciclo ativo</span>
              {cicloAtivo && <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/equipe/board/desempenho')} style={{ color: 'var(--board-indigo)' }}>Ver Desempenho <ArrowRight className="h-3 w-3 ml-1" /></Button>}
            </div>
            {!cicloAtivo ? (
              <div className="flex flex-col items-center py-6">
                <Calendar className="h-8 w-8 mb-2" style={{ color: 'var(--board-t4)' }} />
                <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhum ciclo ativo no momento.</p>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => navigate('/equipe/board/desempenho/ciclos')}>Cadastrar ciclo</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-medium" style={{ color: 'var(--board-t1)' }}>{cicloAtivo.nome}</p>
                  <span className="text-[11px]" style={{ color: 'var(--board-t3)' }}>{getTemporalProgress()}% decorrido</span>
                </div>
                <div className="h-[4px] board-pb">
                  <div className="board-pb-fill" style={{ width: `${getTemporalProgress()}%`, backgroundColor: 'var(--board-indigo)' }} />
                </div>
                <div className="flex gap-4 text-[11px]" style={{ color: 'var(--board-t3)' }}>
                  <span className="flex items-center gap-[5px]"><span className="board-dot" style={{ backgroundColor: 'var(--board-indigo)' }} />{overview?.totalMetas ?? 0} metas totais</span>
                  <span className="flex items-center gap-[5px]"><span className="board-dot" style={{ backgroundColor: 'var(--board-green)' }} />{overview?.metasConcluidas ?? 0} concluidas</span>
                  <span className="flex items-center gap-[5px]"><span className="board-dot" style={{ backgroundColor: 'var(--board-t4)' }} />{overview?.mediaProgresso ?? 0}% medio</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
          {/* Critical deliveries */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title">Proximas entregas criticas</div>
            {(!criticalTasks || criticalTasks.length === 0) && (
              <div className="flex flex-col items-center py-6">
                <ClipboardList className="h-8 w-8 mb-2" style={{ color: 'var(--board-t4)' }} />
                <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhuma entrega pendente.</p>
              </div>
            )}
            <div className="space-y-1">
              {criticalTasks?.map((t: any) => {
                const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000) : 999;
                const chipStyle = daysLeft <= 3 ? { background: 'var(--board-red-s)', color: 'var(--board-red)' } : daysLeft <= 7 ? { background: 'var(--board-amber-s)', color: 'var(--board-amber)' } : { background: 'var(--board-border-s)', color: 'var(--board-t3)' };
                return (
                  <div key={t.id} className="flex items-center gap-3 p-[10px] rounded-lg hover:bg-[#F7FAFF] transition-colors">
                    <span className="flex-1 text-[12.5px] truncate" style={{ color: 'var(--board-t1)' }}>{t.title}</span>
                    <span className="board-chip" style={chipStyle}>
                      {daysLeft <= 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title">Atividade recente da equipe</div>
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="flex flex-col items-center py-6">
                <ClipboardList className="h-8 w-8 mb-2" style={{ color: 'var(--board-t4)' }} />
                <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhuma atividade recente.</p>
              </div>
            )}
            <div className="space-y-1">
              {recentActivity?.map((a: any) => {
                const diff = Math.ceil((Date.now() - new Date(a.performed_at).getTime()) / 60000);
                const relative = diff < 60 ? `${diff}min atras` : diff < 1440 ? `${Math.floor(diff / 60)}h atras` : `${Math.floor(diff / 1440)}d atras`;
                return (
                  <div key={a.id} className="flex items-start gap-3 py-[6px]">
                    <div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #7A8BA8, #3D4D6A)' }}>
                      {getInitials(a.performed_by)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] truncate" style={{ color: 'var(--board-t2)' }}>{a.action} {a.entity_type}: {a.entity_name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--board-t4)' }}>{relative}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
