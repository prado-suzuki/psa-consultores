import { AlertCircle, Loader2 } from 'lucide-react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardMapaClientes } from '@/components/board/BoardMapaClientes';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDomainClientesPorRegiao } from '@/hooks/useDomainClientesPorRegiao';

/**
 * Clientes — módulo Gerencial (Board).
 *
 * Duas partes: o mapa de calor por estado e a lista de clientes.
 *
 * A LISTA reaproveita `GestaoClientesContent`, o MESMO componente do Tax e da
 * OSG, com `area="board"`. Sem cluster de escopo: `useClusterIdByPageCategory`
 * procura em `estrutura_areas` uma linha cujo `page_categories` contenha
 * 'board' — nenhuma migration jamais gravou 'board' lá (só 'tax' e 'osg'),
 * então o hook devolve `null`, `useClientesFiltrados` recebe `scopeClusterId`
 * undefined e NÃO aplica filtro de cluster. O recorte que sobra é o da RLS.
 *
 * Nada foi alterado em `GestaoClientes.tsx`: o único outro comportamento que
 * depende de `area` é `includeUnmapped` (`area === 'tax'`), e ele só é lido
 * DEPOIS do early-return de `scopeClusterId` — com `area="board"` é
 * irrelevante. Tax, OSG e Dev seguem idênticos.
 */
const BoardClientes = () => {
  const { isAdmin } = useAuth();
  const { ambiente } = useDashboardAmbiente();
  const { data: clientes, isLoading, error } = useDomainClientesPorRegiao(ambiente);

  return (
    <BoardLayout title="Clientes" subtitle="Carteira da empresa e distribuição geográfica">
      <div className="space-y-4">
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

        <GestaoClientesContent area="board" />
      </div>
    </BoardLayout>
  );
};

export default BoardClientes;
