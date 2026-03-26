import { useState, useEffect, useMemo } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { RefreshCw, BarChart2 } from 'lucide-react';
import { usePerformanceData, useSavePerformancePrefs } from '@/hooks/usePerformanceData';
import { ActivityHeatmap } from '@/components/performance/ActivityHeatmap';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar, FilterEmptyState } from '@/components/board/BoardFilterBar';
import { BoardStatStrip } from '@/components/board/BoardStatStrip';
import { BoardChip } from '@/components/board/BoardChip';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { useBoardReveal } from '@/hooks/useBoardReveal';

const DEFAULTS = { periodo: '30d', area: 'todas', search: '', statusFilter: 'todos', ordenacao: 'prazo_asc' };

const PerformanceDashboard = () => {
  const revealRef = useBoardReveal();
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({ pageKey: 'performance', defaults: DEFAULTS });
  const periodo = filters.periodo as string;
  const area = filters.area as string;
  const searchTerm = filters.search as string;
  const statusFilter = filters.statusFilter as string;
  const ordenacao = filters.ordenacao as string;

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const savePrefs = useSavePerformancePrefs();

  const {
    prefsQuery, cicloQuery, projectsQuery, ticketsQuery,
    membersQuery, metasQuery, periodTasksQuery, roiQuery,
    heatmapTasksQuery, last3MonthsTasksQuery,
  } = usePerformanceData(periodo, area);

  useEffect(() => {
    if (prefsQuery.data) {
      const prefs = prefsQuery.data as any;
      if (prefs.periodo_padrao && prefs.periodo_padrao !== periodo) setFilter('periodo', prefs.periodo_padrao);
      if (prefs.area_padrao && prefs.area_padrao !== area) setFilter('area', prefs.area_padrao);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsQuery.data]);

  const handlePeriodChange = (v: string) => { setFilter('periodo', v); savePrefs.mutate({ periodo_padrao: v }); };
  const handleAreaChange = (v: string) => { setFilter('area', v); savePrefs.mutate({ area_padrao: v }); };
  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && ((q.queryKey[0] as string).startsWith('perf') || (q.queryKey[0] as string).startsWith('board-')) });
    setLastUpdate(new Date());
  };

  const projects = projectsQuery.data || [];
  const members = membersQuery.data?.members || [];
  const profiles = membersQuery.data?.profiles || [];
  const metas = (metasQuery.data || []) as any[];
  const periodTasks = periodTasksQuery.data || [];
  const heatmapTasks = heatmapTasksQuery.data || [];
  const last3MonthsTasks = last3MonthsTasksQuery.data || [];
  const roiData = roiQuery.data || [];

  const emDia = projects.filter(p => p.computed_status === 'em_dia').length;
  const emRisco = projects.filter(p => p.computed_status === 'em_risco').length;
  const atrasados = projects.filter(p => p.computed_status === 'atrasado').length;

  const totalSavingsYear = roiData.reduce((a: number, i: any) => a + (i.total_savings_monthly || 0), 0) * 12;
  const pontualidade = projects.length > 0 ? Math.round((emDia / projects.length) * 100) : 0;

  const tempoMedio = useMemo(() => {
    const done = periodTasks.filter((t: any) => t.status === 'done' && t.updated_at && t.due_date);
    if (done.length === 0) return '—';
    const avg = done.reduce((a: number, t: any) => {
      const diff = Math.max(1, differenceInDays(parseISO(t.updated_at), parseISO(t.due_date)));
      return a + Math.abs(diff);
    }, 0) / done.length;
    return `${avg.toFixed(1)}d`;
  }, [periodTasks]);

  const progressoMetas = useMemo(() => {
    const individuais = metas.filter((m: any) => m.nivel === 'individual');
    if (individuais.length === 0) return 0;
    return Math.round(individuais.reduce((a: number, m: any) => a + (m.progresso_atual ?? 0), 0) / individuais.length);
  }, [metas]);

  const metasEmRisco = metas.filter((m: any) => m.progresso_atual < 70 && m.status === 'ativa').length;

  const barChartData = useMemo(() => {
    const months: Record<string, { name: string; Tax: number; OSG: number; Dev: number }> = {};
    const doneTasks = last3MonthsTasks.filter((t: any) => t.status === 'done');
    doneTasks.forEach((t: any) => {
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
  }, [last3MonthsTasks, projects]);

  const contribution = useMemo(() => {
    const map = new Map<string, { tasks: number; onTime: number }>();
    periodTasks.forEach((t: any) => {
      if (!t.assigned_to) return;
      const cur = map.get(t.assigned_to) || { tasks: 0, onTime: 0 };
      cur.tasks++;
      if (t.status === 'done') cur.onTime++;
      map.set(t.assigned_to, cur);
    });
    return profiles.map((p: any) => {
      const data = map.get(p.id) || { tasks: 0, onTime: 0 };
      const metasMembro = metas.filter((m: any) => m.responsavel_id === p.id && m.nivel === 'individual');
      const somaPesos = metasMembro.reduce((a: number, m: any) => a + (m.peso ?? 1), 0);
      const somaProg = metasMembro.reduce((a: number, m: any) => a + ((m.progresso_atual ?? 0) * (m.peso ?? 1)), 0);
      const ppr = somaPesos > 0 ? Math.round(somaProg / somaPesos) : 0;
      return { id: p.id, name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(), initials: `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`, tasks: data.tasks, ppr };
    }).filter(x => x.tasks > 0 || x.ppr > 0).sort((a, b) => b.ppr - a.ppr);
  }, [periodTasks, profiles, metas]);

  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      if (statusFilter !== 'todos' && p.computed_status !== statusFilter) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    switch (ordenacao) {
      case 'nome_az': result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'progresso_asc': result = [...result].sort((a, b) => (a.total_tasks > 0 ? a.completed_tasks / a.total_tasks : 0) - (b.total_tasks > 0 ? b.completed_tasks / b.total_tasks : 0)); break;
      case 'progresso_desc': result = [...result].sort((a, b) => (b.total_tasks > 0 ? b.completed_tasks / b.total_tasks : 0) - (a.total_tasks > 0 ? a.completed_tasks / a.total_tasks : 0)); break;
      case 'prazo_desc': result = [...result].sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()); break;
      default: result = [...result].sort((a, b) => new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime()); break;
    }
    return result;
  }, [projects, statusFilter, searchTerm, ordenacao]);

  const getAreaChip = (a: string | null): 'tax' | 'osg' | 'dev' => { const x = (a || '').toLowerCase(); return x.includes('tax') ? 'tax' : x.includes('osg') ? 'osg' : 'dev'; };
  const getStatusChip = (s: string): 'go' | 'warn' | 'risk' => s === 'em_dia' ? 'go' : s === 'em_risco' ? 'warn' : 'risk';
  const getStatusLabel = (s: string) => s === 'em_dia' ? 'Em dia' : s === 'em_risco' ? 'Em risco' : 'Atrasado';
  const getPbColor = (pct: number) => pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';
  const getClassifChip = (ppr: number) => {
    if (ppr >= 100) return { variant: 'ppr-s' as const, label: 'Supera' };
    if (ppr >= 85) return { variant: 'ppr-a' as const, label: 'Atende' };
    if (ppr >= 70) return { variant: 'ppr-p' as const, label: 'Parcial' };
    return { variant: 'ppr-b' as const, label: 'Abaixo' };
  };

  const isLoading = projectsQuery.isLoading && membersQuery.isLoading;

  return (
    <BoardLayout title="Performance" subtitle="Visao consolidada">
      <div ref={revealRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div className="pg-title">Performance</div>
          <div className="pg-sub">Visao consolidada de projetos, equipe e ROI — dados em tempo real</div>
        </div>

        {/* Filter Bar */}
        <BoardFilterBar
          filters={[
            { key: 'periodo', label: 'Período', type: 'segmented', options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'ciclo', label: 'Ciclo' }] },
            { key: 'area', label: 'Área', type: 'select', options: [{ value: 'todas', label: 'Todas as áreas' }, { value: 'tax', label: 'Tax' }, { value: 'osg', label: 'OSG' }, { value: 'dev', label: 'Dev' }] },
          ]}
          activeFilters={filters}
          onFilterChange={(key, value) => {
            if (key === 'periodo') handlePeriodChange(value as string);
            else if (key === 'area') handleAreaChange(value as string);
            else setFilter(key, value);
          }}
          onReset={resetFilters}
          activeCount={activeCount}
          rightSlot={
            <>
              <span style={{ fontSize: 11, color: 'var(--board-v4-ink4)' }}>Atualizado {format(lastUpdate, 'HH:mm')}</span>
              <button className="v3-fi" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 10px' }}>
                <RefreshCw style={{ width: 11, height: 11 }} />Atualizar
              </button>
            </>
          }
        />

        {/* Stat Strip */}
        {isLoading ? (
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
              },
              {
                value: pontualidade, suffix: '%', label: 'Taxa Pontualidade', color: 'var(--board-v4-go)',
                pill: { text: pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo', variant: pontualidade >= 85 ? 'up' : 'down' },
              },
              {
                value: tempoMedio, label: 'Tempo Médio', color: 'var(--board-v4-warn)', animateCount: false,
                pill: { text: 'estável', variant: 'neutral' },
              },
              {
                value: Math.round(totalSavingsYear / 1000), prefix: 'R$', suffix: 'k', label: 'ROI Acumulado',
                color: 'var(--board-v4-cyan)',
                pill: { text: totalSavingsYear > 0 ? '173% ROI' : '0%', variant: 'up' },
              },
              {
                value: progressoMetas, suffix: '%', label: 'Metas do Ciclo', color: 'var(--board-v4-purple)',
                subText: metasEmRisco > 0 ? `${metasEmRisco} em risco` : 'No alvo',
                barValue: progressoMetas,
              },
            ]}
          />
        )}

        {/* Charts */}
        <div className="v4-g2">
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Desempenho por Área — Últimos 3 Meses</div>
            {barChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
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
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados</div>}
          </div>

          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Contribuição Individual — {periodo}</div>
            {contribution.map((m, idx) => {
              const classif = getClassifChip(m.ppr);
              return (
                <div key={m.id} className="v4-srow" style={{ cursor: 'pointer' }} onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}>
                  <span className="v4-srk">#{idx + 1}</span>
                  <div className="v4-av v4-av-sm" style={{ background: 'linear-gradient(135deg, #4B63F7, #6B46E8)' }}>{m.initials}</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="v4-srn">{m.name}</span>
                    <div style={{ flex: 1 }}><div className="v4-pb v4-pb6"><div className={`v4-pbf ${getPbColor(m.ppr)}`} style={{ width: `${Math.min(m.ppr, 100)}%` }} /></div></div>
                  </div>
                  <span className="v4-srv" style={{ color: getTextColor(m.ppr) }}>{m.ppr}</span>
                  <BoardChip variant={classif.variant}>{classif.label}</BoardChip>
                </div>
              );
            })}
            {contribution.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Sem dados de contribuição no período.</div>}

            <div className="v4-slabel" style={{ marginTop: 16 }}>Atividade — Últimos 90 dias {selectedMemberId && '(filtrado)'}</div>
            <ActivityHeatmap tasks={heatmapTasks} selectedMemberId={selectedMemberId} />
          </div>
        </div>

        {/* Projects Table */}
        <div className="v4-card" style={{ marginBottom: 16 }} data-reveal>
          <div className="v4-card-title">Projetos — Tabela Completa</div>
          <BoardFilterBar
            filters={[
              { key: 'search', label: 'Busca', type: 'search', placeholder: 'Buscar projeto ou cliente...' },
              { key: 'statusFilter', label: 'Status', type: 'select', options: [{ value: 'todos', label: 'Todos os status' }, { value: 'em_dia', label: 'Em dia' }, { value: 'em_risco', label: 'Em risco' }, { value: 'atrasado', label: 'Atrasado' }] },
              { key: 'ordenacao', label: 'Ordenar', type: 'select', options: [{ value: 'prazo_asc', label: 'Prazo ↑' }, { value: 'prazo_desc', label: 'Prazo ↓' }, { value: 'nome_az', label: 'Nome A–Z' }, { value: 'progresso_asc', label: 'Progresso ↑' }, { value: 'progresso_desc', label: 'Progresso ↓' }] },
            ]}
            activeFilters={filters}
            onFilterChange={setFilter}
            activeCount={[searchTerm, statusFilter !== 'todos' ? statusFilter : '', ordenacao !== 'prazo_asc' ? ordenacao : ''].filter(Boolean).length}
            resultCount={filteredProjects.length}
            totalCount={projects.length}
          />
          {filteredProjects.length === 0 ? (
            <FilterEmptyState onReset={() => { setFilter('search', ''); setFilter('statusFilter', 'todos'); }} />
          ) : (
            <div className="v3-tw">
              <table>
                <thead><tr><th>Projeto</th><th>Cliente/Área</th><th>Área</th><th>Responsável</th><th>Progresso</th><th>Prazo</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredProjects.map(p => {
                    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                    const daysLeft = p.end_date ? differenceInDays(new Date(p.end_date), new Date()) : null;
                    return (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td style={{ color: 'var(--board-v4-ink3)' }}>{p.client_name || '—'}</td>
                        <td><BoardChip variant={getAreaChip(p.area_name)}>{p.area_name || 'N/A'}</BoardChip></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="v4-av v4-av-sm" style={{ background: 'linear-gradient(135deg, #4B63F7, #3478F5)', width: 22, height: 22, fontSize: 9, borderRadius: 5 }}>{p.responsible_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}</div>
                            <span>{p.responsible_name?.split(' ')[0] || '—'}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="v4-pb v4-pb6" style={{ flex: 1 }}><div className={`v4-pbf ${getPbColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: getTextColor(pct) }}>{pct}%</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: '11.5px', fontWeight: 600, color: daysLeft !== null && daysLeft < 0 ? 'var(--board-v4-risk)' : daysLeft !== null && daysLeft < 15 ? 'var(--board-v4-warn)' : 'var(--board-v4-ink3)' }}>{daysLeft !== null ? `${daysLeft > 0 ? '+' : ''}${daysLeft} dias` : '—'}</span></td>
                        <td><BoardChip variant={getStatusChip(p.computed_status)}>{getStatusLabel(p.computed_status)}</BoardChip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </BoardLayout>
  );
};

export default PerformanceDashboard;
