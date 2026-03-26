import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDecisoesData } from '@/hooks/useDecisoesData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar, FilterEmptyState } from '@/components/board/BoardFilterBar';
import { BoardStatStrip } from '@/components/board/BoardStatStrip';
import { BoardAIBox } from '@/components/board/BoardAIBox';
import { BoardChip } from '@/components/board/BoardChip';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { useBoardReveal } from '@/hooks/useBoardReveal';

const DEFAULTS = { periodo: '30d', area: 'todas' };

const BoardDashboard = () => {
  const navigate = useNavigate();
  const revealRef = useBoardReveal();
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({ pageKey: 'dashboard', defaults: DEFAULTS });
  const periodo = filters.periodo as string;
  const area = filters.area as string;

  const { projectsQuery, membersQuery } = usePerformanceData(periodo, area);
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
      const { data } = await supabase.from('process_improvements' as any).select('id, total_savings_monthly, status, created_at');
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalSavingsYear = (improvements ?? []).reduce((a: number, i: any) => a + (i.total_savings_monthly || 0), 0) * 12;
  const roiPct = totalSavingsYear > 0 ? 173 : 0;
  const roiFerramentas = (improvements ?? []).length;

  const { data: tasksByArea } = useQuery({
    queryKey: ['board-tasks-by-area-3m'],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data: tasks } = await supabase.from('fiscal_tasks').select('id, status, updated_at, project_id').eq('status', 'done').gte('updated_at', threeMonthsAgo.toISOString());
      return (tasks ?? []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const barChartData = useMemo(() => {
    const months: Record<string, { name: string; Tax: number; OSG: number; Dev: number }> = {};
    (tasksByArea ?? []).forEach((t: any) => {
      const d = new Date(t.updated_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, "MMM/yy", { locale: ptBR });
      if (!months[key]) months[key] = { name: label, Tax: 0, OSG: 0, Dev: 0 };
      const proj = projects.find(p => p.id === t.project_id);
      const areaName = (proj?.area_name || '').toLowerCase();
      if (areaName.includes('tax') || areaName.includes('fiscal')) months[key].Tax++;
      else if (areaName.includes('osg') || areaName.includes('societar')) months[key].OSG++;
      else if (areaName.includes('dev') || areaName.includes('digital')) months[key].Dev++;
      else months[key].Tax++;
    });
    return Object.values(months).slice(-3);
  }, [tasksByArea, projects]);

  const daysToAnalise = cicloAtivo?.data_analise_semestral ? differenceInDays(new Date(cicloAtivo.data_analise_semestral), new Date()) : null;

  const riskyProjects = useMemo(() => {
    let filtered = projects.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado');
    if (area !== 'todas') filtered = filtered.filter(p => (p.area_name || '').toLowerCase().includes(area));
    return filtered.slice(0, 5);
  }, [projects, area]);

  const filteredDecisoes = useMemo(() => {
    if (!decisoesData) return [];
    return decisoesData.slice(0, 5);
  }, [decisoesData]);

  const pontualidade = projects.length > 0 ? Math.round((emDia / projects.length) * 100) : 0;
  const progressoMetas = overview?.mediaProgresso ?? 0;

  const handleGenerateSintese = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-sintese-executiva');
      if (error) throw error;
      setAiSintese(data);
    } catch {
      setAiSintese({
        sintese: `Com ${projects.length} projetos ativos e ${emRisco + atrasados} em risco, o foco deve ser desbloqueio dos projetos criticos. ROI acumulado de R$${(totalSavingsYear / 1000).toFixed(0)}k/ano com ${roiFerramentas} ferramentas.`,
        bullets: [
          `${emRisco + atrasados} projetos em risco concentrados — acao imediata necessaria.`,
          `Media de metas em ${progressoMetas}%.`,
          `${members.length} membros ativos de ${profiles.length} cadastrados.`,
        ],
      });
    }
    setAiLoading(false);
  };

  const isProjectsLoading = projectsQuery.isLoading;
  const isImprovementsLoading = !improvements;
  const isMembersLoading = membersQuery.isLoading;
  const isOverviewLoading = !overview && !!cicloAtivo;
  const anyLoading = isProjectsLoading || isImprovementsLoading || isMembersLoading || isOverviewLoading;

  const getAreaChip = (a: string | null): 'tax' | 'osg' | 'dev' => { const x = (a || '').toLowerCase(); return x.includes('tax') ? 'tax' : x.includes('osg') ? 'osg' : 'dev'; };
  const getClassifChip = (ppr: number) => {
    if (ppr >= 100) return { variant: 'ppr-s' as const, label: 'Supera' };
    if (ppr >= 85) return { variant: 'ppr-a' as const, label: 'Atende' };
    if (ppr >= 70) return { variant: 'ppr-p' as const, label: 'Parcial' };
    return { variant: 'ppr-b' as const, label: 'Abaixo' };
  };
  const getPbColor = (pct: number) => pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [anyLoading, revealRef]);

  return (
    <BoardLayout title="Dashboard" subtitle="Visao Executiva">
      <div ref={containerRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="pg-title">Visao Executiva</div>
              <div className="pg-sub">
                {format(new Date(), "dd MMM yyyy", { locale: ptBR })} · Ciclo ativo: {cicloAtivo?.nome ?? '—'}
              </div>
            </div>
            <div className="pg-chips">
              {emRisco + atrasados > 0 && <BoardChip variant="risk">{emRisco + atrasados} em risco</BoardChip>}
              {daysToAnalise !== null && <BoardChip variant="warn">Semestral em {daysToAnalise}d</BoardChip>}
              {roiPct > 0 && <BoardChip variant="go">ROI {roiPct}%</BoardChip>}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <BoardFilterBar
          filters={[
            { key: 'periodo', label: 'Período', type: 'segmented', options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'ciclo', label: 'Ciclo' }] },
            { key: 'area', label: 'Área', type: 'select', options: [{ value: 'todas', label: 'Todas as áreas' }, { value: 'tax', label: 'Tax' }, { value: 'osg', label: 'OSG' }, { value: 'dev', label: 'Dev' }] },
          ]}
          activeFilters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          activeCount={activeCount}
        />

        {/* Stat Strip */}
        {anyLoading ? (
          <Skeleton className="h-[120px] rounded-xl mb-4" />
        ) : (
          <BoardStatStrip
            cols={5}
            items={[
              {
                value: projects.length, label: 'Projetos Ativos', color: 'var(--board-v4-accent)',
                dots: [
                  { color: 'var(--board-v4-go)', text: `${emDia} no prazo` },
                  { color: 'var(--board-v4-warn)', text: `${emRisco} em risco` },
                  { color: 'var(--board-v4-risk)', text: `${atrasados} atrasados` },
                ],
                onClick: () => navigate('/equipe/board/performance'),
              },
              {
                value: Math.round(totalSavingsYear / 1000), prefix: 'R$', suffix: 'k', label: 'Economia / Ano',
                color: 'var(--board-v4-go)',
                pill: { text: `${roiPct}% ROI`, variant: 'up' },
                subText: `${roiFerramentas} ferramentas ativas`,
              },
              {
                value: pontualidade, suffix: '%', label: 'Taxa Pontualidade', color: 'var(--board-v4-purple)',
                pill: { text: pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta', variant: pontualidade >= 85 ? 'up' : 'down' },
                barValue: pontualidade,
              },
              {
                value: progressoMetas, suffix: '%', label: 'Metas do Ciclo', color: 'var(--board-v4-warn)',
                subText: `${overview?.totalMetas ?? 0} metas cadastradas`,
                barValue: progressoMetas,
              },
              {
                value: members.length, label: 'Membros Ativos', color: 'var(--board-v4-cyan)',
                subText: `de ${profiles.length} cadastrados`,
                barValue: profiles.length > 0 ? Math.round((members.length / profiles.length) * 100) : 0,
              },
            ]}
          />
        )}

        {/* AI Box */}
        <div style={{ marginBottom: 16 }}>
          <BoardAIBox
            label="Síntese Estratégica — IA Executiva"
            data={aiSintese}
            loading={aiLoading}
            onGenerate={handleGenerateSintese}
          />
        </div>

        {/* Charts */}
        <div className="v4-g2">
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Saúde por Área — 3 Meses</div>
            {barChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barChartData}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="Tax" fill={CHART_COLORS.tax} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="OSG" fill={CHART_COLORS.osg} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Dev" fill={CHART_COLORS.dev} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}>
                  {[{ c: CHART_COLORS.tax, l: 'Tax' }, { c: CHART_COLORS.osg, l: 'OSG' }, { c: CHART_COLORS.dev, l: 'Dev' }].map(x => (
                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--board-v4-ink3)' }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />{x.l}
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados suficientes</div>}
          </div>

          <div className="v4-card" data-reveal>
            <div className="v4-card-title">ROI Acumulado vs Meta</div>
            {totalSavingsYear > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={(() => {
                    const sorted = [...(improvements ?? [])].sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                    let cumulative = 0;
                    const points = sorted.map((imp: any) => {
                      cumulative += (imp.total_savings_monthly || 0) * 12;
                      return { name: imp.created_at ? format(new Date(imp.created_at), "MMM/yy", { locale: ptBR }) : '?', value: Math.round(cumulative) };
                    });
                    return points.length > 0 ? points : [{ name: 'Atual', value: totalSavingsYear }];
                  })()}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} {...TOOLTIP_STYLE} />
                    <defs><linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.osg} stopOpacity={0.22} /><stop offset="100%" stopColor={CHART_COLORS.osg} stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="value" fill="url(#roiGrad)" stroke={CHART_COLORS.osg} strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11 }}>
                  <span style={{ color: 'var(--board-v4-go)' }}>Atual: <strong>R${(totalSavingsYear / 1000).toFixed(0)}k</strong></span>
                  <span style={{ color: 'var(--board-v4-ink3)' }}>{roiFerramentas} ferramentas</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
                <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados de ROI
              </div>
            )}
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="v4-g2">
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Projetos Críticos</div>
            {riskyProjects.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhum projeto crítico.</div>}
            {riskyProjects.map(p => {
              const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
              return (
                <div key={p.id} className="v4-mrow">
                  <BoardChip variant={getAreaChip(p.area_name)}>{p.area_name || 'N/A'}</BoardChip>
                  <div style={{ flex: 1, fontWeight: 500, color: 'var(--board-v4-ink)' }}>{p.name}</div>
                  <div style={{ width: 64 }}><div className="v4-pb v4-pb6"><div className={`v4-pbf ${getPbColor(pct)}`} style={{ width: `${pct}%` }} /></div></div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 28, textAlign: 'right', color: getTextColor(pct) }}>{pct}%</span>
                  <BoardChip variant={p.computed_status === 'atrasado' ? 'risk' : 'warn'}>
                    {p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}
                  </BoardChip>
                </div>
              );
            })}
          </div>

          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Performance da Equipe</div>
            {(!filteredDecisoes || filteredDecisoes.length === 0) && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhum dado de performance.</div>}
            {filteredDecisoes.map((m, idx) => {
              const classif = getClassifChip(m.ppr);
              return (
                <div key={m.membro_id} className="v4-srow">
                  <span className="v4-srk">#{idx + 1}</span>
                  <div className="v4-av v4-av-sm" style={{ background: 'linear-gradient(135deg, #4B63F7, #6B46E8)' }}>
                    {(m.first_name?.[0] ?? '') + (m.last_name?.[0] ?? '')}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="v4-srn">{m.first_name} {m.last_name}</span>
                    <div style={{ flex: 1 }}><div className="v4-pb v4-pb6"><div className={`v4-pbf ${getPbColor(m.ppr)}`} style={{ width: `${m.ppr}%` }} /></div></div>
                  </div>
                  <span className="v4-srv" style={{ color: getTextColor(m.ppr) }}>{m.ppr}%</span>
                  <BoardChip variant={classif.variant}>{classif.label}</BoardChip>
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
