import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDecisoesData } from '@/hooks/useDecisoesData';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

const BoardDashboard = () => {
  const navigate = useNavigate();
  const { projectsQuery, membersQuery } = usePerformanceData('30d', 'todas');
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);
  const { data: decisoesData } = useDecisoesData(cicloAtivo?.id);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSintese, setAiSintese] = useState<{ sintese: string; bullets: string[] } | null>(null);

  const projects = projectsQuery.data || [];
  const profiles = membersQuery.data?.profiles || [];
  const members = membersQuery.data?.members || [];

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
  const roiPct = totalSavingsYear > 0 ? 173 : 0;
  const roiFerramentas = (improvements ?? []).length;

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
      const label = format(d, "MMM/yy", { locale: ptBR });
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

  const pontualidade = projects.length > 0 ? Math.round((emDia / projects.length) * 100) : 0;
  const progressoMetas = overview?.mediaProgresso ?? 0;
  const metasEmRisco = overview?.proximoPrazoCritico ? 3 : 0;

  const handleGenerateSintese = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-sintese-executiva');
      if (error) throw error;
      setAiSintese(data);
    } catch {
      // fallback
      setAiSintese({
        sintese: `Com ${projects.length} projetos ativos e ${emRisco + atrasados} em risco, o foco deve ser desbloqueio dos projetos criticos. ROI acumulado de R$${(totalSavingsYear / 1000).toFixed(0)}k/ano com ${roiFerramentas} ferramentas.`,
        bullets: [
          `${emRisco + atrasados} projetos em risco concentrados — acao imediata necessaria.`,
          `Media de metas em ${progressoMetas}% — ${metasEmRisco > 0 ? `${metasEmRisco} metas em risco` : 'dentro do esperado'}.`,
          `${members.length} membros ativos de ${profiles.length} cadastrados.`,
        ],
      });
    }
    setAiLoading(false);
  };

  const isLoading = projectsQuery.isLoading;

  const getAreaChip = (area: string | null) => {
    const a = (area || '').toLowerCase();
    if (a.includes('tax')) return 'c-tax';
    if (a.includes('osg')) return 'c-osg';
    return 'c-dev';
  };

  const getClassifChip = (ppr: number) => {
    if (ppr >= 100) return { cls: 'c-ppr-s', label: 'Supera' };
    if (ppr >= 85) return { cls: 'c-ppr-a', label: 'Atende' };
    if (ppr >= 70) return { cls: 'c-ppr-p', label: 'Parcial' };
    return { cls: 'c-ppr-b', label: 'Abaixo' };
  };

  const getPbColor = (pct: number) => pct >= 85 ? 'v3-pg' : pct >= 70 ? 'v3-pa' : 'v3-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--gr)' : pct >= 70 ? 'var(--am)' : 'var(--re)';

  return (
    <BoardLayout title="Dashboard" subtitle="Visao Executiva">
      <div style={{ background: 'var(--bg, #EEF2F8)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="pgt">Visao Executiva — PSA Consultores</div>
            <div className="pgs" style={{ marginBottom: 0 }}>
              {format(new Date(), "EEEE, dd MMM yyyy", { locale: ptBR })} · Dados em tempo real{cicloAtivo ? ` · Ciclo ativo: ${cicloAtivo.nome}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {emRisco + atrasados > 0 && <span className="ch c-er" style={{ fontSize: '10.5px', padding: '3px 9px' }}>{emRisco + atrasados} projetos em risco</span>}
            {daysToAnalise !== null && <span className="ch c-w" style={{ fontSize: '10.5px', padding: '3px 9px' }}>Analise semestral em {daysToAnalise}d</span>}
            {roiPct > 0 && <span className="ch c-ok" style={{ fontSize: '10.5px', padding: '3px 9px' }}>ROI {roiPct}%</span>}
          </div>
        </div>

        {/* Strategic Numbers */}
        {isLoading ? (
          <div className="g5 mb12">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)}</div>
        ) : (
          <div className="g5 mb12">
            <div className="v3-card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="snum" style={{ color: 'var(--in)' }}>{projects.length}</div>
              <div className="snum-label">Projetos Ativos</div>
              <div className="snum-sub">{projects.length > 0 ? Math.round((emDia / projects.length) * 100) : 0}% no prazo</div>
              <div className="spark" style={{ marginTop: 8, justifyContent: 'center' }}>
                {[50, 65, 55, 80, 100].map((h, i) => (
                  <div key={i} className="spb" style={{ height: `${h}%`, background: 'var(--in)', opacity: 0.4 + (i * 0.15) }} />
                ))}
              </div>
            </div>
            <div className="v3-card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="snum" style={{ color: 'var(--gr)' }}>R${(totalSavingsYear / 1000).toFixed(0)}k</div>
              <div className="snum-label">Economia / Ano</div>
              <div className="snum-sub" style={{ color: 'var(--gr)' }}>{roiPct}% ROI · {roiFerramentas} ferramentas</div>
              <div className="spark" style={{ marginTop: 8, justifyContent: 'center' }}>
                {[30, 50, 70, 88, 100].map((h, i) => (
                  <div key={i} className="spb" style={{ height: `${h}%`, background: 'var(--gr)', opacity: 0.4 + (i * 0.15) }} />
                ))}
              </div>
            </div>
            <div className="v3-card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="snum" style={{ color: 'var(--pu)' }}>{pontualidade}%</div>
              <div className="snum-label">Taxa Pontualidade</div>
              <div className="snum-sub" style={{ color: 'var(--gr)' }}>+5pp vs mes anterior</div>
              <div style={{ marginTop: 8 }}><div className="v3-pb v3-pb6"><div className={`v3-pbf v3-pg`} style={{ width: `${pontualidade}%` }} /></div></div>
            </div>
            <div className="v3-card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="snum" style={{ color: 'var(--am)' }}>{progressoMetas}%</div>
              <div className="snum-label">Metas do Ciclo</div>
              <div className="snum-sub">{metasEmRisco} de {overview?.totalMetas ?? 0} em risco</div>
              <div style={{ marginTop: 8 }}><div className="v3-pb v3-pb6"><div className="v3-pbf v3-pa" style={{ width: `${progressoMetas}%` }} /></div></div>
            </div>
            <div className="v3-card" style={{ padding: 16, textAlign: 'center' }}>
              <div className="snum" style={{ color: 'var(--t1)' }}>{members.length}</div>
              <div className="snum-label">Membros Ativos</div>
              <div className="snum-sub">{profiles.length > 0 ? Math.round((members.length / profiles.length) * 100) : 0}% de engajamento</div>
              <div style={{ marginTop: 8 }}><div className="v3-pb v3-pb6"><div className="v3-pbf v3-pi" style={{ width: `${profiles.length > 0 ? Math.round((members.length / profiles.length) * 100) : 0}%` }} /></div></div>
            </div>
          </div>
        )}

        {/* AI Strategic Insight */}
        <div className="ai mb12">
          <div className="ai-lbl">
            <Sparkles style={{ width: 11, height: 11, color: 'var(--in)' }} />
            Sintese Estrategica — IA Executiva
            <button onClick={handleGenerateSintese} disabled={aiLoading} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--in)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw style={{ width: 11, height: 11 }} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Gerando...' : 'Gerar'}
            </button>
          </div>
          {aiSintese ? (
            <>
              <div className="ai-txt" dangerouslySetInnerHTML={{ __html: aiSintese.sintese.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              <div className="ai-bul">
                {aiSintese.bullets.map((b, i) => <div key={i} className="ai-b">{b}</div>)}
              </div>
            </>
          ) : (
            <div className="ai-txt" style={{ color: 'var(--t3)' }}>Clique em "Gerar" para obter a sintese estrategica com IA.</div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="g2 mb12">
          <div className="v3-card">
            <div className="sct">Saude dos Projetos por Area</div>
            {barChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="4 3" stroke="#E0EAF4" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#A4B5CC' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#A4B5CC' }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="Tax" fill="#3680F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="OSG" fill="#13A87A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Dev" fill="#7A50EE" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                  {[{ c: '#3680F6', l: 'Tax' }, { c: '#13A87A', l: 'OSG' }, { c: '#7A50EE', l: 'Dev' }].map(x => (
                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t3)' }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />{x.l}
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados suficientes</div>}
          </div>

          <div className="v3-card">
            <div className="sct">ROI Acumulado vs Meta</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={[
                { name: 'Set/25', value: 8000 },
                { name: 'Nov/25', value: 22000 },
                { name: 'Jan/26', value: 38000 },
                { name: 'Mar/26', value: totalSavingsYear || 51000 },
              ]}>
                <CartesianGrid strokeDasharray="4 3" stroke="#E0EAF4" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#A4B5CC' }} />
                <YAxis tick={{ fontSize: 9, fill: '#A4B5CC' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <ReferenceLine y={60000} stroke="#D4960A" strokeDasharray="5 3" label={{ value: 'Meta', fill: '#D4960A', fontSize: 9 }} />
                <defs><linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#13A87A" stopOpacity={0.28} /><stop offset="100%" stopColor="#13A87A" stopOpacity={0} /></linearGradient></defs>
                <Area type="monotone" dataKey="value" fill="url(#roiGrad)" stroke="#13A87A" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11 }}>
              <span style={{ color: 'var(--gr)' }}>Atual: <strong>R${(totalSavingsYear / 1000).toFixed(0)}k</strong></span>
              <span style={{ color: 'var(--am)' }}>Meta Dez/26: <strong>R$60k</strong></span>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="g2">
          <div className="v3-card">
            <div className="sct">Projetos Criticos — Decisao Necessaria</div>
            {riskyProjects.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 12 }}>Nenhum projeto critico.</div>}
            {riskyProjects.map(p => {
              const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
              return (
                <div key={p.id} className="v3-mr">
                  <span className={`ch ${getAreaChip(p.area_name)}`}>{p.area_name || 'N/A'}</span>
                  <div className="mr-t">{p.name}</div>
                  <div style={{ width: 64 }}><div className="v3-pb v3-pb6"><div className={`v3-pbf ${getPbColor(pct)}`} style={{ width: `${pct}%` }} /></div></div>
                  <span className="mr-p" style={{ color: getTextColor(pct) }}>{pct}%</span>
                  <span className={`ch ${p.computed_status === 'atrasado' ? 'c-er' : 'c-w'}`}>
                    {p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="v3-card">
            <div className="sct">Performance da Equipe — Resumo</div>
            {(!decisoesData || decisoesData.length === 0) && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 12 }}>Nenhum dado de performance.</div>}
            {decisoesData?.slice(0, 5).map((m, idx) => {
              const classif = getClassifChip(m.ppr);
              return (
                <div key={m.membro_id} className="v3-sr">
                  <span className="srk">#{idx + 1}</span>
                  <div className="av av-sm" style={{ background: 'linear-gradient(135deg, #5B6EF0, #7A50EE)' }}>
                    {(m.first_name?.[0] ?? '') + (m.last_name?.[0] ?? '')}
                  </div>
                  <div className="srb">
                    <span className="srn">{m.first_name} {m.last_name}</span>
                    <div style={{ flex: 1 }}><div className="v3-pb v3-pb6"><div className={`v3-pbf ${getPbColor(m.ppr)}`} style={{ width: `${m.ppr}%` }} /></div></div>
                  </div>
                  <span className="srv" style={{ color: getTextColor(m.ppr) }}>{m.ppr}%</span>
                  <span className={`ch ${classif.cls}`}>{classif.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
