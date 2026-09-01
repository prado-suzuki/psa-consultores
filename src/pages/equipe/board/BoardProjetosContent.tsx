/**
 * Projetos no Board: carga (hora, gente, valor) e capacidade que as
 * ferramentas liberam. Mix e horizonte ficam no Estratégico.
 */
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardBriefingProjetos } from '@/components/board/BoardBriefingProjetos';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useDomainProjetoMembros } from '@/hooks/useDomainProjetoMembros';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardProjetos } from '@/lib/agenteContextoProjetos';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import { somaHorasSalvas } from '@/lib/boardDiretoria';
import { absorcaoPorFerramentas, cargaDosProjetos } from '@/lib/boardProjetosCarga';
import { catalogoFerramentas } from '@/lib/boardFerramentasLeitura';

export function BoardProjetosContent() {
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);
  const membrosQuery = useDomainProjetoMembros();
  const melhoriasQuery = useDomainMelhoriasRoi();
  const { cluster } = useBoardCluster();
  const { clusters } = useBoardHierarquia();

  const projetos = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const membros = useMemo(() => membrosQuery.data ?? [], [membrosQuery.data]);
  const melhorias = useMemo(
    () => filtrarPorCluster(melhoriasQuery.data ?? [], cluster),
    [melhoriasQuery.data, cluster],
  );
  const horasLiberadas = somaHorasSalvas(catalogoFerramentas(melhorias).map((c) => c.horasLiberadas));
  const carga = useMemo(() => cargaDosProjetos(projetos, membros), [projetos, membros]);
  const absorcao = useMemo(
    () => absorcaoPorFerramentas(horasLiberadas, projetos),
    [horasLiberadas, projetos],
  );

  const contexto = useMemo(() => contextoBoardProjetos({
    janela: 'projetos do recorte',
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
      os_ativas: 0,
      contratos_30d: 0,
    },
    kpisOperacional: { contratos_30d: 0, contratos_vencidos: 0, novos_clientes_trimestre: 0 },
    kpisProjetos: {
      os_em_andamento: projetos.length, os_total: projetos.length,
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
      ...(melhoriasQuery.error ? ['ferramentas'] : []),
    ],
  }), [cluster, clusters, projetos, carga, membros, absorcao.projetosAbsorviveis, negocio.error, membrosQuery.error, melhoriasQuery.error]);

  useRegistrarContextoAgente('board.projetos', contexto, negocio.isLoading || membrosQuery.isLoading);

  if (negocio.isLoading) return <Skeleton className="h-[280px]" />;

  return (
    <BoardBriefingProjetos
      projetos={projetos}
      membros={membros}
      horasLiberadasMes={horasLiberadas}
    />
  );
}
