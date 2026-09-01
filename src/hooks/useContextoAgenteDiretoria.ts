/**
 * Monta o snapshot único do Board (as quatro leituras) para o agente.
 * Mesmas queries das telas — React Query deduplica.
 */
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useDomainProjetoMembros } from '@/hooks/useDomainProjetoMembros';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { filtrarPorCluster, consolidarRoi, saudeProjetos } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import {
  alertasEstrategicos, concentracaoCarteira, receitaAnoCorrente, receitaEmRisco,
} from '@/lib/boardEstrategico';
import { caixaVigente, fteDeHoras, mixAtivos, saudeOsg, somaHorasSalvas, ticketMedioAno } from '@/lib/boardDiretoria';
import { catalogoFerramentas, ftePorArea } from '@/lib/boardFerramentasLeitura';
import { absorcaoPorFerramentas, cargaDosProjetos } from '@/lib/boardProjetosCarga';
import { carteiraClientes, tempoMedioAditivo } from '@/lib/boardCarteira';
import { distribuicaoRegiao, lacunasAditivo, ocorrenciaServicos } from '@/lib/boardOportunidade';
import { contextoBoardEstrategico } from '@/lib/agenteContextoBoard';
import { contextoBoardFerramentas } from '@/lib/agenteContextoFerramentas';
import { contextoBoardProjetos } from '@/lib/agenteContextoProjetos';
import { contextoBoardClientes } from '@/lib/agenteContextoClientes';
import { blocosLeituraDiretoria, contextoBoardDiretoria } from '@/lib/agenteContextoDiretoria';
import { faixaEmpresaPreenchimento } from '@/lib/preenchimentoSistema';
import type { ContextoTela } from '@/hooks/useAgenteContexto';

const MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function useContextoAgenteDiretoria(): { contexto: ContextoTela; carregando: boolean } {
  const { isAdmin } = useAuth();
  const { ambiente } = useDashboardAmbiente();
  const { cluster } = useBoardCluster();
  const { clusters } = useBoardHierarquia();
  const negocio = useDashboardClientesOs(ambiente);
  const melhoriasQuery = useDomainMelhoriasRoi();
  const membrosQuery = useDomainProjetoMembros();
  const { data: cicloAtivo } = useCicloAtivo();

  const empresa = cluster ? (clusters.find((c) => c.id === cluster)?.nome ?? null) : null;
  const hoje = negocio.hoje;
  const janelaReceita = `${hoje.slice(0, 4)} até ${MES[Number(hoje.slice(5, 7)) - 1]}`;

  const osRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const clienteRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const projetoRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const melhorias = useMemo(
    () => filtrarPorCluster(melhoriasQuery.data ?? [], cluster),
    [melhoriasQuery.data, cluster],
  );
  const membros = useMemo(() => membrosQuery.data ?? [], [membrosQuery.data]);
  const produtosPorOs = negocio.data?.rateioProdutoPorOs;

  const contexto = useMemo(() => {
    const receita = receitaAnoCorrente(osRows, hoje);
    const emRisco = receitaEmRisco(osRows);
    const osDoAno = osRows.filter((o) => o.data_inicio?.slice(0, 4) === hoje.slice(0, 4));
    const concentracao = concentracaoCarteira(osDoAno);
    const mix = mixAtivos(osRows, hoje);
    const caixa = caixaVigente(osRows);
    const ticket = ticketMedioAno(osRows, hoje);
    const osg = saudeOsg(osRows, hoje);
    const roi = consolidarRoi(melhorias);
    const alertas = alertasEstrategicos({
      os: osRows, clientes: clienteRows, projetos: projetoRows,
      concentracao, areas: [], hoje,
    });
    const estrategico = contextoBoardEstrategico({
      janelaReceita, janelaExecucao: 'recorte vivo',
      filtros: { periodo: 'recorte vivo', centroCusto: null, empresa },
      cicloAtivo: cicloAtivo?.nome ?? null,
      receita, emRisco, concentracao,
      clientesComReceita: concentracao.clientes,
      saude: saudeProjetos([]),
      totalHoras: null,
      roi,
      areas: [],
      alertas,
      projetosCriticos: [],
      preenchimento: faixaEmpresaPreenchimento([], []),
      notas: { receita: isAdmin ? undefined : 'Receita limitada aos clientes do seu acesso.' },
      falhas: [
        ...(negocio.error ? ['contratos e clientes'] : []),
        ...(melhoriasQuery.error ? ['melhorias (ROI)'] : []),
      ],
    });
    estrategico.blocos = [
      ...blocosLeituraDiretoria({ mix, caixa, ticket, osg, janela: janelaReceita }),
      ...estrategico.blocos.filter((b) => !['execucao', 'areas', 'preenchimento'].includes(b.id)),
    ];

    const catalogo = catalogoFerramentas(melhorias);
    const horasLiberadas = somaHorasSalvas(catalogo.map((c) => c.horasLiberadas));
    const ferramentas = contextoBoardFerramentas({
      periodo: 'melhorias avaliadas',
      escopo: empresa ?? 'consolidado, todas as unidades',
      pessoa: null,
      totais: null,
      mesReferencia: { label: null, parcial: false, taxaRetencao: null, anteriorLabel: null },
      ferramentas: [],
      pessoas: [],
      catalogoFerramentas: null,
      usandoFixtures: false,
      beneficio: {
        horasLiberadas,
        fte: fteDeHoras(horasLiberadas).fte,
        melhoriasMedidas: catalogo.length,
        porFerramenta: catalogo.map((c) => ({
          nome: c.nome, horas: c.horasLiberadas, fte: c.fte, area: c.area,
        })),
        porArea: ftePorArea(melhorias).map((a) => ({ area: a.area, fte: a.fte })),
      },
      incluirUso: false,
      falhas: melhoriasQuery.error ? ['melhorias (benefício)'] : [],
    });

    const carga = cargaDosProjetos(projetoRows, membros);
    const absorcao = absorcaoPorFerramentas(horasLiberadas, projetoRows);
    const projetos = contextoBoardProjetos({
      janela: 'projetos do recorte',
      filtros: {
        periodo: 'recorte vivo', cliente: null, tipo: null, categoria: null,
        centroCusto: null, empresa,
      },
      kpisClientes: {
        faturamento_total: 0, clientes_ativos: 0, clientes_ativos_fixos: 0,
        clientes_ativos_pontuais: 0, ticket_medio: null, os_ativas: 0, contratos_30d: 0,
      },
      kpisOperacional: { contratos_30d: 0, contratos_vencidos: 0, novos_clientes_trimestre: 0 },
      kpisProjetos: {
        os_em_andamento: projetoRows.length, os_total: projetoRows.length,
        horas_estimadas: carga.reduce((acc, p) => acc + p.horasEstimadas, 0),
        horas_realizadas: carga.reduce((acc, p) => acc + p.horasRealizadas, 0),
        desvio_medio: null,
      },
      valorSemData: 0,
      serieMensal: [],
      matriz: { meses: [], temSemData: false, linhas: [] },
      detalhe: 'cliente',
      status: [],
      carga: {
        projetos: carga.length,
        pessoas: new Set(membros.map((m) => m.user_id)).size,
        valor: carga.reduce((acc, p) => acc + p.valor, 0),
        absorviveis: absorcao.projetosAbsorviveis,
      },
      falhas: [
        ...(negocio.error ? ['projetos'] : []),
        ...(membrosQuery.error ? ['membros'] : []),
      ],
    });

    const clientes = contextoBoardClientes({
      escopoTotal: isAdmin && !cluster,
      ticket,
      regioes: distribuicaoRegiao(clienteRows, osRows),
      servicos: ocorrenciaServicos(osRows, produtosPorOs),
      lacunas: lacunasAditivo(clienteRows, osRows, { produtosPorOs }),
      carteira: carteiraClientes(osRows, hoje),
      diasAditivo: tempoMedioAditivo(osRows),
      falhas: negocio.error ? ['contratos e clientes'] : [],
    });

    return contextoBoardDiretoria({ estrategico, ferramentas, projetos, clientes });
  }, [
    osRows, clienteRows, projetoRows, melhorias, membros, produtosPorOs,
    hoje, janelaReceita, empresa, cluster, isAdmin, cicloAtivo,
    negocio.error, melhoriasQuery.error, membrosQuery.error,
  ]);

  const carregando = negocio.isLoading && !negocio.data;
  return { contexto, carregando };
}
