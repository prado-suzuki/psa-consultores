import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDomainBoardDashboard } from '@/hooks/useDomainBoardDashboard';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useSinteseExecutiva } from '@/hooks/useSinteseExecutiva';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar } from '@/components/board/BoardFilterBar';
import { BoardKpisNegocio } from '@/components/board/BoardKpisNegocio';
import { BoardAIBox } from '@/components/board/BoardAIBox';
import { BoardChip } from '@/components/board/BoardChip';
import { BoardAreaRollup } from '@/components/board/BoardAreaRollup';
import { BoardAlertas } from '@/components/board/BoardAlertas';
import { BoardConcentracao } from '@/components/board/BoardConcentracao';
import { BoardReceitaMensal } from '@/components/board/BoardReceitaMensal';
import { BoardEconomiaAcumulada } from '@/components/board/BoardEconomiaAcumulada';
import { BoardProjetosCriticos } from '@/components/board/BoardProjetosCriticos';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import {
  filtrarPorCluster, filtrarTarefasPorProjetos, saudeProjetos,
  consolidarRoi, serieRoiAcumulado,
} from '@/lib/boardExecutivo';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import {
  alertasEstrategicos, concentracaoCarteira, ratearPorCentroCusto, receitaAnoCorrente,
  receitaEmRisco, serieReceitaComparada, ticketMedioAtivo,
} from '@/lib/boardEstrategico';
import { centrosCustoEmUso } from '@/lib/dashboardClientesOs/aggregations';
import { useBoardRollupAreas } from '@/hooks/useBoardRollupAreas';

// O recorte por EMPRESA não mora aqui: vem da barra global (`useBoardCluster`),
// que vale para a área Board inteira. Aqui ficam a janela de execução e o
// centro de custo, que fatia a receita um nível abaixo da empresa.
/** Sentinela do "sem recorte" no select de centro de custo. */
const TODOS_CC = '__todos__';
const DEFAULTS = { periodo: '30d', centroCusto: TODOS_CC };

const MES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const brlMil = (v: number) => Math.round(v / 1000);

/**
 * Estratégico — a tela de sócio, e a porta de entrada do Board.
 *
 * DUAS JANELAS convivem aqui, de propósito, e cada bloco rotula a sua:
 *
 * - **Negócio** (receita, concentração): ano corrente contra os mesmos meses do
 *   ano anterior. Receita de consultoria é irregular — "últimos 7 dias" seria
 *   ruído, não informação.
 * - **Execução** (áreas, projetos críticos): a janela do filtro de período.
 *
 * TRÊS recortes, em níveis diferentes da estrutura:
 *
 * - **Empresa** (barra global): inclui/exclui a OS inteira, por `cluster_id`;
 * - **Centro de custo** (filtro da tela): divide o valor da OS que sobrou. É
 *   atributo da ÁREA (`estrutura_areas.cost_center_id`), um nível abaixo;
 * - **Período**: só a execução — receita usa o ano corrente, sempre rotulado.
 *
 * As linhas de receita vêm de `useDashboardClientesOs` — a MESMA fonte da tela
 * "Clientes e OS". Duas origens para o mesmo número nas duas telas seria a pior
 * falha possível numa tela de decisão.
 */
const BoardDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const revealRef = useBoardReveal();
  const { toast } = useToast();
  // pageKey v2: o filtro de área saiu e a chave antiga guardava `area` na
  // sessão — sem trocar a chave, o valor órfão voltaria do sessionStorage.
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({ pageKey: 'dashboard-v2', defaults: DEFAULTS });
  const periodo = filters.periodo as string;
  const centroCusto = filters.centroCusto as string;
  const { cluster } = useBoardCluster();

  // Sempre 'todas': o recorte acontece aqui (`filtrarPorCluster`), porque esta
  // tela precisa do conjunto COMPLETO para classificar tarefa→área. Bônus: uma
  // entrada de cache só, sem refetch ao trocar de cliente.
  const { projectsQuery, membersQuery, periodFrom, periodTo } = usePerformanceData(periodo, 'todas');
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);
  const { tarefasConcluidasQuery } = useDomainBoardDashboard({ desdeISO: periodFrom });
  const melhoriasQuery = useDomainMelhoriasRoi();
  const sintese = useSinteseExecutiva();
  const [sinteseLocal, setSinteseLocal] = useState<{ sintese: string; bullets: string[] } | null>(null);

  // ── Fonte do negócio (mesma query da tela "Clientes e OS") ─────────────
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);
  // A empresa global recorta a camada de negócio inteira — o que o filtro de
  // área ANTIGO nunca conseguiu, porque classificava por nome e OS não tem nome
  // de área. Toda linha aqui carrega `cluster_id`.
  const rateioPorOs = negocio.data?.rateioPorOs;
  const ccSelecionado = centroCusto === TODOS_CC ? null : centroCusto;

  /**
   * Duas operações em sequência, nesta ordem:
   *   1. EMPRESA — inclui/exclui a OS inteira, por `cluster_id`;
   *   2. CENTRO DE CUSTO — divide o valor da que sobrou.
   * A atribuição à empresa NÃO passa pelo rateio: a OS pertence a um cluster só.
   */
  const osRows = useMemo(
    () => ratearPorCentroCusto(
      filtrarPorCluster(negocio.data?.osRows ?? [], cluster),
      rateioPorOs ?? new Map(),
      ccSelecionado,
    ),
    [negocio.data, cluster, rateioPorOs, ccSelecionado],
  );
  // Com centro de custo escolhido, a carteira é a dos clientes que têm OS nele —
  // mesma regra da tela "Clientes e OS", senão o KPI de clientes ativos contaria
  // quem ficou de fora da receita mostrada ao lado.
  const clienteRows = useMemo(() => {
    const base = filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster);
    if (!ccSelecionado) return base;
    const comOs = new Set(osRows.map((o) => o.cliente_id));
    return base.filter((c) => comOs.has(c.cliente_id));
  }, [negocio.data, cluster, ccSelecionado, osRows]);
  const projetoRows = useMemo(
    () => filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;

  // Só os centros que aparecem em algum rateio — catálogo inteiro traria dezenas
  // de opções que devolveriam tela vazia.
  const ccOptions = useMemo(() => [
    { value: TODOS_CC, label: 'Todos os centros de custo' },
    ...centrosCustoEmUso(rateioPorOs ?? new Map()).map((c) => ({ value: c.id, label: c.label })),
  ], [rateioPorOs]);
  const ccLabel = ccSelecionado
    ? ccOptions.find((o) => o.value === ccSelecionado)?.label ?? ccSelecionado
    : null;

  const anoCorrente = hoje.slice(0, 4);
  const janelaReceita = `${anoCorrente} até ${MES_EXTENSO[Number(hoje.slice(5, 7)) - 1]}`;

  const receita = useMemo(() => receitaAnoCorrente(osRows, hoje), [osRows, hoje]);
  const serieReceita = useMemo(() => serieReceitaComparada(osRows, hoje), [osRows, hoje]);
  const ticketMedio = useMemo(() => ticketMedioAtivo(osRows), [osRows]);
  const emRisco = useMemo(() => receitaEmRisco(osRows), [osRows]);
  const osAtivas = useMemo(() => osRows.filter((o) => o.situacao === 'em_andamento').length, [osRows]);

  // Concentração sobre o MESMO recorte do KPI de receita (ano corrente): a
  // fatia de um cliente só significa algo contra o denominador que está na tela.
  const osDoAno = useMemo(
    () => osRows.filter((o) => o.data_inicio?.slice(0, 4) === anoCorrente),
    [osRows, anoCorrente],
  );
  const concentracao = useMemo(() => concentracaoCarteira(osDoAno), [osDoAno]);

  const clientesAtivos = useMemo(() => clienteRows.filter((c) => c.ativo), [clienteRows]);
  const clientesFixos = clientesAtivos.filter((c) => c.tipo_cliente === 'Fixo').length;

  // ── Execução ───────────────────────────────────────────────────────────
  // `projetos` é o recorte da tela; `todosProjetos` fica intacto porque
  // `resumoPorArea` precisa dele para resolver tarefa→projeto→área.
  const todosProjetos = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projetos = useMemo(() => filtrarPorCluster(todosProjetos, cluster), [todosProjetos, cluster]);
  const saude = useMemo(() => saudeProjetos(projetos), [projetos]);
  const members = membersQuery.data?.members || [];
  // Tarefa segue o projeto: sem isto, toda tarefa de fora do recorte cairia em
  // "Outros" no rollup em vez de sumir.
  const tarefas = useMemo(
    () => {
      const todas = tarefasConcluidasQuery.data ?? [];
      return cluster ? filtrarTarefasPorProjetos(todas, projetos) : todas;
    },
    [tarefasConcluidasQuery.data, projetos, cluster],
  );
  const roi = useMemo(() => consolidarRoi(melhoriasQuery.data ?? []), [melhoriasQuery.data]);
  const serieRoi = useMemo(() => serieRoiAcumulado(melhoriasQuery.data ?? []), [melhoriasQuery.data]);

  // Janela real analisada — o mesmo range dos projetos, para o rótulo não mentir.
  const diasJanela = useMemo(() => {
    if (!periodFrom) return 30;
    return Math.max(1, differenceInDays(new Date(), parseISO(periodFrom)));
  }, [periodFrom]);
  const janelaLabel = periodo === 'ciclo'
    ? `ciclo ${cicloAtivo?.nome ?? 'ativo'}`
    : `últimos ${diasJanela} dias`;

  // Rollup por área: soma a fonte da Digital (`sprint_deliverables`) à de
  // projeto. Vive num hook porque carrega query própria — ver o porquê lá.
  const { areas: resumoAreas, nota: notaAreas } = useBoardRollupAreas({
    projetos, tarefas, desdeISO: periodFrom, ateISO: periodTo, cluster,
  });

  // ── A faixa de decisão ─────────────────────────────────────────────────
  const alertas = useMemo(
    () => alertasEstrategicos({
      os: osRows, clientes: clienteRows, projetos: projetoRows, concentracao, areas: resumoAreas, hoje,
    }),
    [osRows, clienteRows, projetoRows, concentracao, resumoAreas, hoje],
  );

  const avisoAlertas = negocio.error
    ? `Falha ao carregar contratos e carteira (${negocio.error.message}) — os alertas de receita não foram apurados.`
    : undefined;

  /**
   * `ordem_servico` tem RLS por cluster do cliente: quem não é admin lê só as
   * OS do próprio escopo. O número continua correto para quem olha — o que
   * seria mentira é chamá-lo de "a empresa" sem dizer nada.
   */
  const notaEscopo = isAdmin
    ? undefined
    : 'Receita limitada aos clientes do seu acesso — não é o total da empresa.';

  /**
   * Com centro de custo escolhido, a receita da tela é uma FATIA da OS, não o
   * valor contratado. Sem este aviso o número leria como "a empresa faturou
   * isso" — e o sócio compararia fatia com total.
   */
  const notaRateio = ccLabel
    ? `Receita rateada: só a fatia de "${ccLabel}" de cada OS. OS sem rateio nesse centro ficam fora.`
    : undefined;

  const notaReceita = [
    notaRateio,
    receita.semData > 0
      ? `${receita.semData} OS sem data de início ficaram fora da janela (não dá para atribuir ano).`
      : null,
    notaEscopo,
  ].filter(Boolean).join(' ') || undefined;

  const daysToAnalise = cicloAtivo?.data_analise_semestral
    ? differenceInDays(new Date(cicloAtivo.data_analise_semestral), new Date())
    : null;

  const projetosCriticos = useMemo(
    () => projetos.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado').slice(0, 5),
    [projetos],
  );

  const foraDePrazo = saude.emRisco + saude.atrasados;
  const receitaEmJogo = emRisco.vencido.valor + emRisco.renovacao.valor;

  const handleGenerateSintese = async () => {
    setSinteseLocal(null);
    try {
      await sintese.mutateAsync();
    } catch {
      // Sem IA a tela ainda ajuda, mas o texto é rotulado como resumo LOCAL —
      // nunca apresentado como análise da IA.
      setSinteseLocal({
        sintese: `Receita contratada de R$ ${brlMil(receita.atual)}k em ${janelaReceita}`
          + `${receita.variacao !== null ? ` (${receita.variacao > 0 ? '+' : ''}${(receita.variacao * 100).toFixed(1)}% contra o ano anterior)` : ''}`
          + `, ${clientesAtivos.length} clientes ativos e ${saude.total} projetos no escopo (${janelaLabel}).`,
        bullets: [
          alertas.length > 0
            ? `${alertas.length} ${alertas.length === 1 ? 'item exige' : 'itens exigem'} decisão — ver a faixa no topo.`
            : 'Nenhum item na faixa de decisão.',
          receitaEmJogo > 0
            ? `R$ ${brlMil(receitaEmJogo)}k em contratos vencidos ou em renovação.`
            : 'Nenhum contrato vencido ou em janela de renovação.',
          concentracao.clientesParaMetade !== null
            ? `${concentracao.clientesParaMetade} ${concentracao.clientesParaMetade === 1 ? 'cliente responde' : 'clientes respondem'} por metade da receita.`
            : 'Sem receita na janela para medir concentração.',
          `${foraDePrazo} projetos fora de prazo · ${members.length} membros ativos.`,
        ],
      });
      toast({
        title: 'IA indisponível',
        description: 'Mostrando um resumo local dos números desta tela.',
        variant: 'destructive',
      });
    }
  };

  const execucaoLoading = projectsQuery.isLoading || membersQuery.isLoading
    || melhoriasQuery.isLoading || tarefasConcluidasQuery.isLoading
    || (!!cicloAtivo && !overview);
  const kpisLoading = execucaoLoading || negocio.isLoading;

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [kpisLoading, revealRef]);

  return (
    <BoardLayout title="Estratégico" subtitle="Negócio, risco e entrega">
      <div ref={containerRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="pg-title">Estratégico</div>
              <div className="pg-sub">
                {format(new Date(), 'dd MMM yyyy', { locale: ptBR })} · Ciclo ativo: {cicloAtivo?.nome ?? '—'}
              </div>
            </div>
            <div className="pg-chips">
              {receitaEmJogo > 0 && <BoardChip variant="risk">R${brlMil(receitaEmJogo)}k em contrato a resolver</BoardChip>}
              {foraDePrazo > 0 && <BoardChip variant="warn">{foraDePrazo} fora de prazo</BoardChip>}
              {daysToAnalise !== null && <BoardChip variant="blue">Semestral em {daysToAnalise}d</BoardChip>}
            </div>
          </div>
        </div>

        {/* Janela da EXECUÇÃO. O recorte por empresa é a barra global acima —
            ela já recortou receita, carteira, projetos e alertas. */}
        <BoardFilterBar
          filters={[
            { key: 'periodo', label: 'Período (execução)', type: 'segmented', options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'ciclo', label: 'Ciclo' }] },
            { key: 'centroCusto', label: 'Centro de custo (receita)', type: 'select', options: ccOptions },
          ]}
          activeFilters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          activeCount={activeCount}
        />

        {/* 1. O que exige decisão */}
        <BoardAlertas
          alertas={alertas}
          loading={kpisLoading}
          aviso={avisoAlertas}
          onAlertaClick={(a) => a.rota && navigate(a.rota)}
        />

        {/* 2. Os números do negócio */}
        {kpisLoading ? (
          <Skeleton className="h-[120px] rounded-xl mb-4" />
        ) : (
          <BoardKpisNegocio
            receita={receita}
            janelaReceita={janelaReceita}
            ticketMedio={ticketMedio}
            osAtivas={osAtivas}
            emRisco={emRisco}
            carteira={{ ativos: clientesAtivos.length, fixos: clientesFixos }}
            execucao={{ pontualidade: saude.pontualidade, projetos: saude.total, janela: janelaLabel }}
            onNavigate={navigate}
          />
        )}

        {/* 3. De quem depende × como as áreas estão entregando */}
        <div className="v4-g2">
          <BoardConcentracao
            concentracao={concentracao}
            janelaLabel={janelaReceita}
            nota={notaReceita}
            onClienteClick={() => navigate('/equipe/board/dashboard-clientes-os')}
          />

          <BoardAreaRollup
            areas={resumoAreas}
            janelaLabel={janelaLabel}
            nota={notaAreas}
            onAreaClick={() => navigate('/equipe/board/performance')}
          />
        </div>

        {/* 4. O resultado econômico do ano */}
        <div className="v4-g2">
          <BoardReceitaMensal
            serie={serieReceita}
            receita={receita}
            nota={[notaRateio, notaEscopo].filter(Boolean).join(' ') || undefined}
          />
          <BoardEconomiaAcumulada
            serie={serieRoi}
            economiaAnual={roi.economiaAnual}
            investimento={roi.investimento}
            melhorias={roi.melhorias}
          />
        </div>

        {/* 5. Leitura em texto */}
        <div style={{ marginBottom: 16 }}>
          <BoardAIBox
            label={sinteseLocal ? 'Resumo local — IA indisponível' : 'Síntese Estratégica — IA Executiva'}
            data={sinteseLocal ?? sintese.data ?? null}
            loading={sintese.isPending}
            onGenerate={handleGenerateSintese}
          />
        </div>

        {/* 6. Acompanhamento de execução */}
        <BoardProjetosCriticos
          projetos={projetosCriticos}
          onProjetoClick={() => navigate('/equipe/board/performance')}
        />
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
