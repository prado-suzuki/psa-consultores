import { useState, useEffect, useMemo } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { RefreshCw, BarChart2 } from 'lucide-react';
import { usePerformanceData, useSavePerformancePrefs } from '@/hooks/usePerformanceData';
import { ActivityHeatmap } from '@/components/performance/ActivityHeatmap';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar, FilterEmptyState } from '@/components/board/BoardFilterBar';

const DEFAULTS = { periodo: '30d', area: 'todas', search: '', statusFilter: 'todos', ordenacao: 'prazo_asc' };

const PerformanceDashboard = () => {
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
  const ciclo = cicloQuery.data;

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

  // Filtered projects for table
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      if (statusFilter !== 'todos' && p.computed_status !== statusFilter) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    // Sort
    switch (ordenacao) {
      case 'nome_az': result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'progresso_asc': result = [...result].sort((a, b) => (a.total_tasks > 0 ? a.completed_tasks / a.total_tasks : 0) - (b.total_tasks > 0 ? b.completed_tasks / b.total_tasks : 0)); break;
      case 'progresso_desc': result = [...result].sort((a, b) => (b.total_tasks > 0 ? b.completed_tasks / b.total_tasks : 0) - (a.total_tasks > 0 ? a.completed_tasks / a.total_tasks : 0)); break;
      case 'prazo_desc': result = [...result].sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()); break;
      default: result = [...result].sort((a, b) => new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime()); break;
    }
    return result;
  }, [projects, statusFilter, searchTerm, ordenacao]);

  const getAreaChip = (a: string | null) => { const x = (a || '').toLowerCase(); return x.includes('tax') ? 'c-tax' : x.includes('osg') ? 'c-osg' : 'c-dev'; };
  const getStatusChip = (s: string) => s === 'em_dia' ? 'c-ok' : s === 'em_risco' ? 'c-w' : 'c-er';
  const getStatusLabel = (s: string) => s === 'em_dia' ? 'Em dia' : s === 'em_risco' ? 'Em risco' : 'Atrasado';
  const getPbColor = (pct: number) => pct >= 85 ? 'v3-pg' : pct >= 70 ? 'v3-pa' : 'v3-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--gr)' : pct >= 70 ? 'var(--am)' : 'var(--re)';
  const getClassifChip = (ppr: number) => {
    if (ppr >= 100) return { cls: 'c-ppr-s', label: 'Supera' };
    if (ppr >= 85) return { cls: 'c-ppr-a', label: 'Atende' };
    if (ppr >= 70) return { cls: 'c-ppr-p', label: 'Parcial' };
    return { cls: 'c-ppr-b', label: 'Abaixo' };
  };

  const isLoading = projectsQuery.isLoading && membersQuery.isLoading;

  return (
    <BoardLayout title="Performance" subtitle="Visao consolidada">
      <div style={{ background: 'var(--bg, #EEF2F8)' }}>
        <div className="pgt" style={{ marginBottom: 2 }}>Performance</div>
        <div className="pgs">Visao consolidada de projetos, equipe e ROI — dados em tempo real</div>

        {/* Global Filter Bar */}
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
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>Atualizado {format(lastUpdate, 'HH:mm')}</span>
              <button className="v3-fi" onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 10px' }}>
                <RefreshCw style={{ width: 11, height: 11 }} />Atualizar
              </button>
            </>
          }
        />

        {/* KPIs */}
        {isLoading ? (
          <div className="g5 mb12">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}</div>
        ) : (
          <div className="g5 mb12">
            <div className="kpi">
              <div className="ktb" style={{ background: 'var(--in)' }} />
              <div className="kv" style={{ fontSize: 22, marginTop: 6 }}>{projects.length}</div>
              <div className="kl" style={{ fontSize: '9.5px' }}>Projetos Ativos</div>
              <div className="ksubs">
                <div className="ksub"><span className="v3-dot" style={{ background: 'var(--gr)' }} />{emDia} no prazo</div>
                <div className="ksub"><span className="v3-dot" style={{ background: 'var(--am)' }} />{emRisco} em risco</div>
                <div className="ksub"><span className="v3-dot" style={{ background: 'var(--re)' }} />{atrasados} atrasados</div>
              </div>
            </div>
            <div className="kpi">
              <div className="ktb" style={{ background: 'var(--gr)' }} />
              <div className="kv" style={{ fontSize: 22, marginTop: 6 }}>{pontualidade}%</div>
              <div className="kl" style={{ fontSize: '9.5px' }}>Taxa Pontualidade</div>
              <div className="ksubs"><span className={`v3-tr ${pontualidade >= 85 ? 'v3-tr-u' : 'v3-tr-d'}`}>{pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta'}</span></div>
            </div>
            <div className="kpi">
              <div className="ktb" style={{ background: 'var(--am)' }} />
              <div className="kv" style={{ fontSize: 22, marginTop: 6 }}>{tempoMedio}</div>
              <div className="kl" style={{ fontSize: '9.5px' }}>Tempo Medio Tarefa</div>
              <div className="ksubs"><span className="v3-tr v3-tr-n">estavel</span></div>
            </div>
            <div className="kpi">
              <div className="ktb" style={{ background: 'var(--cy)' }} />
              <div className="kv" style={{ fontSize: 22, marginTop: 6 }}>R${(totalSavingsYear / 1000).toFixed(0)}k</div>
              <div className="kl" style={{ fontSize: '9.5px' }}>ROI Acumulado</div>
              <div className="ksubs"><span className="v3-tr v3-tr-u">{totalSavingsYear > 0 ? '173' : '0'}% ROI</span></div>
            </div>
            <div className="kpi">
              <div className="ktb" style={{ background: 'var(--pu)' }} />
              <div className="kv" style={{ fontSize: 22, marginTop: 6 }}>{progressoMetas}%</div>
              <div className="kl" style={{ fontSize: '9.5px' }}>Metas do Ciclo</div>
              <div className="ksubs">{metasEmRisco > 0 ? <span className="v3-tr v3-tr-d">{metasEmRisco} em risco</span> : <span className="v3-tr v3-tr-u">No alvo</span>}</div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="g2 mb12">
          <div className="v3-card">
            <div className="sct">Desempenho por Area — Ultimos 3 Meses</div>
            {barChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
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
                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t3)' }}><div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />{x.l}</div>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados</div>}
          </div>
          <div className="v3-card">
            <div className="sct">ROI Acumulado</div>
            {totalSavingsYear > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={(() => {
                    const sorted = [...roiData].sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                    let cumulative = 0;
                    const points = sorted.map((imp: any) => {
                      cumulative += (imp.total_savings_monthly || 0) * 12;
                      return { name: imp.created_at ? format(new Date(imp.created_at), "MMM/yy", { locale: ptBR }) : '?', value: Math.round(cumulative) };
                    });
                    return points.length > 0 ? points : [{ name: 'Atual', value: totalSavingsYear }];
                  })()}>
                    <CartesianGrid strokeDasharray="4 3" stroke="#E0EAF4" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#A4B5CC' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#A4B5CC' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <defs><linearGradient id="roiGradP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#13A87A" stopOpacity={0.28} /><stop offset="100%" stopColor="#13A87A" stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="value" fill="url(#roiGradP)" stroke="#13A87A" strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: 'var(--gr)' }}>Atual: <strong>R${(totalSavingsYear / 1000).toFixed(0)}k/ano</strong></span>
                  <span style={{ color: 'var(--t3)' }}>{roiData.length} ferramentas</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t3)', fontSize: 12 }}>
                <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados de ROI
              </div>
            )}
          </div>
        </div>

        {/* Projects Table */}
        <div className="v3-card mb12">
          <div className="sct">Projetos — Tabela Completa</div>
          {/* Table filters */}
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
                <thead><tr><th>Projeto</th><th>Cliente/Area</th><th>Area</th><th>Responsavel</th><th>Progresso</th><th>Prazo</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredProjects.map(p => {
                    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                    const daysLeft = p.end_date ? differenceInDays(new Date(p.end_date), new Date()) : null;
                    return (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td style={{ color: 'var(--t3)' }}>{p.client_name || '—'}</td>
                        <td><span className={`ch ${getAreaChip(p.area_name)}`}>{p.area_name || 'N/A'}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="av av-xs" style={{ background: 'linear-gradient(135deg, #5B6EF0, #3680F6)' }}>{p.responsible_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}</div>
                            <span>{p.responsible_name?.split(' ')[0] || '—'}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="v3-pb v3-pb6" style={{ flex: 1 }}><div className={`v3-pbf ${getPbColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: getTextColor(pct) }}>{pct}%</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: '11.5px', fontWeight: 600, color: daysLeft !== null && daysLeft < 0 ? 'var(--re)' : daysLeft !== null && daysLeft < 15 ? 'var(--am)' : 'var(--t3)' }}>{daysLeft !== null ? `${daysLeft > 0 ? '+' : ''}${daysLeft} dias` : '—'}</span></td>
                        <td><span className={`ch ${getStatusChip(p.computed_status)}`}>{getStatusLabel(p.computed_status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Individual Contribution */}
        <div className="v3-card">
          <div className="sct">Contribuicao Individual — {periodo}</div>
          {contribution.map((m, idx) => {
            const classif = getClassifChip(m.ppr);
            return (
              <div key={m.id} className="v3-sr" style={{ cursor: 'pointer' }} onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}>
                <span className="srk">#{idx + 1}</span>
                <div className="av av-sm" style={{ background: 'linear-gradient(135deg, #5B6EF0, #7A50EE)' }}>{m.initials}</div>
                <div className="srb">
                  <span className="srn">{m.name}</span>
                  <div style={{ flex: 1 }}><div className="v3-pb v3-pb6"><div className={`v3-pbf ${getPbColor(m.ppr)}`} style={{ width: `${Math.min(m.ppr, 100)}%` }} /></div></div>
                </div>
                <span className="srv" style={{ color: getTextColor(m.ppr) }}>{m.ppr}</span>
                <span className={`ch ${classif.cls}`}>{classif.label}</span>
              </div>
            );
          })}
          {contribution.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 12 }}>Sem dados de contribuicao no periodo.</div>}
          
          <div className="scl" style={{ marginTop: 16 }}>Atividade — Ultimos 90 dias {selectedMemberId && '(filtrado)'}</div>
          <ActivityHeatmap tasks={heatmapTasks} selectedMemberId={selectedMemberId} />
        </div>
      </div>
    </BoardLayout>
  );
};

export default PerformanceDashboard;
