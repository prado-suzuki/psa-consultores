import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, CheckCircle2, Ticket, Users, AlertTriangle, Calendar, ArrowRight, ClipboardList } from 'lucide-react';
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

  // Recent audit log
  const { data: recentActivity } = useQuery({
    queryKey: ['board-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('performed_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  // Tasks for "next critical deliveries"
  const { data: criticalTasks } = useQuery({
    queryKey: ['board-critical-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('fiscal_tasks').select('id, title, due_date, status, project_id, assigned_to').neq('status', 'done').not('due_date', 'is', null).order('due_date', { ascending: true }).limit(5);
      return data ?? [];
    },
  });

  // Temporal progress of active cycle
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

  return (
    <BoardLayout title="Dashboard" subtitle={`Visao consolidada da operacao`}>
      <div className="space-y-6">
        {/* Header greeting */}
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#0F172A' }}>Bom dia, {firstName}</h2>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} -- Atualizado agora
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}><FolderKanban className="h-5 w-5" style={{ color: '#3B82F6' }} /></div>
                  <div><p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{projects.length}</p><p className="text-xs" style={{ color: '#94A3B8' }}>Projetos ativos</p></div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span style={{ color: '#10B981' }}>{emDia} em dia</span>
                  <span style={{ color: '#D97706' }}>{emRisco} em risco</span>
                  <span style={{ color: '#EF4444' }}>{atrasados} atrasados</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}><CheckCircle2 className="h-5 w-5" style={{ color: '#10B981' }} /></div>
                  <div><p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{criticalTasks?.length ?? 0}</p><p className="text-xs" style={{ color: '#94A3B8' }}>Tarefas abertas</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Ticket className="h-5 w-5" style={{ color: '#D97706' }} /></div>
                  <div><p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{tickets?.total ?? 0}</p><p className="text-xs" style={{ color: '#94A3B8' }}>Chamados abertos</p></div>
                </div>
                <p className="text-xs mt-2" style={{ color: '#10B981' }}>{tickets?.resolved ?? 0} resolvidos no periodo</p>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}><Users className="h-5 w-5" style={{ color: '#8B5CF6' }} /></div>
                  <div><p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{members.length}</p><p className="text-xs" style={{ color: '#94A3B8' }}>Membros ativos</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risky projects */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Projetos em risco ou atrasados</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/equipe/board/performance')} style={{ color: '#6366F1' }}>Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {riskyProjects.length === 0 && (
                <div className="flex flex-col items-center py-6">
                  <CheckCircle2 className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
                  <p className="text-sm" style={{ color: '#64748B' }}>Todos os projetos estao em dia.</p>
                </div>
              )}
              {riskyProjects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: '#1E293B' }}>{p.name}</span>
                  {p.area_name && <Badge className="bg-blue-500/12 text-blue-600 border-0 text-[11px] rounded-full">{p.area_name}</Badge>}
                  <Badge className={`border-0 text-[11px] rounded-full ${p.computed_status === 'atrasado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}</Badge>
                  <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0}%`, backgroundColor: p.computed_status === 'atrasado' ? '#EF4444' : '#D97706' }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cycle goals */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Metas do ciclo ativo</CardTitle>
              {cicloAtivo && <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/equipe/board/desempenho')} style={{ color: '#6366F1' }}>Ver Desempenho <ArrowRight className="h-3 w-3 ml-1" /></Button>}
            </CardHeader>
            <CardContent>
              {!cicloAtivo ? (
                <div className="flex flex-col items-center py-6">
                  <Calendar className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
                  <p className="text-sm" style={{ color: '#64748B' }}>Nenhum ciclo ativo no momento.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/equipe/board/desempenho/ciclos')}>Cadastrar ciclo</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{cicloAtivo.nome}</p>
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{getTemporalProgress()}% decorrido</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${getTemporalProgress()}%`, backgroundColor: '#6366F1' }} />
                  </div>
                  <div className="flex gap-4 text-xs" style={{ color: '#64748B' }}>
                    <span>{overview?.totalMetas ?? 0} metas totais</span>
                    <span style={{ color: '#10B981' }}>{overview?.metasConcluidas ?? 0} concluidas</span>
                    <span>{overview?.mediaProgresso ?? 0}% medio</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical deliveries */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Proximas entregas criticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!criticalTasks || criticalTasks.length === 0) && (
                <div className="flex flex-col items-center py-6">
                  <ClipboardList className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
                  <p className="text-sm" style={{ color: '#64748B' }}>Nenhuma entrega pendente.</p>
                </div>
              )}
              {criticalTasks?.map((t: any) => {
                const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000) : 999;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                    <span className="flex-1 text-sm truncate" style={{ color: '#1E293B' }}>{t.title}</span>
                    <Badge className={`border-0 text-[11px] rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-700' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {daysLeft <= 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Atividade recente da equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!recentActivity || recentActivity.length === 0) && (
                <div className="flex flex-col items-center py-6">
                  <ClipboardList className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
                  <p className="text-sm" style={{ color: '#64748B' }}>Nenhuma atividade recente.</p>
                </div>
              )}
              {recentActivity?.map((a: any) => {
                const relative = (() => {
                  const diff = Math.ceil((Date.now() - new Date(a.performed_at).getTime()) / 60000);
                  if (diff < 60) return `${diff}min atras`;
                  if (diff < 1440) return `${Math.floor(diff / 60)}h atras`;
                  return `${Math.floor(diff / 1440)}d atras`;
                })();
                return (
                  <div key={a.id} className="flex items-start gap-3 py-1.5">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      {getInitials(a.performed_by)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#334155' }}>{a.action} {a.entity_type}: {a.entity_name}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{relative}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
