/**
 * Projetos no Board: mesma fonte do Estratégico, outra pergunta.
 * Mix do ativo + caixa vigente. Faturamento operacional fica na Gerencial
 * da Tax/OSG (`DashboardClientesOsContent`).
 */
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardBriefingProjetos } from '@/components/board/BoardBriefingProjetos';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardProjetos } from '@/lib/agenteContextoProjetos';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import { caixaVigente, mixAtivos, serieHorizonte, serieMixMensal } from '@/lib/boardDiretoria';

export function BoardProjetosContent() {
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);
  const { cluster } = useBoardCluster();
  const { clusters } = useBoardHierarquia();

  const os = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;
  const mix = useMemo(() => mixAtivos(os, hoje), [os, hoje]);
  const caixa = useMemo(() => caixaVigente(os), [os]);
  const horizonte = useMemo(() => serieHorizonte(os, hoje), [os, hoje]);
  const serieMix = useMemo(() => serieMixMensal(os, hoje), [os, hoje]);

  const contexto = useMemo(() => contextoBoardProjetos({
    janela: 'contratos vigentes no recorte',
    filtros: {
      periodo: 'recorte vivo',
      cliente: null,
      tipo: null,
      categoria: null,
      centroCusto: null,
      empresa: cluster ? (clusters.find((c) => c.id === cluster)?.nome ?? null) : null,
    },
    kpisClientes: {
      faturamento_total: 0,
      clientes_ativos: 0,
      clientes_ativos_fixos: 0,
      clientes_ativos_pontuais: 0,
      ticket_medio: null,
      os_ativas: mix.ativos,
      contratos_30d: 0,
    },
    kpisOperacional: { contratos_30d: 0, contratos_vencidos: 0, novos_clientes_trimestre: 0 },
    kpisProjetos: {
      os_em_andamento: mix.ativos, os_total: os.length,
      horas_estimadas: 0, horas_realizadas: 0, desvio_medio: null,
    },
    valorSemData: 0,
    serieMensal: [],
    matriz: { meses: [], temSemData: false, linhas: [] },
    detalhe: 'cliente',
    status: [],
    leitura: { mix, caixa, horizonteSemFim: horizonte.semFim },
    falhas: negocio.error ? ['contratos, clientes e OS'] : [],
  }), [cluster, clusters, mix, caixa, horizonte.semFim, os.length, negocio.error]);

  useRegistrarContextoAgente('board.projetos', contexto, negocio.isLoading);

  if (negocio.isLoading) return <Skeleton className="h-[280px]" />;

  return (
    <BoardBriefingProjetos
      mix={mix}
      caixa={caixa}
      horizonte={horizonte}
      serieMix={serieMix}
      os={os}
      hoje={hoje}
    />
  );
}
