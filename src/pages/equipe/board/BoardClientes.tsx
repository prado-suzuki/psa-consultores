import { useMemo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardMapaClientes } from '@/components/board/BoardMapaClientes';
import { BoardClientesLista } from '@/components/board/BoardClientesLista';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDomainClientesPorRegiao } from '@/hooks/useDomainClientesPorRegiao';
import { agregarClientesPorRegiao } from '@/lib/clientesPorRegiao';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardClientes } from '@/lib/agenteContextoClientes';

/**
 * Clientes — módulo Gerencial (Board).
 *
 * Duas partes: o mapa de calor por estado e a lista de clientes.
 *
 * A LISTA (reunião Mariana, 17/08, P8) é `BoardClientesLista`, enxuta e
 * somente leitura -- nome, status e um cartão de detalhe ao clicar. Até
 * 20/08 esta tela reaproveitava `GestaoClientesContent` (o módulo de
 * cadastro completo, com criar/editar/excluir, compartilhado com a Gerencial
 * da Tax e da OSG). Deixou de ser montada aqui porque não é estratégica para
 * quem olha o Board -- o componente de cadastro continua intacto e do jeito
 * que sempre foi para Tax/OSG, em `GestaoClientes.tsx`.
 */
const BoardClientes = () => {
  const { isAdmin } = useAuth();
  const { ambiente } = useDashboardAmbiente();
  const { data: clientes, isLoading, error } = useDomainClientesPorRegiao(ambiente);

  // O agente le a MESMA agregacao que pinta o mapa. Recalcular aqui daria dois
  // numeros para a mesma pergunta -- o do mapa e o do chat.
  const agregacao = useMemo(() => agregarClientesPorRegiao(clientes ?? []), [clientes]);
  const contextoAgente = useMemo(() => contextoBoardClientes({
    agregacao,
    escopoTotal: isAdmin,
    falhas: error ? ['distribuição de clientes'] : [],
  }), [agregacao, isAdmin, error]);
  useRegistrarContextoAgente('board.clientes', contextoAgente, isLoading);

  return (
    <BoardLayout title="Clientes" subtitle="Carteira e concentração geográfica">
      <div className="space-y-4">
        <div className="pg-head">
          <div className="pg-title">Clientes</div>
          <div className="pg-sub">Onde está a carteira</div>
        </div>
        {isLoading ? (
          <div
            className="board-card flex h-[320px] items-center justify-center"
            role="status"
            aria-label="Carregando mapa de clientes"
          >
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--board-indigo)' }} />
          </div>
        ) : error ? (
          <div className="board-card flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--board-red)' }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--board-t1)' }}>
                Não foi possível carregar a distribuição de clientes
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--board-t3)' }}>
                {error instanceof Error ? error.message : 'Erro desconhecido.'} O mapa não é exibido
                em vez de mostrar um Brasil vazio, que pareceria "nenhum cliente".
              </p>
            </div>
          </div>
        ) : (
          <BoardMapaClientes clientes={clientes ?? []} escopoTotal={isAdmin} />
        )}

        <BoardClientesLista />
      </div>
    </BoardLayout>
  );
};

export default BoardClientes;
