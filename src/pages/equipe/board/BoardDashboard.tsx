import { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDomainBoardDashboard } from '@/hooks/useDomainBoardDashboard';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useDomainPreenchimentoSistema } from '@/hooks/useDomainPreenchimentoSistema';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { listarFalhas } from '@/lib/performanceOperacional';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar } from '@/components/board/BoardFilterBar';
import { BoardKpisNegocio } from '@/components/board/BoardKpisNegocio';
import { BoardMixProjetos } from '@/components/board/BoardMixProjetos';
import { BoardOsgSaude } from '@/components/board/BoardOsgSaude';
import { BoardChip } from '@/components/board/BoardChip';
import { BoardAreaRollup } from '@/components/board/BoardAreaRollup';
import { BoardConcentracao } from '@/components/board/BoardConcentracao';
import { BoardReceitaMensal } from '@/components/board/BoardReceitaMensal';
import { BoardProjetosCriticos } from '@/components/board/BoardProjetosCriticos';
import { BoardPreenchimentoSistema } from '@/components/board/BoardPreenchimentoSistema';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import {
  filtrarPorCluster, filtrarTarefasPorProjetos, saudeProjetos,
  consolidarRoi,
} from '@/lib/boardExecutivo';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import {
  alertasEstrategicos, concentracaoCarteira, ratearPorCentroCusto, receitaAnoCorrente,
  receitaEmRisco, serieReceitaComparada,
} from '@/lib/boardEstrategico';
import { centrosCustoEmUso } from '@/lib/dashboardClientesOs/aggregations';
import {
  mixProjetosAtivos, receitaDiretoria, capacidadeMelhorias, saudeOsg,
} from '@/lib/boardDiretoria';
import { semCadastroLegado } from '@/lib/boardLegado';
import { useDomainHeadcountCluster } from '@/hooks/useDomainHeadcountCluster';
import { useBoardRollupAreas } from '@/hooks/useBoardRollupAreas';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardEstrategico } from '@/lib/agenteContextoBoard';
import {
  resumoPreenchimentoPorArea, linhaSemArea, faixaEmpresaPreenchimento,
} from '@/lib/preenchimentoSistema';

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
  // `isLoading` junto: sem ele o travessão de "Ciclo ativo: —" servia para os
  // dois casos, e "ainda não sei" não é "não existe".
  const { data: cicloAtivo, isLoading: carregandoCiclo } = useCicloAtivo();
  const { data: overview } = useDesempenhoOverview(cicloAtivo?.id);
  const { tarefasConcluidasQuery, horasAlocadasQuery } = useDomainBoardDashboard({ desdeISO: periodFrom });
  const melhoriasQuery = useDomainMelhoriasRoi();
  const headcountQuery = useDomainHeadcountCluster();
  // Sobe para cá (antes vivia junto do snapshot do agente): o recorte OSG
  // precisa resolver o cluster pelo nome antes dos cálculos.
  const { clusters: clustersHierarquia } = useBoardHierarquia();
  // Query dedicada e enxuta do bloco "Preenchimento do sistema" -- deliberadamente
  // SEPARADA de `usePerformanceData` (ver `useDomainPreenchimentoSistema`).
  const {
    areasQuery: preenchAreasQuery, projetosQuery: preenchProjetosQuery,
    osQuery: preenchOsQuery, clientesQuery: preenchClientesQuery,
  } = useDomainPreenchimentoSistema();

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
      // Cadastro LEGADO fora antes de qualquer conta (28/08): PSA Consultores,
      // P Consultores e o resíduo do Prado Suzuki pesam e produzem número que
      // a diretoria já sabe estar errado. Ver `boardLegado.ts`.
      semCadastroLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster), (o) => o.cliente_nome),
      rateioPorOs ?? new Map(),
      ccSelecionado,
    ),
    [negocio.data, cluster, rateioPorOs, ccSelecionado],
  );
  // Com centro de custo escolhido, a carteira é a dos clientes que têm OS nele —
  // mesma regra da tela "Clientes e OS", senão o KPI de clientes ativos contaria
  // quem ficou de fora da receita mostrada ao lado.
  const clienteRows = useMemo(() => {
    const base = semCadastroLegado(
      filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster),
      (c) => c.cliente_nome,
    );
    if (!ccSelecionado) return base;
    const comOs = new Set(osRows.map((o) => o.cliente_id));
    return base.filter((c) => comOs.has(c.cliente_id));
  }, [negocio.data, cluster, ccSelecionado, osRows]);
  const projetoRows = useMemo(
    () => semCadastroLegado(
      filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster),
      (p) => p.cliente_nome,
    ),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;

  // Só os centros que aparecem em algum rateio — catálogo inteiro traria dezenas
  // de opções que devolveriam tela vazia.
  const ccOptions = useMemo(() => [
    { value: TODOS_CC, label: 'Todos os centros de custo' },
    ...semCadastroLegado(centrosCustoEmUso(rateioPorOs ?? new Map()), (c) => c.label)
      .map((c) => ({ value: c.id, label: c.label })),
  ], [rateioPorOs]);
  const ccLabel = ccSelecionado
    ? ccOptions.find((o) => o.value === ccSelecionado)?.label ?? ccSelecionado
    : null;

  const anoCorrente = hoje.slice(0, 4);
  const janelaReceita = `${anoCorrente} até ${MES_EXTENSO[Number(hoje.slice(5, 7)) - 1]}`;

  const receita = useMemo(() => receitaAnoCorrente(osRows, hoje), [osRows, hoje]);
  const serieReceita = useMemo(() => serieReceitaComparada(osRows, hoje), [osRows, hoje]);
  const emRisco = useMemo(() => receitaEmRisco(osRows), [osRows]);

  // Concentração sobre o MESMO recorte do KPI de receita (ano corrente): a
  // fatia de um cliente só significa algo contra o denominador que está na tela.
  const osDoAno = useMemo(
    () => osRows.filter((o) => o.data_inicio?.slice(0, 4) === anoCorrente),
    [osRows, anoCorrente],
  );
  const concentracao = useMemo(() => concentracaoCarteira(osDoAno), [osDoAno]);

  // ── Execução ───────────────────────────────────────────────────────────
  // `projetos` é o recorte da tela; `todosProjetos` fica intacto porque
  // `resumoPorArea` precisa dele para resolver tarefa→projeto→área.
  const todosProjetos = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const projetos = useMemo(() => filtrarPorCluster(todosProjetos, cluster), [todosProjetos, cluster]);
  const saude = useMemo(() => saudeProjetos(projetos), [projetos]);
  // Tarefa segue o projeto: sem isto, toda tarefa de fora do recorte cairia em
  // "Outros" no rollup em vez de sumir.
  const tarefas = useMemo(
    () => {
      const todas = tarefasConcluidasQuery.data ?? [];
      return cluster ? filtrarTarefasPorProjetos(todas, projetos) : todas;
    },
    [tarefasConcluidasQuery.data, projetos, cluster],
  );

  // Horas ALOCADAS no escopo (P3, reunião 17/08) -- estimated_hours de toda
  // tarefa da janela, qualquer status, recortada pelo mesmo escopo de projeto
  // que o resto da execução usa. `null` enquanto a consulta carrega, nunca 0
  // por omissão -- 0 é uma resposta, "carregando" é outra.
  const totalHoras = useMemo(() => {
    if (!horasAlocadasQuery.data) return null;
    const escopo = cluster ? filtrarTarefasPorProjetos(horasAlocadasQuery.data, projetos) : horasAlocadasQuery.data;
    return escopo.reduce((soma, t) => soma + (t.estimated_hours ?? 0), 0);
  }, [horasAlocadasQuery.data, projetos, cluster]);
  const roi = useMemo(() => consolidarRoi(melhoriasQuery.data ?? []), [melhoriasQuery.data]);

  // ── A leitura de DIRETORIA (28/08) ─────────────────────────────────────
  // Tudo aqui é função pura sobre linhas que a tela JÁ carrega — nenhuma
  // consulta nova, nenhum campo inventado. Ver `boardDiretoria.ts`.
  const receitaDir = useMemo(() => receitaDiretoria(osRows, hoje), [osRows, hoje]);
  const capacidade = useMemo(
    () => capacidadeMelhorias(melhoriasQuery.data ?? []),
    [melhoriasQuery.data],
  );

  // Janela real analisada — o mesmo range dos projetos, para o rótulo não mentir.
  const diasJanela = useMemo(() => {
    if (!periodFrom) return 30;
    return Math.max(1, differenceInDays(new Date(), parseISO(periodFrom)));
  }, [periodFrom]);
  const janelaLabel = periodo === 'ciclo'
    ? `ciclo ${cicloAtivo?.nome ?? 'ativo'}`
    : `últimos ${diasJanela} dias`;

  const mixProjetos = useMemo(
    () => (negocio.error
      ? null
      : mixProjetosAtivos({ projetos: projetoRows, os: osRows, hoje, dias: diasJanela })),
    [projetoRows, osRows, hoje, diasJanela, negocio.error],
  );

  // O recorte OSG não segue o filtro de empresa da barra: é um card de ÁREA e
  // precisa da própria série completa, inclusive quando a diretoria está
  // olhando outro cluster.
  const clusterOsg = useMemo(
    () => clustersHierarquia.find((c) => c.nome.trim().toUpperCase() === 'OSG') ?? null,
    [clustersHierarquia],
  );
  const osg = useMemo(() => {
    if (!clusterOsg) return null;
    const osDaArea = semCadastroLegado(
      (negocio.data?.osRows ?? []).filter((o) => o.cluster_id === clusterOsg.id),
      (o) => o.cliente_nome,
    );
    return saudeOsg({
      os: osDaArea,
      melhorias: (melhoriasQuery.data ?? []).filter((m) => m.cluster_id === clusterOsg.id),
      headcount: headcountQuery.data?.get(clusterOsg.id) ?? null,
      hoje,
    });
  }, [clusterOsg, negocio.data, melhoriasQuery.data, headcountQuery.data, hoje]);

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

  // ── Preenchimento do sistema (Bloco F, 21/08) ──────────────────────────
  // `data ?? null` (nunca `?? []`): a consulta que falhou precisa chegar como
  // `null` nas funções puras, senão elas leriam "nenhum registro" (zero) onde
  // a verdade é "não sei" -- ver a regra de honestidade em `preenchimentoSistema.ts`.
  const preenchProjetos = useMemo(
    () => preenchProjetosQuery.data ?? (preenchProjetosQuery.isError ? null : []),
    [preenchProjetosQuery.data, preenchProjetosQuery.isError],
  );
  const preenchOs = useMemo(
    () => preenchOsQuery.data ?? (preenchOsQuery.isError ? null : []),
    [preenchOsQuery.data, preenchOsQuery.isError],
  );
  const preenchClientes = useMemo(
    () => preenchClientesQuery.data ?? (preenchClientesQuery.isError ? null : []),
    [preenchClientesQuery.data, preenchClientesQuery.isError],
  );
  const preenchAreas = useMemo(
    () => resumoPreenchimentoPorArea(preenchAreasQuery.data ?? [], preenchProjetos),
    [preenchAreasQuery.data, preenchProjetos],
  );
  const preenchSemArea = useMemo(() => linhaSemArea(preenchProjetos), [preenchProjetos]);
  const preenchFaixa = useMemo(
    () => faixaEmpresaPreenchimento(preenchOs, preenchClientes),
    [preenchOs, preenchClientes],
  );
  const falhasPreenchimento = useMemo(() => listarFalhas([
    { rotulo: 'áreas do cadastro', falhou: preenchAreasQuery.isError },
    { rotulo: 'projetos (preenchimento)', falhou: preenchProjetosQuery.isError },
    { rotulo: 'ordens de serviço (preenchimento)', falhou: preenchOsQuery.isError },
    { rotulo: 'clientes (preenchimento)', falhou: preenchClientesQuery.isError },
  ]), [
    preenchAreasQuery.isError, preenchProjetosQuery.isError, preenchOsQuery.isError, preenchClientesQuery.isError,
  ]);

  const execucaoLoading = projectsQuery.isLoading || membersQuery.isLoading
    || melhoriasQuery.isLoading || tarefasConcluidasQuery.isLoading || horasAlocadasQuery.isLoading
    || (!!cicloAtivo && !overview);
  const kpisLoading = execucaoLoading || negocio.isLoading;

  // Estado de erro visível (Bloco D, 21/08): a FK ausente de org_projects fez
  // esta consulta falhar em silêncio e a tela desenhou 0 projetos ativos como
  // se fosse dado real -- o Operacional já avisava disso, o Estratégico não.
  // Mesmo padrão de `listarFalhas`/`performanceOperacional.ts`.
  const falhas = useMemo(() => listarFalhas([
    { rotulo: 'projetos e tarefas', falhou: projectsQuery.isError },
    { rotulo: 'equipe', falhou: membersQuery.isError },
    { rotulo: 'melhorias (ROI)', falhou: melhoriasQuery.isError },
    { rotulo: 'entregas concluídas', falhou: tarefasConcluidasQuery.isError },
    { rotulo: 'horas alocadas', falhou: horasAlocadasQuery.isError },
    { rotulo: 'contratos e clientes', falhou: !!negocio.error },
  ]), [
    projectsQuery.isError, membersQuery.isError, melhoriasQuery.isError,
    tarefasConcluidasQuery.isError, horasAlocadasQuery.isError, negocio.error,
  ]);

  // ── O que o Agente PSA le desta tela ───────────────────────────────────
  // O balao flutuante NAO consulta o banco: ele recebe este snapshot, montado
  // pelos MESMOS valores que os blocos acima desenham (`agenteContextoBoard`).
  // Numero que o agente citar tem que ser localizavel na tela com Ctrl+F --
  // por isso nada aqui e recalculado, so rotulado.

  // As duas listas de falha juntas, numa fonte só: o subtítulo da tela e os
  // `avisos` do snapshot do agente têm que dizer exatamente a mesma coisa.
  // Divergir aqui produziria a pior forma de estar errado -- o usuário lê um
  // motivo na tela e ouve outro do agente, sem nenhum dos dois estar errado.
  const todasAsFalhas = useMemo(
    () => [...falhas, ...falhasPreenchimento],
    [falhas, falhasPreenchimento],
  );

  const contextoAgente = useMemo(() => contextoBoardEstrategico({
    janelaReceita, janelaExecucao: janelaLabel,
    filtros: {
      periodo,
      centroCusto: ccLabel,
      empresa: cluster ? (clustersHierarquia.find((c) => c.id === cluster)?.nome ?? null) : null,
    },
    cicloAtivo: cicloAtivo?.nome ?? null,
    receita, emRisco, concentracao,
    clientesComReceita: concentracao.clientes,
    saude, totalHoras, roi,
    // A faixa da diretoria (28/08) — o agente só fala do que a tela publica.
    mix: mixProjetos, receitaDiretoria: receitaDir, capacidade, osg,
    areas: resumoAreas,
    alertas,
    projetosCriticos: projetosCriticos.map((p) => ({
      name: p.name, computed_status: p.computed_status, area_name: p.area_name,
    })),
    preenchimento: preenchFaixa,
    notas: { receita: notaReceita, areas: notaAreas },
    falhas: todasAsFalhas,
  }), [
    janelaReceita, janelaLabel, periodo, ccLabel, cluster, clustersHierarquia, cicloAtivo,
    receita, emRisco, concentracao, saude, totalHoras, roi, resumoAreas, alertas,
    mixProjetos, receitaDir, capacidade, osg,
    projetosCriticos, preenchFaixa, notaReceita, notaAreas, todasAsFalhas,
  ]);
  // `kpisLoading` viaja junto: com a tela a meio carregar, o painel do agente
  // nao deixa perguntar -- responder sobre metade dos numeros e pior que esperar.
  useRegistrarContextoAgente('board.estrategico', contextoAgente, kpisLoading);

  const [mixAberto, setMixAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [kpisLoading, revealRef]);

  return (
    <BoardLayout title="Estratégico" subtitle="Negócio, risco e entrega">
      <div ref={containerRef} style={{ background: 'var(--bd-page)' }}>
        {/* Header */}
        <div className="pg-head" data-reveal>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className="pg-title">Estratégico</div>
              {/* O motivo da falha vive AQUI, no subtítulo que já existia, e
                  não num card próprio (decisão da usuária, 21/08: "não quero um
                  monte de aviso na tela, quero algo mais sutil"). O que impede
                  a tela de mentir não é o aviso — é o "—" no lugar do 0 na
                  faixa de KPIs abaixo. Esta linha só diz por quê. */}
              <div className="pg-sub">
                {format(new Date(), 'dd MMM yyyy', { locale: ptBR })}
                {' · '}
                {cicloAtivo
                  ? `Ciclo ativo: ${cicloAtivo.nome}`
                  : carregandoCiclo ? 'carregando ciclo…' : 'sem ciclo de avaliação ativo'}
                {todasAsFalhas.length > 0 && ` · ${todasAsFalhas.join(', ')} não carregaram`}
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

        {/* REMOVIDO (21/08): os dois primeiros blocos da tela eram cartões de
            AVISO e de ALERTA -- "Dados incompletos" e a faixa "Exige decisão".
            Os dois foram para dentro do painel do Agente PSA, no ícone ao lado
            do título, e nada foi descartado:

            - `alertas` (de `alertasEstrategicos`) continua sendo calculado e
              vai no snapshot publicado acima, no bloco `alertas`, que é de onde
              `AgentePainelDecisao` desenha a mesma faixa;
            - `falhas` continua alimentando os `avisos` do snapshot, e enquanto
              houver falha o ícone fica com ponto VERMELHO. É esse ponto que
              sustenta a garantia da casa: consulta que falhou não volta a
              passar por dado real.

            Os dois deixaram de OCUPAR a grade; nenhum deixou de existir. */}

        {/* 2. Os números do negócio */}
        {kpisLoading ? (
          <Skeleton className="h-[132px] rounded-2xl mb-[18px]" />
        ) : (
          /* `null`, não `saude.total`, quando a consulta de projetos falhou:
             sem projeto nenhum carregado, `saudeProjetos` devolve 0/0% e a
             faixa desenharia zero como se fosse a resposta. */
          <BoardKpisNegocio
            mix={mixProjetos}
            receita={receitaDir}
            capacidade={capacidade}
            roiPct={roi.roiPct}
            janelaExecucao={janelaLabel}
            janelaValor={janelaReceita}
            onAbrirMix={() => setMixAberto((v) => !v)}
            onNavigate={navigate}
          />
        )}

        {/* O MIX só existe a partir do clique no cartão de projetos ativos —
            detalhamento, não bloco fixo. */}
        {mixAberto && mixProjetos && (
          <div style={{ marginBottom: 18 }}>
            <BoardMixProjetos
              mix={mixProjetos}
              janelaLabel={janelaLabel}
              onFechar={() => setMixAberto(false)}
            />
          </div>
        )}

        {/* 2b. Recorte OSG — card de ÁREA (28/08). Fica fora do filtro de
            empresa de propósito: é a pergunta "essa área fecha a conta?". */}
        {!kpisLoading && (
          <div style={{ marginBottom: 18 }}>
            <BoardOsgSaude
              osg={osg}
              motivoAusencia={
                negocio.error
                  ? 'contratos e clientes não carregaram'
                  : 'cluster OSG não encontrado na estrutura atual'
              }
              onClick={() => navigate('/equipe/board/dashboard-clientes-os')}
            />
          </div>
        )}

        {/* 3a. De quem depende -- largura total: perdeu o parceiro de grade
            quando "Áreas em um olhar" (3b) ganhou linha própria. */}
        <div style={{ marginBottom: 18 }}>
          <BoardConcentracao
            concentracao={concentracao}
            janelaLabel={janelaReceita}
            nota={notaReceita}
            onClienteClick={() => navigate('/equipe/board/dashboard-clientes-os')}
          />
        </div>

        {/* 3b. Como as áreas estão entregando -- largura total (reunião 17/08):
            mostra todas as áreas, não divide espaço, e ganhou filtro próprio
            no cabeçalho (dentro de BoardAreaRollup). */}
        <div style={{ marginBottom: 18 }}>
          <BoardAreaRollup
            areas={resumoAreas}
            janelaLabel={janelaLabel}
            nota={notaAreas}
            onAreaClick={() => navigate('/equipe/board/performance')}
          />
        </div>

        {/* 4. O resultado econômico do ano -- "Economia validada acumulada"
            saiu (reunião 17/08, é projeção); Receita mensal fica sozinha e
            passa a ocupar a largura total. */}
        <div style={{ marginBottom: 18 }}>
          <BoardReceitaMensal
            serie={serieReceita}
            receita={receita}
            nota={[notaRateio, notaEscopo].filter(Boolean).join(' ') || undefined}
          />
        </div>

        {/* O chat de IA (reunião 17/08) ENTROU, e não como bloco na grade: é o
            balão do Agente PSA, no canto inferior direito, publicado por
            `useRegistrarContextoAgente` acima. Ficar fora da grade foi
            deliberado — ele acompanha a rolagem e atende as outras telas do
            Board pelo mesmo caminho, bastando cada uma publicar o seu
            snapshot. Configuração e histórico de aprendizado: Digital >
            Acessos > Agente. */}

        {/* 5. Acompanhamento de execução */}
        <BoardProjetosCriticos
          projetos={projetosCriticos}
          onProjetoClick={() => navigate('/equipe/board/performance')}
        />

        {/* 6. Preenchimento do sistema -- o inverso dos blocos acima: não é
            resultado de trabalho, é o que falta cadastrar, por área, para o
            dono cobrar quem alimenta o sistema (Bloco F, 21/08). */}
        <div style={{ marginTop: 18 }}>
          <BoardPreenchimentoSistema
            areas={preenchAreas}
            semArea={preenchSemArea}
            faixa={preenchFaixa}
            falhaAreas={preenchAreasQuery.isError}
            falhas={falhasPreenchimento}
          />
        </div>
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
