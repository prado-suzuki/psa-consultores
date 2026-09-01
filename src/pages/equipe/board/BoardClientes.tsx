import { useMemo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardClusterBar } from '@/components/equipe/board/BoardClusterBar';
import { BoardBriefingClientes } from '@/components/board/BoardBriefingClientes';
import { BoardMapaClientes } from '@/components/board/BoardMapaClientes';
import { BoardClientesLista } from '@/components/board/BoardClientesLista';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useDomainClientesPorRegiao } from '@/hooks/useDomainClientesPorRegiao';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { agregarClientesPorRegiao } from '@/lib/clientesPorRegiao';
import { concentracaoCarteira } from '@/lib/boardEstrategico';
import { ticketMedioAno } from '@/lib/boardDiretoria';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardClientes } from '@/lib/agenteContextoClientes';

/**
 * Clientes — de quem a carteira depende.
 *
 * Concentração do contratado na frente (mesma fonte do Estratégico).
 * Mapa e lista são recorte, não o cadastro (reuniões 17/08 e 28/08).
 */
const BoardClientes = () => {
  const { isAdmin } = useAuth();
  const { ambiente } = useDashboardAmbiente();
  const { cluster } = useBoardCluster();
  const negocio = useDashboardClientesOs(ambiente);
  const { data: clientesRegiao, isLoading: mapaLoading, error: mapaError } =
    useDomainClientesPorRegiao(ambiente);

  const osRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.osRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const clienteRows = useMemo(
    () => filtrarLegado(filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster)),
    [negocio.data, cluster],
  );
  const hoje = negocio.hoje;
  const concentracao = useMemo(() => concentracaoCarteira(osRows), [osRows]);
  const ticket = useMemo(() => ticketMedioAno(osRows, hoje), [osRows, hoje]);
  const ativos = useMemo(() => clienteRows.filter((c) => c.ativo).length, [clienteRows]);

  const clientesMapa = useMemo(() => {
    const ids = new Set(clienteRows.map((c) => c.cliente_id));
    return (clientesRegiao ?? []).filter((c) => ids.has(c.id));
  }, [clientesRegiao, clienteRows]);

  const agregacao = useMemo(() => agregarClientesPorRegiao(clientesMapa), [clientesMapa]);
  const carregando = negocio.isLoading || mapaLoading;

  const contextoAgente = useMemo(() => contextoBoardClientes({
    agregacao,
    escopoTotal: isAdmin && !cluster,
    concentracao,
    ticket,
    falhas: [
      ...(negocio.error ? ['contratos e clientes'] : []),
      ...(mapaError ? ['distribuição de clientes'] : []),
    ],
  }), [agregacao, isAdmin, cluster, concentracao, ticket, negocio.error, mapaError]);
  useRegistrarContextoAgente('board.clientes', contextoAgente, carregando);

  return (
    <BoardLayout
      title="Clientes"
      subtitle="Quem carrega o contratado"
      headerActions={<BoardClusterBar />}
    >
      {carregando ? (
        <div
          className="board-card flex h-[280px] items-center justify-center"
          role="status"
          aria-label="Carregando carteira"
        >
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--bd-accent-d)' }} />
        </div>
      ) : (
        <BoardBriefingClientes
          concentracao={concentracao}
          ticket={ticket}
          ativos={ativos}
          mapa={mapaError ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--bd-risk)' }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--bd-ink)' }}>
                  Não foi possível carregar a distribuição
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--bd-ink3)' }}>
                  {mapaError instanceof Error ? mapaError.message : 'Erro desconhecido.'}
                  {' '}O mapa não é exibido em vez de um Brasil vazio.
                </p>
              </div>
            </div>
          ) : (
            <BoardMapaClientes clientes={clientesMapa} escopoTotal={isAdmin && !cluster} />
          )}
          lista={<BoardClientesLista />}
        />
      )}
    </BoardLayout>
  );
};

export default BoardClientes;
