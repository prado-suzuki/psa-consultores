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
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import { aplicarRecorteMelhorias, aplicarRecorteOs, aplicarRecorteProjetos } from '@/lib/boardRecorte';
import { somaHorasSalvas } from '@/lib/boardDiretoria';
import { catalogoFerramentas } from '@/lib/boardFerramentasLeitura';

export function BoardProjetosContent() {
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);
  const membrosQuery = useDomainProjetoMembros();
  const melhoriasQuery = useDomainMelhoriasRoi();
  const { cluster, cliente, ano, mes } = useBoardCluster();
  const recorte = useMemo(() => ({ cliente, ano, mes }), [cliente, ano, mes]);
  const osRows = useMemo(
    () => aplicarRecorteOs(
      filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
      recorte,
    ),
    [negocio.data, cluster, recorte],
  );
  const clusterDoCliente = useMemo(
    () => (cliente
      ? (negocio.data?.clienteRows ?? []).find((c) => c.cliente_id === cliente)?.cluster_id ?? null
      : null),
    [negocio.data, cliente],
  );

  const projetos = useMemo(
    () => aplicarRecorteProjetos(
      filtrarLegado(filtrarPorCluster(negocio.data?.projetoRows ?? [], cluster)),
      osRows,
      recorte,
    ),
    [negocio.data, cluster, recorte, osRows],
  );
  const membros = useMemo(() => membrosQuery.data ?? [], [membrosQuery.data]);
  const melhorias = useMemo(
    () => aplicarRecorteMelhorias(
      filtrarPorCluster(melhoriasQuery.data ?? [], cluster),
      recorte,
      clusterDoCliente,
    ),
    [melhoriasQuery.data, cluster, recorte, clusterDoCliente],
  );
  const horasLiberadas = somaHorasSalvas(catalogoFerramentas(melhorias).map((c) => c.horasLiberadas));

  if (negocio.isLoading) return <Skeleton className="h-[280px]" />;

  return (
    <BoardBriefingProjetos
      projetos={projetos}
      membros={membros}
      horasLiberadasMes={horasLiberadas}
    />
  );
}
