import { useState, useEffect, useMemo } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { RefreshCw, BarChart2, AlertTriangle } from 'lucide-react';
import { usePerformanceData, useSavePerformancePrefs } from '@/hooks/usePerformanceData';
import { ActivityHeatmap } from '@/components/performance/ActivityHeatmap';
import { format, differenceInDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar, FilterEmptyState } from '@/components/board/BoardFilterBar';
import { BoardStatStrip } from '@/components/board/BoardStatStrip';
import { BoardChip } from '@/components/board/BoardChip';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import {
  BOARD_AREAS, BOARD_AREA_LABEL, consolidarRoi, filtrarPorArea, saudeProjetos,
  serieTarefasPorArea, type BoardAreaKey,
} from '@/lib/boardExecutivo';
import {
  chipDeArea, classificarContribuicao, contribuicaoNoPeriodo, desvioMedioEntrega,
  filtrarTarefasPorArea, listarFalhas, mapaAreaPorProjeto, mapaAreasPorPessoa,
  metasNoEscopo, pessoasNoEscopo, resumoMetas, rotuloArea, rotuloEscopo, rotuloJanela,
  type MetaCiclo, type PessoaBasica,
} from '@/lib/performanceOperacional';

/** Cinza do bucket "Outros" — área não classificada nos buckets nomeados. */
const COR_OUTROS = '#9AA7B4';
const COR_AREA: Record<string, string> = {
  tax: CHART_COLORS.tax,
  osg: CHART_COLORS.osg,
  dev: CHART_COLORS.dev,
  outros: COR_OUTROS,
};
const corDaArea = (a: string) => COR_AREA[a] ?? COR_OUTROS;

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

  // O hook devolve o conjunto COMPLETO; o recorte por área é feito aqui embaixo,
  // memoizado — uma entrada de cache só, sem refetch ao trocar de área.
  const {
    prefsQuery, projectsQuery, membersQuery, metasQuery,
    periodTasksQuery, heatmapTasksQuery, last3MonthsTasksQuery,
  } = usePerformanceData(periodo);
  const melhoriasQuery = useDomainMelhoriasRoi();

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

  // ── Escopo: tudo que a tela afirma passa pelo filtro de área ──
  const todosProjetos = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projetos = useMemo(() => filtrarPorArea(todosProjetos, area), [todosProjetos, area]);
  const saude = useMemo(() => saudeProjetos(projetos), [projetos]);
  /** tarefa → projeto → área: sempre construído com a lista COMPLETA. */
  const areaPorProjeto = useMemo(() => mapaAreaPorProjeto(todosProjetos), [todosProjetos]);

  const membros = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  // `profiles_safe` é consultada com cast no hook (view fora dos tipos gerados).
  const profiles = useMemo(
    () => (membersQuery.data?.profiles ?? []) as unknown as PessoaBasica[],
    [membersQuery.data],
  );
  /** pessoa → área (via equipe): base do recorte de pessoas e de metas. */
  const areasPorPessoa = useMemo(() => mapaAreasPorPessoa(membros), [membros]);

  const periodTasks = useMemo(() => periodTasksQuery.data ?? [], [periodTasksQuery.data]);
  const tarefasPeriodo = useMemo(
    () => filtrarTarefasPorArea(periodTasks, areaPorProjeto, area),
    [periodTasks, areaPorProjeto, area],
  );
  const heatmapTasks = useMemo(() => heatmapTasksQuery.data ?? [], [heatmapTasksQuery.data]);
  const tarefasHeatmap = useMemo(
    () => filtrarTarefasPorArea(heatmapTasks, areaPorProjeto, area),
    [heatmapTasks, areaPorProjeto, area],
  );
  const last3MonthsTasks = useMemo(() => last3MonthsTasksQuery.data ?? [], [last3MonthsTasksQuery.data]);

  const roi = consolidarRoi(melhoriasQuery.data ?? []);
  const janelaLabel = rotuloJanela(periodo);
  const areaLabel = rotuloArea(area);

  // "Tempo Médio": desvio das entregas do período, agora recortado por área e
  // com o tamanho da amostra — sem amostra a tela declara que não há base.
  const desvio = useMemo(() => desvioMedioEntrega(tarefasPeriodo), [tarefasPeriodo]);

  // Metas não têm coluna de área: a atribuição é responsavel_id → equipe → área.
  const metasBrutas = useMemo(() => (metasQuery.data ?? []) as MetaCiclo[], [metasQuery.data]);
  const escopoMetas = useMemo(
    () => metasNoEscopo(metasBrutas, areasPorPessoa, area),
    [metasBrutas, areasPorPessoa, area],
  );
  const metas = escopoMetas.metas;
  const resumoDasMetas = useMemo(() => resumoMetas(metas), [metas]);

  // Série compartilhada com o Board → Dashboard (`serieTarefasPorArea`): mesma
  // classificação de área, ordem cronológica garantida e bucket "Outros"
  // explícito. Recebe SEMPRE a lista completa de projetos — com a lista já
  // recortada, as tarefas das outras áreas caíam em "Outros" e o gráfico
  // sugeria uma quarta área gigante. O recorte é visual (quais séries desenhar).
  const barChartData = useMemo(
    () => serieTarefasPorArea(
      last3MonthsTasks.filter((t: any) => t.status === 'done'),
      todosProjetos,
      'mes',
    ),
    [last3MonthsTasks, todosProjetos],
  );
  const areasVisiveis: BoardAreaKey[] = area === 'todas' ? BOARD_AREAS : [area as BoardAreaKey];

  const escopoPessoas = useMemo(
    () => pessoasNoEscopo(profiles, areasPorPessoa, area),
    [profiles, areasPorPessoa, area],
  );
  const contribuicao = useMemo(
    () => contribuicaoNoPeriodo(escopoPessoas.pessoas, tarefasPeriodo, metas),
    [escopoPessoas.pessoas, tarefasPeriodo, metas],
  );

  // Estado de erro visível: sem isso a tela mostrava número fabricado (ex.: 100%
  // de pontualidade quando `org_tasks` falhava).
  const falhas = useMemo(() => listarFalhas([
    { rotulo: 'projetos e tarefas', falhou: projectsQuery.isError },
    { rotulo: 'equipe', falhou: membersQuery.isError },
    { rotulo: 'metas do ciclo', falhou: metasQuery.isError },
    { rotulo: 'tarefas do período', falhou: periodTasksQuery.isError },
    { rotulo: 'atividade de 90 dias', falhou: heatmapTasksQuery.isError },
    { rotulo: 'entregas por área', falhou: last3MonthsTasksQuery.isError },
    { rotulo: 'melhorias (economia)', falhou: melhoriasQuery.isError },
  ]), [
    projectsQuery.isError, membersQuery.isError, metasQuery.isError,
    periodTasksQuery.isError, heatmapTasksQuery.isError,
    last3MonthsTasksQuery.isError, melhoriasQuery.isError,
  ]);

  const filteredProjects = useMemo(() => {
    let result = projetos.filter(p => {
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
  }, [projetos, statusFilter, searchTerm, ordenacao]);

  const getStatusChip = (s: string): 'go' | 'warn' | 'risk' => s === 'em_dia' ? 'go' : s === 'em_risco' ? 'warn' : 'risk';
  const getStatusLabel = (s: string) => s === 'em_dia' ? 'Em dia' : s === 'em_risco' ? 'Em risco' : 'Atrasado';
  const getPbColor = (pct: number) => pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';

  // OR, não AND: com `membersQuery` em cache o strip renderizava zeros enquanto
  // os projetos ainda estavam a caminho.
  const isLoading = projectsQuery.isLoading || membersQuery.isLoading
    || periodTasksQuery.isLoading || metasQuery.isLoading;

  // Rótulo de escopo de cada KPI — nenhum número fica global sem dizer.
  const escopoMetasLabel = rotuloEscopo(escopoMetas.escopo, area);
  const escopoPessoasLabel = rotuloEscopo(escopoPessoas.escopo, area);
  const metasSubText = metasBrutas.length === 0
    ? 'nenhuma meta no ciclo ativo'
    : resumoDasMetas.individuais === 0
      ? `${resumoDasMetas.total} metas, nenhuma individual · escopo: ${escopoMetasLabel}`
      : `${resumoDasMetas.emRisco > 0 ? `${resumoDasMetas.emRisco} em risco` : 'nenhuma em risco'} · escopo: ${escopoMetasLabel}`;

  return (
    <BoardLayout title="Operacional" subtitle="Visao consolidada">
      <div ref={revealRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div className="pg-title">Operacional</div>
          {/* O subtítulo nomeia a FONTE em vez de prometer cobertura. "Todas as
              áreas" aqui significa "todas as áreas presentes em org_projects" —
              o trabalho da Digital vive em sprints (sprint_deliverables) e entra
              pelo Estratégico, não por esta tela. */}
          <div className="pg-sub">
            Projetos e tarefas de Tax e OSG · equipe e economia validada · atualizado a cada 5 min
          </div>
        </div>

        {/* Filter Bar */}
        <BoardFilterBar
          filters={[
            { key: 'periodo', label: 'Período', type: 'segmented', options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'ciclo', label: 'Ciclo' }] },
            {
              // Opções derivadas do vocabulário canônico de áreas: quando
              // `BOARD_AREAS` muda, a tela acompanha sem novo diff.
              key: 'area', label: 'Área', type: 'select', options: [
                { value: 'todas', label: 'Todas as áreas' },
                ...BOARD_AREAS.map((a) => ({ value: a, label: BOARD_AREA_LABEL[a] })),
              ],
            },
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

        {/* Falha de carregamento: nunca substituir dado ausente por número */}
        {falhas.length > 0 && (
          <div
            role="alert"
            className="v4-card"
            style={{ marginBottom: 12, borderLeft: '3px solid var(--board-v4-risk)', display: 'flex', gap: 8 }}
            data-reveal
          >
            <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, color: 'var(--board-v4-risk)' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--board-v4-risk)' }}>
                Dados incompletos — os números abaixo podem estar errados
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', marginTop: 2 }}>
                Falha ao carregar: {falhas.join(', ')}. Use "Atualizar" para tentar de novo.
              </div>
            </div>
          </div>
        )}

        {/* Stat Strip */}
        {isLoading ? (
          <Skeleton className="h-[120px] rounded-xl mb-4" />
        ) : (
          <BoardStatStrip
            cols={5}
            items={[
              {
                value: saude.total, label: 'Projetos Ativos', color: 'var(--board-v4-accent)',
                dots: [
                  { color: 'var(--board-v4-go)', text: `${saude.emDia} no prazo` },
                  { color: 'var(--board-v4-warn)', text: `${saude.emRisco} em risco` },
                  { color: 'var(--board-v4-risk)', text: `${saude.atrasados} atrasados` },
                ],
                subText: saude.total > 0
                  ? `escopo: ${areaLabel}`
                  : `nenhum projeto ativo · escopo: ${areaLabel}`,
              },
              {
                // Escopo vazio se declara vazio: 0% com pill "Abaixo" afirmava
                // desempenho ruim onde não havia nenhum projeto para avaliar.
                value: saude.total > 0 ? saude.pontualidade : '—',
                suffix: saude.total > 0 ? '%' : undefined,
                label: 'Taxa Pontualidade', color: 'var(--board-v4-go)', animateCount: saude.total > 0,
                pill: saude.total > 0
                  ? { text: saude.pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta', variant: saude.pontualidade >= 85 ? 'up' : 'down' }
                  : { text: 'escopo vazio', variant: 'neutral' },
                subText: `${saude.total} projetos · escopo: ${areaLabel}`,
              },
              {
                // Média ASSINADA: negativo = entregou antes do prazo. O sinal é
                // explícito para "-2.0d" não ser lido como atraso de 2 dias.
                value: desvio.dias !== null
                  ? `${desvio.dias > 0 ? '+' : ''}${desvio.dias.toFixed(1)}d`
                  : '—',
                label: 'Desvio de Prazo', animateCount: false,
                color: desvio.dias === null
                  ? 'var(--board-v4-ink3)'
                  : desvio.dias > 0 ? 'var(--board-v4-risk)' : 'var(--board-v4-go)',
                // A pill dizia "estável" — literal fixo, nunca calculado. Agora
                // mostra a amostra que sustenta (ou não) a média.
                pill: desvio.amostra > 0
                  ? { text: `${desvio.atrasadas} de ${desvio.amostra} fora do prazo`, variant: desvio.atrasadas > 0 ? 'down' : 'up' }
                  : { text: 'sem base no período', variant: 'neutral' },
                subText: `negativo = antes do prazo · ${janelaLabel} · escopo: ${areaLabel}`,
              },
              {
                value: Math.round(roi.economiaAnual / 1000), prefix: 'R$', suffix: 'k',
                label: 'Economia Validada / Ano', color: 'var(--board-v4-cyan)',
                // Sem investimento cadastrado não existe ROI — mostramos
                // "em construção" em vez do 173% fixo que ficava aqui.
                pill: roi.roiPct !== null
                  ? { text: `${Math.round(roi.roiPct)}% ROI`, variant: roi.roiPct >= 0 ? 'up' : 'down' }
                  : { text: 'ROI em construção', variant: 'neutral' },
                // NÃO é recortável por área: `process_improvements` tem
                // `cluster_id`, não `estrutura_area_id`. Rótulo explícito para o
                // filtro de área não "certificar" um número que é da empresa toda.
                subText: melhoriasQuery.isError
                  ? 'Falha ao carregar melhorias'
                  : `todas as áreas · acumulado · ${roi.melhorias} melhorias`,
              },
              {
                value: resumoDasMetas.individuais > 0 ? resumoDasMetas.progresso : '—',
                suffix: resumoDasMetas.individuais > 0 ? '%' : undefined,
                label: 'Metas do Ciclo', color: 'var(--board-v4-purple)',
                animateCount: resumoDasMetas.individuais > 0,
                subText: metasSubText,
                barValue: resumoDasMetas.individuais > 0 ? resumoDasMetas.progresso : undefined,
              },
            ]}
          />
        )}

        {/* Charts */}
        <div className="v4-g2">
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Entregas por Área — Últimos 3 Meses</div>
            {barChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={barChartData}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    {/* A classificação usa TODOS os projetos; o filtro decide
                        apenas quais séries são desenhadas. */}
                    {areasVisiveis.map((a) => (
                      <Bar key={a} dataKey={a} name={BOARD_AREA_LABEL[a]} fill={corDaArea(a)} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}>
                  {areasVisiveis.map((a) => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--board-v4-ink3)' }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: corDaArea(a) }} />{BOARD_AREA_LABEL[a]}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 6, textAlign: 'center' }}>
                  Tarefas concluídas por mês · escopo: {areaLabel} — não é índice de saúde.
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Sem dados</div>}
          </div>

          {/* Card da janela do filtro: mostra o TRABALHO da janela. Antes exibia
              o PPR do ciclo como número principal — sem meta cadastrada, a
              equipe inteira aparecia com 0 e chip vermelho "Abaixo" enquanto as
              entregas do período eram calculadas e descartadas. */}
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">
              Entregas Concluídas — {janelaLabel} · escopo: {escopoPessoasLabel}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginBottom: 6 }}>
              Número = tarefas concluídas na janela. Barra = % entregue no prazo.
            </div>
            {contribuicao.map((m, idx) => {
              const classif = classificarContribuicao(m);
              return (
                <div key={m.id} className="v4-srow" style={{ cursor: 'pointer' }} onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}>
                  <span className="v4-srk">#{idx + 1}</span>
                  <div className="v4-av v4-av-sm" style={{ background: 'linear-gradient(135deg, #4B63F7, #6B46E8)' }}>{m.iniciais}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span className="v4-srn">{m.nome}</span>
                      <div style={{ flex: 1 }}>
                        <div className="v4-pb v4-pb6">
                          <div className={`v4-pbf ${getPbColor(m.pontualidade ?? 0)}`} style={{ width: `${m.pontualidade ?? 0}%` }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 2 }}>
                      {m.pontualidade !== null
                        ? `${m.noPrazo}/${m.comPrazo} no prazo (${m.pontualidade}%)`
                        : m.entregas > 0 ? 'entregas sem prazo cadastrado' : 'sem entregas na janela'}
                      {m.pprCiclo !== null && ` · PPR do ciclo: ${m.pprCiclo}`}
                    </div>
                  </div>
                  <span className="v4-srv" style={{ color: m.pontualidade !== null ? getTextColor(m.pontualidade) : 'var(--board-v4-ink3)' }}>
                    {m.entregas}
                  </span>
                  <BoardChip variant={classif.variant}>{classif.label}</BoardChip>
                </div>
              );
            })}
            {contribuicao.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhuma entrega concluída na janela.</div>}

            <div className="v4-slabel" style={{ marginTop: 16 }}>
              Atividade — últimos 90 dias · escopo: {areaLabel} {selectedMemberId && '(1 pessoa)'}
            </div>
            <ActivityHeatmap tasks={tarefasHeatmap} selectedMemberId={selectedMemberId} />
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
            // Total PRÉ-área: com o total já recortado, o "Exibindo X de Y"
            // nunca revelava quantos projetos o filtro de área estava ocultando.
            totalCount={todosProjetos.length}
          />
          {filteredProjects.length === 0 ? (
            // O reset do estado vazio também limpa a ÁREA — sem isso o botão
            // "Limpar filtros" parecia não fazer nada quando era a área que
            // zerava a tabela.
            <FilterEmptyState onReset={() => { setFilter('search', ''); setFilter('statusFilter', 'todos'); handleAreaChange('todas'); }} />
          ) : (
            <div className="v3-tw">
              <table>
                <thead><tr><th>Projeto</th><th>Cliente/Área</th><th>Área</th><th>Responsável</th><th>Progresso</th><th>Prazo</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredProjects.map(p => {
                    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                    const daysLeft = p.end_date ? differenceInDays(new Date(p.end_date), new Date()) : null;
                    // Chip pela classificação canônica: área NULL ou fora dos
                    // buckets era pintada de Dev com o texto "N/A".
                    const areaChip = chipDeArea(p.area_name, p.area_key);
                    return (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td style={{ color: 'var(--board-v4-ink3)' }}>{p.client_name || '—'}</td>
                        <td><BoardChip variant={areaChip.variant}>{areaChip.label}</BoardChip></td>
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
