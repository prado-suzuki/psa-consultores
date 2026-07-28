import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDecisoesData } from '@/hooks/useDecisoesData';
import { useDomainBoardDashboard } from '@/hooks/useDomainBoardDashboard';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useSinteseExecutiva } from '@/hooks/useSinteseExecutiva';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar } from '@/components/board/BoardFilterBar';
import { BoardStatStrip } from '@/components/board/BoardStatStrip';
import { BoardAIBox } from '@/components/board/BoardAIBox';
import { BoardChip } from '@/components/board/BoardChip';
import { BoardAreaRollup } from '@/components/board/BoardAreaRollup';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import {
  BOARD_AREAS, BOARD_AREA_LABEL, filtrarPorArea, saudeProjetos, granularidadePara,
  serieTarefasPorArea, consolidarRoi, serieRoiAcumulado, resumoPorArea, mesclarResumoArea,
  type BoardAreaKey, type ResumoArea,
} from '@/lib/boardExecutivo';
import { useDomainTrabalhoDigital } from '@/hooks/useDomainTrabalhoDigital';
import { resumoDigital, diagnosticoDigital } from '@/lib/trabalhoDigital';

const DEFAULTS = { periodo: '30d', area: 'todas' };

/** Cinza para o bucket "Outros" (área não classificada em Tax/OSG/Dev). */
const COR_OUTROS = '#9AA7B4';
const COR_AREA: Record<BoardAreaKey, string> = {
  tax: CHART_COLORS.tax,
  osg: CHART_COLORS.osg,
  dev: CHART_COLORS.dev,
  outros: COR_OUTROS,
};

const BoardDashboard = () => {
  const navigate = useNavigate();
  const revealRef = useBoardReveal();
  const { toast } = useToast();
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({ pageKey: 'dashboard', defaults: DEFAULTS });
  const periodo = filters.periodo as string;
  const area = filters.area as string;

  // Sempre 'todas': o recorte por área acontece aqui (`filtrarPorArea`), porque
  // esta tela precisa do conjunto COMPLETO para classificar tarefa→área e para
  // montar o resumo de todas as áreas. Bônus: uma entrada de cache só, sem
  // refetch ao trocar de área.
  const { projectsQuery, membersQuery, periodFrom, periodTo } = usePerformanceData(periodo, 'todas');
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);
  const { data: decisoesData } = useDecisoesData(cicloAtivo?.id);
  const { tarefasConcluidasQuery } = useDomainBoardDashboard({ desdeISO: periodFrom });
  const melhoriasQuery = useDomainMelhoriasRoi();
  const sintese = useSinteseExecutiva();
  const [sinteseLocal, setSinteseLocal] = useState<{ sintese: string; bullets: string[] } | null>(null);

  // Escopo: TODOS os projetos alimentam a classificação por área; o filtro de
  // área recorta o que a tela mostra — inclusive os KPIs, que antes ignoravam
  // o filtro e continuavam globais.
  const todosProjetos = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projetos = useMemo(() => filtrarPorArea(todosProjetos, area), [todosProjetos, area]);
  const saude = useMemo(() => saudeProjetos(projetos), [projetos]);
  const profiles = membersQuery.data?.profiles || [];
  const members = membersQuery.data?.members || [];

  const tarefas = useMemo(() => tarefasConcluidasQuery.data ?? [], [tarefasConcluidasQuery.data]);
  const roi = useMemo(() => consolidarRoi(melhoriasQuery.data ?? []), [melhoriasQuery.data]);

  // Janela real analisada — o mesmo range dos projetos, para o rótulo não mentir.
  const diasJanela = useMemo(() => {
    if (!periodFrom) return 30;
    return Math.max(1, differenceInDays(new Date(), parseISO(periodFrom)));
  }, [periodFrom]);
  const janelaLabel = periodo === 'ciclo'
    ? `ciclo ${cicloAtivo?.nome ?? 'ativo'}`
    : `últimos ${diasJanela} dias`;

  const serieEntregas = useMemo(
    () => serieTarefasPorArea(tarefas, todosProjetos, granularidadePara(diasJanela)),
    [tarefas, todosProjetos, diasJanela],
  );
  const areasVisiveis: BoardAreaKey[] = area === 'todas' ? BOARD_AREAS : [area as BoardAreaKey];

  // ── Área Digital: fonte própria ────────────────────────────────────────
  // Tax e OSG trabalham em `org_projects`/`org_tasks`; a Digital cadastra em
  // `projects` (antiga) + `sprint_deliverables`. Sem esta segunda fonte a linha
  // "Dev" apareceria vazia — e vazio, aqui, seria lido como "não produziu".
  const janelaDigital = useMemo(
    () => ({ desdeISO: periodFrom, ateISO: periodTo }),
    [periodFrom, periodTo],
  );
  const { snapshotQuery: digitalQuery } = useDomainTrabalhoDigital({ janela: janelaDigital });
  const digital = digitalQuery.data;

  // `resumoDigital` devolve TODOS os buckets que achou: um entregável pode
  // pertencer a projeto de mapeamento do Tax/OSG, e o que não resolve área cai
  // em "outros". Levamos TODOS — filtrar só 'dev' faria o trabalho de sprint
  // sem área vinculada desaparecer da tela (e o buraco é grande: uma migration
  // antiga zerou `project_id` em massa). As fontes são tabelas distintas de
  // `org_*`, então mesclar soma, não duplica.
  const linhasDigital = useMemo<ResumoArea[]>(
    () => (digital ? resumoDigital({ ...digital, janela: janelaDigital }) : []),
    [digital, janelaDigital],
  );

  const diagDigital = useMemo(
    () => (digital ? diagnosticoDigital({ ...digital, janela: janelaDigital }) : null),
    [digital, janelaDigital],
  );

  const resumoAreas = useMemo(() => {
    const porArea = new Map<BoardAreaKey, ResumoArea>(
      resumoPorArea(todosProjetos, tarefas).map((r) => [r.area, r]),
    );
    for (const linha of linhasDigital) {
      const existente = porArea.get(linha.area);
      porArea.set(linha.area, existente ? mesclarResumoArea(existente, linha) : linha);
    }
    return [...porArea.values()]
      // Ordem canônica das áreas, independente de qual fonte chegou primeiro.
      .sort((a, b) => BOARD_AREAS.indexOf(a.area) - BOARD_AREAS.indexOf(b.area))
      .filter((r) => area === 'todas' || r.area === area);
  }, [todosProjetos, tarefas, linhasDigital, area]);

  /** Ressalvas do rodapé: fonte, acesso negado e dado incompleto. */
  const notaAreas = useMemo(() => {
    const partes = ['Fontes somadas: tarefas de projeto (Tax/OSG) + entregáveis de sprint (Digital). Unidades de trabalho diferentes.'];
    if (diagDigital && diagDigital.semVinculoDeProjeto > 0) {
      partes.push(`${diagDigital.semVinculoDeProjeto} entregáveis de sprint sem projeto vinculado entraram em "Outros".`);
    }
    if (digital && !digital.podeLerEntregaveis) {
      partes.push('Sem permissão para ler os entregáveis da Digital — a linha Dev não reflete o trabalho dela.');
    } else if (digital?.entregaveisTruncados) {
      partes.push('Entregáveis da Digital truncados no limite de leitura: a linha Dev está sobre uma fatia.');
    } else if (diagDigital && diagDigital.concluidosSemCompletedAt > 0) {
      partes.push(`${diagDigital.concluidosSemCompletedAt} entregáveis concluídos sem data de conclusão ficaram fora da conta.`);
    }
    if (digitalQuery.isError) {
      partes.push('Falha ao carregar a fonte da Digital.');
    }
    return partes.join(' ');
  }, [digital, diagDigital, digitalQuery.isError]);

  const serieRoi = useMemo(() => serieRoiAcumulado(melhoriasQuery.data ?? []), [melhoriasQuery.data]);

  const daysToAnalise = cicloAtivo?.data_analise_semestral
    ? differenceInDays(new Date(cicloAtivo.data_analise_semestral), new Date())
    : null;

  const projetosCriticos = useMemo(
    () => projetos.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado').slice(0, 5),
    [projetos],
  );

  const rankingEquipe = useMemo(() => (decisoesData ?? []).slice(0, 5), [decisoesData]);
  const progressoMetas = overview?.mediaProgresso ?? 0;
  const foraDePrazo = saude.emRisco + saude.atrasados;

  const handleGenerateSintese = async () => {
    setSinteseLocal(null);
    try {
      await sintese.mutateAsync();
    } catch {
      // Sem IA a tela ainda ajuda, mas o texto é rotulado como resumo LOCAL —
      // nunca apresentado como análise da IA.
      setSinteseLocal({
        sintese: `${saude.total} projetos no escopo (${janelaLabel}), ${foraDePrazo} fora de prazo e pontualidade de ${saude.pontualidade}%. Metas do ciclo em ${progressoMetas}%.`,
        bullets: [
          foraDePrazo > 0
            ? `${foraDePrazo} projetos fora de prazo — ver "Projetos Críticos".`
            : 'Nenhum projeto fora de prazo no escopo atual.',
          `Economia validada: R$ ${Math.round(roi.economiaAnual / 1000)}k/ano em ${roi.melhorias} melhorias avaliadas.`,
          `${members.length} membros ativos de ${profiles.length} cadastrados.`,
        ],
      });
      toast({
        title: 'IA indisponível',
        description: 'Mostrando um resumo local dos números desta tela.',
        variant: 'destructive',
      });
    }
  };

  const anyLoading = projectsQuery.isLoading || membersQuery.isLoading
    || melhoriasQuery.isLoading || tarefasConcluidasQuery.isLoading
    || (!!cicloAtivo && !overview);

  const getAreaChip = (a: string | null): 'tax' | 'osg' | 'dev' | 'gy' => {
    const x = (a || '').toLowerCase();
    if (x.includes('tax') || x.includes('fiscal') || x.includes('tribut')) return 'tax';
    if (x.includes('osg') || x.includes('societ')) return 'osg';
    if (x.includes('dev') || x.includes('digital')) return 'dev';
    return 'gy';
  };
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
    <BoardLayout title="Visão Executiva" subtitle="As áreas em um olhar">
      <div ref={containerRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="pg-title">Visão Executiva</div>
              <div className="pg-sub">
                {format(new Date(), "dd MMM yyyy", { locale: ptBR })} · Ciclo ativo: {cicloAtivo?.nome ?? '—'}
              </div>
            </div>
            <div className="pg-chips">
              {foraDePrazo > 0 && <BoardChip variant="risk">{foraDePrazo} fora de prazo</BoardChip>}
              {daysToAnalise !== null && <BoardChip variant="warn">Semestral em {daysToAnalise}d</BoardChip>}
              {roi.roiPct !== null && <BoardChip variant="go">ROI {Math.round(roi.roiPct)}%</BoardChip>}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <BoardFilterBar
          filters={[
            { key: 'periodo', label: 'Período', type: 'segmented', options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'ciclo', label: 'Ciclo' }] },
            {
              key: 'area', label: 'Área', type: 'select', options: [
                { value: 'todas', label: 'Todas as áreas' },
                ...BOARD_AREAS.map((a) => ({ value: a, label: BOARD_AREA_LABEL[a] })),
              ],
            },
          ]}
          activeFilters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          activeCount={activeCount}
        />

        {/* KPIs */}
        {anyLoading ? (
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
                onClick: () => navigate('/equipe/board/performance'),
              },
              {
                value: Math.round(roi.economiaAnual / 1000), prefix: 'R$', suffix: 'k',
                label: 'Economia Validada / Ano', color: 'var(--board-v4-go)',
                // ROI só aparece como número quando existe investimento cadastrado.
                // Sem denominador, mostramos "em construção" — nunca um % inventado.
                pill: roi.roiPct !== null
                  ? { text: `${Math.round(roi.roiPct)}% ROI`, variant: roi.roiPct >= 0 ? 'up' : 'down' }
                  : { text: 'ROI em construção', variant: 'neutral' },
                subText: melhoriasQuery.isError
                  ? 'Falha ao carregar melhorias'
                  : `${roi.melhorias} melhorias avaliadas`,
              },
              {
                value: saude.pontualidade, suffix: '%', label: 'Taxa Pontualidade', color: 'var(--board-v4-purple)',
                pill: { text: saude.pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta', variant: saude.pontualidade >= 85 ? 'up' : 'down' },
                barValue: saude.pontualidade,
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

        {/* Visão de sócio: áreas no geral + o que precisa de atenção */}
        <div className="v4-g2">
          <BoardAreaRollup
            areas={resumoAreas}
            janelaLabel={janelaLabel}
            nota={notaAreas}
            onAreaClick={() => navigate('/equipe/board/performance')}
          />

          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Projetos Críticos</div>
            {projetosCriticos.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhum projeto crítico.</div>}
            {projetosCriticos.map(p => {
              const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
              return (
                <div key={p.id} className="v4-mrow">
                  <BoardChip variant={getAreaChip(p.area_name)}>{p.area_name || 'Sem área'}</BoardChip>
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
        </div>

        {/* Síntese */}
        <div style={{ marginBottom: 16 }}>
          <BoardAIBox
            label={sinteseLocal ? 'Resumo local — IA indisponível' : 'Síntese Estratégica — IA Executiva'}
            data={sinteseLocal ?? sintese.data ?? null}
            loading={sintese.isPending}
            onGenerate={handleGenerateSintese}
          />
        </div>

        {/* Gráficos */}
        <div className="v4-g2">
          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Entregas por Área — {janelaLabel}</div>
            {serieEntregas.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={serieEntregas}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    {areasVisiveis.map((a) => (
                      <Bar key={a} dataKey={a} name={BOARD_AREA_LABEL[a]} fill={COR_AREA[a]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}>
                  {areasVisiveis.map((a) => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--board-v4-ink3)' }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: COR_AREA[a] }} />{BOARD_AREA_LABEL[a]}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 6, textAlign: 'center' }}>
                  Tarefas concluídas no período — não é índice de saúde.
                </div>
              </>
            ) : <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}><BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />Nenhuma entrega concluída no período</div>}
          </div>

          <div className="v4-card" data-reveal>
            <div className="v4-card-title">Economia Validada Acumulada</div>
            {serieRoi.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={serieRoi}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="name" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} {...TOOLTIP_STYLE} />
                    <defs><linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.osg} stopOpacity={0.22} /><stop offset="100%" stopColor={CHART_COLORS.osg} stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="value" fill="url(#roiGrad)" stroke={CHART_COLORS.osg} strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--board-v4-go)' }}>Economia: <strong>R${Math.round(roi.economiaAnual / 1000)}k/ano</strong></span>
                  <span style={{ color: 'var(--board-v4-ink3)' }}>
                    Investimento: {roi.investimento > 0 ? `R$${Math.round(roi.investimento / 1000)}k` : 'não informado'}
                  </span>
                  <span style={{ color: 'var(--board-v4-ink3)' }}>{roi.melhorias} melhorias</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
                <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />
                Nenhuma melhoria avaliada ainda
              </div>
            )}
          </div>
        </div>

        {/* Equipe */}
        <div className="v4-card" data-reveal>
          <div className="v4-card-title">Performance da Equipe</div>
          {rankingEquipe.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhum dado de performance.</div>}
          {rankingEquipe.map((m, idx) => {
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
    </BoardLayout>
  );
};

export default BoardDashboard;
