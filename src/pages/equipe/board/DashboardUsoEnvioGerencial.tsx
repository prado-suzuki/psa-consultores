/**
 * Ferramentas no Board: benefício medido em `process_improvements`.
 * Log de uso (pessoas, ações, retenção) mora na visão técnica.
 */
import { useMemo } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardClusterBar } from '@/components/equipe/board/BoardClusterBar';
import { BoardBriefingFerramentas } from '@/components/board/BoardBriefingFerramentas';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { filtrarPorCluster } from '@/lib/boardExecutivo';

const DashboardUsoEnvioGerencial = () => {
  const { cluster } = useBoardCluster();
  const melhoriasQuery = useDomainMelhoriasRoi();

  const melhorias = useMemo(
    () => filtrarPorCluster(melhoriasQuery.data ?? [], cluster),
    [melhoriasQuery.data, cluster],
  );

  return (
    <BoardLayout
      title="Ferramentas"
      subtitle="Implementadas · redução de tempo · FTE por área"
      headerActions={<BoardClusterBar />}
    >
      {melhoriasQuery.isLoading ? (
        <Skeleton className="h-[280px]" />
      ) : (
        <BoardBriefingFerramentas melhorias={melhorias} />
      )}
    </BoardLayout>
  );
};

export default DashboardUsoEnvioGerencial;
