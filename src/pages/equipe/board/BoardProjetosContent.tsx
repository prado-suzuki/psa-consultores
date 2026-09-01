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
import { somaHorasSalvas } from '@/lib/boardDiretoria';
import { catalogoFerramentas } from '@/lib/boardFerramentasLeitura';

export function BoardProjetosContent() {
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);
  const membrosQuery = useDomainProjetoMembros();
  const melhoriasQuery = useDomainMelhoriasRoi();
  const { cluster } = useBoardCluster();

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

  if (negocio.isLoading) return <Skeleton className="h-[280px]" />;

  return (
    <BoardBriefingProjetos
      projetos={projetos}
      membros={membros}
      horasLiberadasMes={horasLiberadas}
    />
  );
}
