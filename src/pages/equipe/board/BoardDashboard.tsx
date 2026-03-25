import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDecisoesData } from '@/hooks/useDecisoesData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, DollarSign, Clock, Target, Users, ArrowRight, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BoardDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projectsQuery, membersQuery } = usePerformanceData('30d', 'todas');
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);
  const { data: decisoesData } = useDecisoesData(cicloAtivo?.id);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSintese, setAiSintese] = useState<{ sintese: string; bullets: string[] } | null>(null);

  const projects = projectsQuery.data || [];
  const members = membersQuery.data?.members || [];
  const profiles = membersQuery.data?.profiles || [];

  const emDia = projects.filter(p => p.computed_status === 'em_dia').length;
  const emRisco = projects.filter(p => p.computed_status === 'em_risco').length;
  const atrasados = projects.filter(p => p.computed_status === 'atrasado').length;

  const { data: improvements } = useQuery({
    queryKey: ['board-improvements-roi'],
    queryFn: async () => {
      const { data } = await supabase.from('process_improvements' as any).select('id, total_savings_monthly, status');
      return (data ?? []) as any[];
    },
  });

  const totalSavingsYear = (improvements ?? []).reduce((a: number, i: any) => a + (i.total_savings_monthly || 0), 0) * 12;

  // Tasks by area for last 3 months
  const { data: tasksByArea } = useQuery({
    queryKey: ['board-tasks-by-area-3m'],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data } = await supabase.from('fiscal_tasks').select('id, category, status, created_at').eq('status', 'done').gte('created_at', threeMonthsAgo.toISOString());
      return (data ?? []) as any[];
    },
  });

  const barChartData = (() => {
    const months: Record<string, { name: string; Tax: number; OSG: number; Dev: number }> = {};
    (tasksByArea ?? []).forEach((t: any) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, 'MMM', { locale: ptBR });
      if (!months[key]) months[key] = { name: label, Tax: 0, OSG: 0, Dev: 0 };
      const cat = (t.category || '').toLowerCase();
      if (cat.includes('tax') || cat === 'obrigacao_acessoria' || cat === 'apuracao') months[key].Tax++;
      else if (cat.includes('osg') || cat === 'societario') months[key].OSG++;
      else months[key].Dev++;
    });
    return Object.values(months).slice(-3);
  })();

  const daysToAnalise = cicloAtivo?.data_analise_semestral ? differenceInDays(new Date(cicloAtivo.data_analise_semestral), new Date()) : null;

  const riskyProjects = projects.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado').slice(0, 5);

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
  const getInitials = (id: string) => { const p = profileMap.get(id) as any; return p ? `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() : '??'; };

  const handleGenerateSintese = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-sintese-executiva');
      if (error) throw error;
      setAiSintese(data);
    } catch (e) { console.error(e); }
    setAiLoading(false);
  };

  const isLoading = projectsQuery.isLoading;

  const kpis = [
    { label: 'Projetos Ativos', value: projects.length, icon: FolderKanban, color: 'var(--board-blue)', iconBg: 'var(--board-blue-s)', barColor: atrasados > 0 ? 'var(--board-red)' : emRisco > 0 ? 'var(--board-amber)' : 'var(--board-green)', sub: `${emDia} em dia · ${emRisco} risco · ${atrasados} atrasado` },
    { label: 'Economia / Ano', value: `R$ ${(totalSavingsYear / 1000).toFixed(0)}k`, icon: DollarSign, color: 'var(--board-green)', iconBg: 'var(--board-green-s)', barColor: 'var(--board-green)', sub: 'ROI automacoes' },
    { label: 'Taxa Pontualidade', value: `${projects.length > 0 ? Math.round((emDia / projects.length) * 100) : 0}%`, icon: Clock, color: 'var(--board-amber)', iconBg: 'var(--board-amber-s)', barColor: 'var(--board-amber)', sub: 'projetos no prazo' },
    { label: 'Metas do Ciclo', value: `${overview?.mediaProgresso ?? 0}%`, icon: Target, color: 'var(--board-indigo)', iconBg: 'var(--board-indigo-s)', barColor: 'var(--board-indigo)', sub: `${overview?.totalMetas ?? 0} metas · ${overview?.metasConcluidas ?? 0} concluidas` },
    { label: 'Membros Ativos', value: members.length, icon: Users, color: 'var(--board-purple)', iconBg: 'var(--board-purple-s)', barColor: 'var(--board-purple)', sub: `${profiles.length} cadastrados` },
  ];

  return (
    <BoardLayout title="Dashboard" subtitle="Visao Executiva">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--board-t1)' }}>Visao Executiva — PSA Consultores</h2>
            <p className="text-[12.5px]" style={{ color: 'var(--board-t3)' }}>
              {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })} {cicloAtivo ? `· ${cicloAtivo.nome}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {emRisco + atrasados > 0 && <Badge className="board-chip" style={{ background: 'var(--board-red-s)', color: 'var(--board-red)' }}><AlertTriangle className="h-3 w-3 mr-1" />{emRisco + atrasados} em risco</Badge>}
            {daysToAnalise !== null && <Badge className="board-chip" style={{ background: 'var(--board-indigo-s)', color: 'var(--board-indigo)' }}>{daysToAnalise}d ate analise</Badge>}
          </div>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[130px] rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="board-kpi">
                <div className="board-kpi-bar" style={{ backgroundColor: kpi.barColor }} />
                <div className="board-kpi-icon" style={{ backgroundColor: kpi.iconBg }}><kpi.icon className="h-[15px] w-[15px]" style={{ color: kpi.color }} /></div>
                <div className="board-kpi-val" style={{ fontSize: '32px' }}>{kpi.value}</div>
                <div className="board-kpi-label">{kpi.label}</div>
                <p className="text-[10.5px]" style={{ color: 'var(--board-t4)' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI Insight Box */}
        <div className="board-ai-box">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-[6px] text-[9.5px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--board-indigo)' }}>
              <Sparkles className="h-3 w-3" /> Sintese Estrategica — IA Executiva
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleGenerateSintese} disabled={aiLoading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${aiLoading ? 'animate-spin' : ''}`} /> {aiLoading ? 'Gerando...' : 'Gerar'}
            </Button>
          </div>
          {aiSintese ? (
            <div>
              <p className="text-[12.5px] leading-[1.55] mb-3" style={{ color: 'var(--board-t2)' }}>{aiSintese.sintese}</p>
              <ul className="space-y-1">
                {aiSintese.bullets.map((b, i) => (
                  <li key={i} className="text-[12px] flex items-start gap-2" style={{ color: 'var(--board-t2)' }}>
                    <span className="board-dot mt-1.5 flex-shrink-0" style={{ backgroundColor: i === 0 ? 'var(--board-green)' : i === 1 ? 'var(--board-amber)' : 'var(--board-indigo)' }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--board-t3)' }}>Clique em "Gerar" para obter a sintese estrategica com IA.</p>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title">Tarefas concluidas por area (3 meses)</div>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--board-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--board-t3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--board-t3)' }} />
                  <Tooltip />
                  <Bar dataKey="Tax" fill="var(--board-blue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="OSG" fill="var(--board-amber)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dev" fill="var(--board-indigo)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm py-8 text-center" style={{ color: 'var(--board-t3)' }}>Sem dados suficientes.</p>}
          </div>

          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title">ROI Acumulado</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={[{ name: 'Atual', value: totalSavingsYear }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--board-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--board-t3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--board-t3)' }} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Area type="monotone" dataKey="value" fill="rgba(22,169,124,0.15)" stroke="var(--board-green)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
          {/* Critical Projects */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title flex justify-between items-center">
              <span>Projetos criticos</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/equipe/board/performance')} style={{ color: 'var(--board-indigo)' }}>Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
            {riskyProjects.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--board-t3)' }}>Nenhum projeto critico.</p>}
            <div className="space-y-2">
              {riskyProjects.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-[10px] rounded-lg hover:bg-[#F7FAFF] transition-colors">
                    {p.area_name && <span className="board-chip" style={{ background: 'var(--board-blue-s)', color: 'var(--board-blue)' }}>{p.area_name}</span>}
                    <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: 'var(--board-t1)' }}>{p.name}</span>
                    <div className="w-16 h-[4px] board-pb"><div className="board-pb-fill" style={{ width: `${pct}%`, backgroundColor: p.computed_status === 'atrasado' ? 'var(--board-red)' : 'var(--board-amber)' }} /></div>
                    <span className="text-[11px] font-semibold w-8 text-right" style={{ color: 'var(--board-t2)' }}>{pct}%</span>
                    <span className="board-chip" style={{ background: p.computed_status === 'atrasado' ? 'var(--board-red-s)' : 'var(--board-amber-s)', color: p.computed_status === 'atrasado' ? 'var(--board-red)' : 'var(--board-amber)' }}>
                      {p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Ranking */}
          <div className="board-card p-[18px_20px]">
            <div className="board-sec-title flex justify-between items-center">
              <span>Ranking de performance</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/equipe/board/desempenho/metas')} style={{ color: 'var(--board-indigo)' }}>Ver metas <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
            {(!decisoesData || decisoesData.length === 0) && <p className="text-sm text-center py-6" style={{ color: 'var(--board-t3)' }}>Nenhum dado de performance.</p>}
            <div className="space-y-1">
              {decisoesData?.slice(0, 8).map((m, idx) => {
                const classifColor = m.classificacao === 'supera' ? 'var(--board-green)' : m.classificacao === 'atende' ? 'var(--board-blue)' : m.classificacao === 'atende_parcialmente' ? 'var(--board-amber)' : 'var(--board-red)';
                return (
                  <div key={m.membro_id} className="flex items-center gap-3 p-[8px_10px] rounded-lg hover:bg-[#F7FAFF] transition-colors">
                    <span className="text-[11px] font-bold w-5 text-center" style={{ color: 'var(--board-t4)' }}>{idx + 1}</span>
                    <div className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5B6EF0, #8054F0)' }}>
                      {(m.first_name?.[0] ?? '') + (m.last_name?.[0] ?? '')}
                    </div>
                    <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: 'var(--board-t1)' }}>{m.first_name} {m.last_name}</span>
                    <div className="w-20 h-[4px] board-pb"><div className="board-pb-fill" style={{ width: `${m.ppr}%`, backgroundColor: classifColor }} /></div>
                    <span className="text-[11px] font-semibold w-8 text-right" style={{ color: classifColor }}>{m.ppr}%</span>
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
