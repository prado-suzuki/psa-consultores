import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCicloAtivo, useCiclosAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useMetas } from '@/hooks/useMetasDesempenho';
import { useFeedbacks } from '@/hooks/useFeedbacksDesempenho';
import { useReunioes, useAllOpenItensAcao } from '@/hooks/useReunioes1a1';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CheckCircle2, TrendingUp, MessageSquareHeart, Users2, AlertTriangle, Building2, Users, User, AlertCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const dimensaoColors: Record<string, { bg: string; text: string }> = {
  entrega: { bg: 'bg-blue-500/12', text: 'text-blue-600' },
  impacto: { bg: 'bg-emerald-500/12', text: 'text-emerald-600' },
  gestao: { bg: 'bg-violet-500/12', text: 'text-violet-600' },
};

const DesempenhoVisaoGeral = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const [selectedCicloId, setSelectedCicloId] = useState<string | undefined>(undefined);

  const cicloId = selectedCicloId || cicloAtivo?.id;
  const { data: overview, isLoading } = useDesempenhoOverview(cicloId);
  const { data: metasEquipe } = useMetas({ ciclo_id: cicloId, nivel: 'equipe' });
  const { data: metasIndividuais } = useMetas({ ciclo_id: cicloId, nivel: 'individual' });
  const { data: feedbacks } = useFeedbacks({ ciclo_id: cicloId });
  const { data: reunioes } = useReunioes();
  const { data: openItems } = useAllOpenItensAcao();

  const navigate = useNavigate();

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name, email');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string; email: string }[];
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  // Group individual metas by responsavel
  const membroProgressMap = new Map<string, { total: number; sum: number; count: number }>();
  metasIndividuais?.forEach((m) => {
    if (!m.responsavel_id) return;
    const cur = membroProgressMap.get(m.responsavel_id) || { total: 0, sum: 0, count: 0 };
    cur.total += m.peso;
    cur.sum += m.progresso_atual * m.peso;
    cur.count++;
    membroProgressMap.set(m.responsavel_id, cur);
  });

  // Feedback counts by member
  const feedbackCountMap = new Map<string, number>();
  feedbacks?.forEach((f) => {
    if (f.para_usuario_id) feedbackCountMap.set(f.para_usuario_id, (feedbackCountMap.get(f.para_usuario_id) || 0) + 1);
  });

  // Reuniao counts by member
  const reuniaoCountMap = new Map<string, number>();
  const cicloReunioes = reunioes?.filter(r => !cicloId || r.ciclo_id === cicloId) ?? [];
  cicloReunioes.forEach((r) => {
    if (r.membro_id) reuniaoCountMap.set(r.membro_id, (reuniaoCountMap.get(r.membro_id) || 0) + 1);
  });

  const getClassificacao = (media: number) => {
    if (media >= 100) return { label: 'Supera', color: 'bg-emerald-50 text-emerald-700' };
    if (media >= 85) return { label: 'Atende', color: 'bg-green-50 text-green-700' };
    if (media >= 70) return { label: 'Parcialmente', color: 'bg-amber-50 text-amber-700' };
    return { label: 'Abaixo', color: 'bg-red-50 text-red-700' };
  };

  // Alerts computation
  const hoje = new Date().toISOString().slice(0, 10);
  const alerts: { severity: 'red' | 'amber'; text: string; link: string }[] = [];

  // Metas with deadline <15d and progress <50%
  metasIndividuais?.forEach((m) => {
    if (m.status !== 'ativa' || !m.prazo) return;
    const daysLeft = Math.ceil((new Date(m.prazo).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 15 && daysLeft >= 0 && m.progresso_atual < 50) {
      const profile = m.responsavel_id ? profileMap.get(m.responsavel_id) : null;
      const name = profile ? `${profile.first_name} ${profile.last_name}` : '';
      alerts.push({ severity: 'red', text: `Meta "${m.titulo}" (${name}) com ${m.progresso_atual}% e prazo em ${daysLeft}d`, link: '/equipe/board/desempenho/metas' });
    }
  });

  // Open action items > 30 days
  const oldItems = (openItems ?? []).filter(item => {
    if (!item.prazo) return false;
    const daysOverdue = Math.ceil((Date.now() - new Date(item.prazo).getTime()) / 86400000);
    return daysOverdue > 30;
  });
  if (oldItems.length > 0) {
    alerts.push({ severity: 'amber', text: `${oldItems.length} itens de acao abertos ha mais de 30 dias`, link: '/equipe/board/desempenho/1a1' });
  }

  // Members without 1:1 in 30 days
  const membrosComMetas = Array.from(membroProgressMap.keys());
  const membrosSem1a1 = membrosComMetas.filter(id => {
    const memberReunioes = reunioes?.filter(r => r.membro_id === id) ?? [];
    if (memberReunioes.length === 0) return true;
    const last = memberReunioes[0].data_reuniao;
    const daysSince = Math.ceil((Date.now() - new Date(last).getTime()) / 86400000);
    return daysSince > 30;
  });
  if (membrosSem1a1.length > 0) {
    alerts.push({ severity: 'amber', text: `${membrosSem1a1.length} membros sem 1:1 nos ultimos 30 dias`, link: '/equipe/board/desempenho/1a1' });
  }

  // Analise semestral pending
  const selectedCiclo = ciclos?.find(c => c.id === cicloId);
  if (selectedCiclo?.data_analise_semestral) {
    const daysToAnalise = Math.ceil((new Date(selectedCiclo.data_analise_semestral).getTime() - Date.now()) / 86400000);
    if (daysToAnalise <= 15 && daysToAnalise >= -30) {
      alerts.push({ severity: daysToAnalise < 0 ? 'red' : 'amber', text: `Analise semestral ${daysToAnalise < 0 ? 'pendente' : `em ${daysToAnalise} dias`}`, link: '/equipe/board/desempenho/ciclos' });
    }
  }

  return (
    <BoardLayout title="Visao Geral" subtitle="Painel de desempenho da equipe">
      {/* Cycle selector */}
      <div className="mb-6">
        <Select value={cicloId ?? ''} onValueChange={setSelectedCicloId}>
          <SelectTrigger className="w-72 bg-white">
            <SelectValue placeholder="Selecione um ciclo" />
          </SelectTrigger>
          <SelectContent>
            {ciclos?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} {c.status === 'em_andamento' ? '(ativo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <MetricCard title="Total de Metas" value={overview?.totalMetas ?? 0} icon={<Target className="h-5 w-5 text-violet-600" />} iconColor="bg-violet-100" change={`${overview?.metasConcluidas ?? 0} concluidas`} />
            <MetricCard title="Media Progresso" value={`${overview?.mediaProgresso ?? 0}%`} icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} iconColor="bg-emerald-100" trend={overview?.mediaProgresso && overview.mediaProgresso >= 70 ? 'up' : 'down'} />
            <MetricCard title="Feedbacks" value={overview?.totalFeedbacks ?? 0} icon={<MessageSquareHeart className="h-5 w-5 text-amber-600" />} iconColor="bg-amber-100" />
            <MetricCard title="1:1s Realizados" value={overview?.totalReunioes ?? 0} icon={<Users2 className="h-5 w-5 text-blue-600" />} iconColor="bg-blue-100" />
            <MetricCard
              title="Prox. Prazo Critico"
              value={overview?.proximoPrazoCritico?.titulo?.slice(0, 20) ?? '--'}
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              iconColor="bg-red-100"
              change={overview?.proximoPrazoCritico ? `${overview.proximoPrazoCritico.progresso}% | ${overview.proximoPrazoCritico.prazo}` : undefined}
              trend="down"
            />
          </div>

          {/* Alerts block */}
          <Card className="mb-8 rounded-xl shadow-sm" style={{ borderColor: alerts.length > 0 ? '#FDE68A' : '#BBF7D0', backgroundColor: alerts.length > 0 ? '#FFFBEB' : '#F0FDF4' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2" style={{ color: 'var(--board-t1)' }}>
                <AlertCircle className="h-4 w-4" style={{ color: alerts.length > 0 ? '#D97706' : '#10B981' }} />
                {alerts.length > 0 ? `Alertas (${alerts.length})` : 'Nenhum alerta no momento'}
              </CardTitle>
            </CardHeader>
            {alerts.length > 0 && (
              <CardContent className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(a.link)}>
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${a.severity === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span style={{ color: 'var(--board-t2)' }}>{a.text}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Metas da Equipe */}
          <Card className="mb-8 bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold" style={{ color: 'var(--board-t1)' }}>Metas da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metasEquipe?.length === 0 && <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhuma meta de equipe neste ciclo.</p>}
              {metasEquipe?.map((m) => {
                const dc = dimensaoColors[m.dimensao] ?? dimensaoColors.entrega;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:shadow-sm transition-shadow cursor-pointer" style={{ backgroundColor: 'var(--board-border-s)' }} onClick={() => navigate('/equipe/board/desempenho/metas')}>
                    <Badge variant="outline" className={`${dc.bg} ${dc.text} border-0 text-[11px] font-semibold rounded-full px-2.5`}>
                      {m.dimensao}
                    </Badge>
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--board-t1)' }}>{m.titulo}</span>
                    <div className="w-32 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--board-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${m.progresso_atual}%`,
                            backgroundColor: m.progresso_atual >= 85 ? '#10B981' : m.progresso_atual >= 70 ? '#D97706' : '#EF4444',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right" style={{ color: 'var(--board-t3)' }}>{m.progresso_atual}%</span>
                    </div>
                    <span className="text-xs w-24 text-right" style={{ color: 'var(--board-t4)' }}>{m.prazo ?? '--'}</span>
                    <Badge variant="outline" className="text-xs">{m.status}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Progresso Individual */}
          <Card className="mb-8 bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold" style={{ color: 'var(--board-t1)' }}>Progresso Individual da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(membroProgressMap.entries()).map(([userId, data]) => {
                  const profile = profileMap.get(userId);
                  const media = data.total > 0 ? Math.round(data.sum / data.total) : 0;
                  const classif = getClassificacao(media);
                  const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '??';
                  const fbCount = feedbackCountMap.get(userId) || 0;
                  const rnCount = reuniaoCountMap.get(userId) || 0;
                  return (
                    <div
                      key={userId}
                      className="p-4 rounded-xl bg-white cursor-pointer transition-shadow hover:shadow-md"
                      style={{ border: '1px solid var(--board-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                      onClick={() => navigate(`/equipe/board/desempenho/evolucao?membro=${userId}`)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>{initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--board-t1)' }}>{profile ? `${profile.first_name} ${profile.last_name}` : userId.slice(0, 8)}</p>
                          <p className="text-xs" style={{ color: 'var(--board-t4)' }}>{data.count} metas</p>
                        </div>
                        <Badge className={`${classif.color} border-0 text-[11px] font-semibold`}>{classif.label}</Badge>
                      </div>
                      <div className="h-1.5 rounded-full mb-2" style={{ backgroundColor: 'var(--board-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${media}%`, backgroundColor: media >= 85 ? '#10B981' : media >= 70 ? '#D97706' : '#EF4444' }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: 'var(--board-t4)' }}>{media}% medio ponderado</p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--board-t4)' }}>
                          <span>{fbCount} feedbacks</span>
                          <span>{rnCount} 1:1s</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {membroProgressMap.size === 0 && <p className="text-sm col-span-full" style={{ color: 'var(--board-t3)' }}>Nenhuma meta individual neste ciclo.</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </BoardLayout>
  );
};

export default DesempenhoVisaoGeral;
