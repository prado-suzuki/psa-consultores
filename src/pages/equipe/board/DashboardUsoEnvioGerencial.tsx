/**
 * Ferramentas no Board: benefício medido em `process_improvements`.
 * Log de uso (pessoas, ações, retenção) mora na visão técnica — a reunião
 * de 28/08 pediu clique, não a primeira faixa.
 */
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardClusterBar } from '@/components/equipe/board/BoardClusterBar';
import { BoardBriefingFerramentas } from '@/components/board/BoardBriefingFerramentas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useDomainMelhoriasRoi } from '@/hooks/useDomainMelhoriasRoi';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardFerramentas } from '@/lib/agenteContextoFerramentas';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { fteDeHoras, somaHorasSalvas } from '@/lib/boardDiretoria';

const DashboardUsoEnvioGerencial = () => {
  const navigate = useNavigate();
  const acessoTecnico = usePageAccess('/equipe/dashboard');
  const { cluster } = useBoardCluster();
  const { clusters } = useBoardHierarquia();
  const melhoriasQuery = useDomainMelhoriasRoi();

  const melhorias = useMemo(
    () => filtrarPorCluster(melhoriasQuery.data ?? [], cluster),
    [melhoriasQuery.data, cluster],
  );
  const horasLiberadas = somaHorasSalvas(melhorias.map((m) => m.time_saved_hours));
  const beneficio = {
    horasLiberadas,
    fte: fteDeHoras(horasLiberadas).fte,
    melhoriasMedidas: melhorias.length,
  };

  useRegistrarContextoAgente('board.ferramentas', contextoBoardFerramentas({
    periodo: 'melhorias avaliadas',
    escopo: cluster
      ? (clusters.find((c) => c.id === cluster)?.nome ?? 'recorte ativo')
      : 'consolidado, todas as unidades',
    pessoa: null,
    totais: null,
    mesReferencia: { label: null, parcial: false, taxaRetencao: null, anteriorLabel: null },
    ferramentas: [],
    pessoas: [],
    catalogoFerramentas: null,
    usandoFixtures: false,
    beneficio,
    incluirUso: false,
    falhas: melhoriasQuery.error ? ['melhorias (benefício)'] : [],
  }), melhoriasQuery.isLoading);

  return (
    <BoardLayout
      title="Ferramentas"
      subtitle="Antes × depois · FTE · demanda em —"
      headerActions={(
        <>
          <BoardClusterBar />
          {!acessoTecnico.isLoading && acessoTecnico.hasAccess ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/equipe/dashboards?painel=controle-uso-envio')}
            >
              <BarChart3 className="h-4 w-4" />
              Quem usa
            </Button>
          ) : undefined}
        </>
      )}
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
