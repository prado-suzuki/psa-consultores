import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardClusterBar } from '@/components/equipe/board/BoardClusterBar';
import { BoardBriefingClientes } from '@/components/board/BoardBriefingClientes';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { ticketMedioAno } from '@/lib/boardDiretoria';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import {
  distribuicaoRegiao, lacunasAditivo, ocorrenciaServicos,
} from '@/lib/boardOportunidade';
import { carteiraClientes, tempoMedioAditivo } from '@/lib/boardCarteira';

/**
 * Clientes — ocorrência de serviço e similaridade de praça.
 * Sem mapa. Fonte: as mesmas OS/clientes do Estratégico.
 */
const BoardClientes = () => {
  const { ambiente } = useDashboardAmbiente();
  const { cluster } = useBoardCluster();
  const negocio = useDashboardClientesOs(ambiente);

  const osRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const clienteRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;
  const produtosPorOs = negocio.data?.rateioProdutoPorOs;
  const ticket = useMemo(() => ticketMedioAno(osRows, hoje), [osRows, hoje]);
  const ativos = useMemo(() => clienteRows.filter((c) => c.ativo).length, [clienteRows]);
  const regioes = useMemo(() => distribuicaoRegiao(clienteRows, osRows), [clienteRows, osRows]);
  const servicos = useMemo(() => ocorrenciaServicos(osRows, produtosPorOs), [osRows, produtosPorOs]);
  const lacunas = useMemo(
    () => lacunasAditivo(clienteRows, osRows, { produtosPorOs }),
    [clienteRows, osRows, produtosPorOs],
  );
  const carteira = useMemo(() => carteiraClientes(osRows, hoje), [osRows, hoje]);
  const diasAditivo = useMemo(() => tempoMedioAditivo(osRows), [osRows]);

  return (
    <BoardLayout
      title="Clientes"
      subtitle="Receita · renovação · oferta · aditivo"
      headerActions={<BoardClusterBar />}
    >
      {negocio.isLoading ? (
        <div
          className="board-card flex h-[280px] items-center justify-center"
          role="status"
          aria-label="Carregando carteira"
        >
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--bd-accent-d)' }} />
        </div>
      ) : (
        <BoardBriefingClientes
          regioes={regioes}
          servicos={servicos}
          lacunas={lacunas}
          ticket={ticket}
          ativos={ativos}
          carteira={carteira}
          diasAditivo={diasAditivo}
        />
      )}
    </BoardLayout>
  );
};

export default BoardClientes;
