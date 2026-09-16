import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ambientePorClienteQuery } from '@/hooks/useDomainAmbienteClientes';
import { isDoAmbiente } from '@/lib/ambienteScope';

export interface VolumeCliente {
  /** Quantidade de OS cadastradas -- mesmo sentido de `_osCount` em `useGestaoClientes`. */
  projetos: number;
  /** Soma de `valor_projeto` das OS do cliente. */
  valor: number;
}

/**
 * Quantidade de OS e valor total por cliente -- alimenta o ranking "Top
 * clientes" do mapa do Board (reunião Mariana, 17/08, P8). Mesmo escopo de
 * RLS que a lista de clientes da tela; sem filtro de cluster, igual ao mapa.
 */
export function useOsVolumePorCliente() {
  const queryClient = useQueryClient();

  return useQuery<Map<string, VolumeCliente>>({
    queryKey: ['board-os-volume-por-cliente'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordem_servico')
        .select('id_cliente, valor_projeto');
      if (error) throw error;

      // `ordem_servico` não tem coluna `ambiente`: o recorte vem do cliente, como
      // em `useDomainOsAbertas`. Sem ele o ranking somava as OS dos clientes
      // `[TESTE]` ao volume da carteira real.
      const ambientePorCliente = await queryClient.fetchQuery(ambientePorClienteQuery());

      const mapa = new Map<string, VolumeCliente>();
      for (const row of data ?? []) {
        const id = row.id_cliente as string | null;
        if (!id) continue;
        if (!isDoAmbiente(id, ambientePorCliente)) continue;
        const atual = mapa.get(id) ?? { projetos: 0, valor: 0 };
        atual.projetos += 1;
        atual.valor += row.valor_projeto ?? 0;
        mapa.set(id, atual);
      }
      return mapa;
    },
  });
}
