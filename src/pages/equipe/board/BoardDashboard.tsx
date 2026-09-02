import { useMemo, useEffect, useRef } from 'react';
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
import { BoardChip } from '@/components/board/BoardChip';
import { BoardBriefingDiretoria } from '@/components/board/BoardBriefingDiretoria';
import { BoardClusterBar } from '@/components/equipe/board/BoardClusterBar';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import {
  filtrarPorCluster, filtrarTarefasPorProjetos, saudeProjetos,
  consolidarRoi,
} from '@/lib/boardExecutivo';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { aplicarRecorteClientes, aplicarRecorteOs, aplicarRecorteProjetos, hojeDoRecorte } from '@/lib/boardRecorte';
import {
  alertasEstrategicos, concentracaoCarteira, ratearPorCentroCusto, receitaAnoCorrente,
  receitaEmRisco, serieReceitaComparada,
} from '@/lib/boardEstrategico';
import { centrosCustoEmUso } from '@/lib/dashboardClientesOs/aggregations';
import { useBoardRollupAreas } from '@/hooks/useBoardRollupAreas';
import { filtrarLegado } from '@/lib/boardLegado';
import {
  caixaVigente, mixAtivos, saudeOsg, serieHorizonte, serieMixMensal, serieOsgAno, ticketMedioAno,
} from '@/lib/boardDiretoria';
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

const brlMil = (v: number) => Math.round(v / 1000).toLocaleString('pt-BR');

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
  const { cluster, cliente, ano, mes } = useBoardCluster();
  const recorte = useMemo(() => ({ cliente, ano, mes }), [cliente, ano, mes]);

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
      aplicarRecorteOs(
        filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
        recorte,
      ),
      rateioPorOs ?? new Map(),
      ccSelecionado,
    ),
    [negocio.data, cluster, recorte, rateioPorOs, ccSelecionado],
  );
  // Com centro de custo escolhido, a carteira é a dos clientes que têm OS nele —
  // mesma regra da tela "Clientes e OS", senão o KPI de clientes ativos contaria
  // quem ficou de fora da receita mostrada ao lado.
  const clienteRows = useMemo(() => {
    const base = aplicarRecorteClientes(
      filtrarLegado(filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster)),
      osRows,
      recorte,
    );
    if (!ccSelecionado) return base;
    const comOs = new Set(osRows.map((o) => o.cliente_id));
    return base.filter((c) => comOs.has(c.cliente_id));
  }, [negocio.data, cluster, recorte, ccSelecionado, osRows]);
  const projetoRows = useMemo(
    () => aplicarRecorteProjetos(
      filtrarLegado(filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster)),
      osRows,
      recorte,
    ),
    [negocio.data, cluster, recorte, osRows],
  );
  const hoje = hojeDoRecorte(negocio.hoje, recorte);

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
  const emRisco = useMemo(() => receitaEmRisco(osRows), [osRows]);
  const mix = useMemo(() => mixAtivos(osRows, hoje), [osRows, hoje]);
  const serieMix = useMemo(() => serieMixMensal(osRows, hoje), [osRows, hoje]);
  const ticket = useMemo(() => ticketMedioAno(osRows, hoje), [osRows, hoje]);
  const caixa = useMemo(() => caixaVigente(osRows), [osRows]);
  const horizonte = useMemo(() => serieHorizonte(osRows, hoje), [osRows, hoje]);
  const osg = useMemo(() => saudeOsg(osRows, hoje), [osRows, hoje]);
  const serieOsgData = useMemo(() => serieOsgAno(osRows, hoje), [osRows, hoje]);

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

  const projetosCriticos = useMemo(
    () => projetos.filter(p => p.computed_status === 'em_risco' || p.computed_status === 'atrasado').slice(0, 5),
    [projetos],
  );

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

  const todasAsFalhas = useMemo(
    () => [...falhas, ...falhasPreenchimento],
    [falhas, falhasPreenchimento],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [kpisLoading, revealRef]);

  return (
    <BoardLayout
      title="Estratégico"
      subtitle={(
        <>
          {format(new Date(), 'dd MMM yyyy', { locale: ptBR })}
          {cicloAtivo ? ` · ${cicloAtivo.nome}` : carregandoCiclo ? ' · ciclo…' : ''}
          {todasAsFalhas.length > 0 && ` · ${todasAsFalhas.join(', ')} não carregaram`}
          {receitaEmJogo > 0 && (
            <BoardChip variant="risk">R$ {brlMil(receitaEmJogo)} mil parado em contrato</BoardChip>
          )}
        </>
      )}
      headerActions={(
        <>
          <BoardClusterBar />
          <BoardFilterBar
            hideHeading
            filters={[
              { key: 'periodo', label: 'Período', type: 'select', hideLabel: true, width: '128px', options: [{ value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }, { value: '90d', label: '90 dias' }, { value: 'ciclo', label: 'Ciclo' }] },
              { key: 'centroCusto', label: 'Centro de custo', type: 'select', hideLabel: true, width: '220px', options: ccOptions },
            ]}
            activeFilters={filters}
            onFilterChange={setFilter}
            onReset={resetFilters}
            activeCount={activeCount}
          />
        </>
      )}
    >
      <div ref={containerRef} style={{ background: 'var(--bd-page)' }}>

        {kpisLoading ? (
          <Skeleton className="h-[280px] mb-6" />
        ) : (
          <BoardBriefingDiretoria
            mix={mix}
            serieMix={serieMix}
            ticket={ticket}
            caixa={caixa}
            serieReceita={serieReceita}
            horizonte={horizonte}
            osg={osg}
            serieOsg={serieOsgData}
            concentracao={concentracao}
            onProjetos={() => navigate('/equipe/board/dashboard-clientes-os')}
            onFerramentas={() => navigate('/equipe/board/uso-envio')}
          />
        )}
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
