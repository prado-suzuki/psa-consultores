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
  BOARD_AREAS, filtrarPorCluster, filtrarTarefasPorProjetos, saudeProjetos,
  consolidarRoi, serieRoiAcumulado, resumoPorArea, mesclarResumoArea,
  type BoardAreaKey, type ResumoArea,
} from '@/lib/boardExecutivo';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import {
  alertasEstrategicos, concentracaoCarteira, receitaAnoCorrente, receitaEmRisco,
  serieReceitaComparada, ticketMedioAtivo,
} from '@/lib/boardEstrategico';
import { useDomainTrabalhoDigital } from '@/hooks/useDomainTrabalhoDigital';
import { resumoDigital, diagnosticoDigital } from '@/lib/trabalhoDigital';

// O recorte por EMPRESA não mora aqui: vem da barra global (`useBoardCluster`),
// que vale para a área Board inteira. Aqui fica só a janela de execução.
const DEFAULTS = { periodo: '30d' };

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
 * O filtro de ÁREA recorta só a execução: receita vive na OS, que não tem área
 * (o mais próximo é centro de custo, e o rateio dele fica em "Clientes e OS").
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
  const osRows = useMemo(
    () => filtrarPorCluster(negocio.data?.osRows ?? [], cluster),
    [negocio.data, cluster],
  );
  const clienteRows = useMemo(
    () => filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster),
    [negocio.data, cluster],
  );
  const projetoRows = useMemo(
    () => filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;

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
  // sem área vinculada desaparecer da tela. As fontes são tabelas distintas de
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
      resumoPorArea(projetos, tarefas).map((r) => [r.area, r]),
    );
    // A fonte da Digital (`sprint_deliverables`) não tem cluster: com empresa
    // selecionada ela entraria inteira, somando trabalho de outras empresas na
    // linha Dev. Fora do recorte é melhor ausente que errada — o rodapé avisa.
    if (!cluster) {
      for (const linha of linhasDigital) {
        const existente = porArea.get(linha.area);
        porArea.set(linha.area, existente ? mesclarResumoArea(existente, linha) : linha);
      }
    }
    return [...porArea.values()]
      // Ordem canônica das áreas, independente de qual fonte chegou primeiro.
      .sort((a, b) => BOARD_AREAS.indexOf(a.area) - BOARD_AREAS.indexOf(b.area));
  }, [projetos, tarefas, linhasDigital, cluster]);

  /** Ressalvas do rodapé do rollup: fonte, acesso negado e dado incompleto. */
  const notaAreas = useMemo(() => {
    if (cluster) {
      return 'Só tarefas de projeto (Tax/OSG): os entregáveis de sprint da Digital não têm cluster e ficam fora quando há uma empresa selecionada.';
    }
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
  }, [digital, diagDigital, digitalQuery.isError, cluster]);

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

  const notaReceita = [
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
          <BoardReceitaMensal serie={serieReceita} receita={receita} nota={notaEscopo} />
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
