import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery<Map<string, VolumeCliente>>({
    queryKey: ['board-os-volume-por-cliente'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordem_servico')
        .select('id_cliente, valor_projeto')
        .eq('excluido', false);
      if (error) throw error;

      const mapa = new Map<string, VolumeCliente>();
      for (const row of data ?? []) {
        const id = row.id_cliente as string | null;
        if (!id) continue;
        const atual = mapa.get(id) ?? { projetos: 0, valor: 0 };
        atual.projetos += 1;
        atual.valor += row.valor_projeto ?? 0;
        mapa.set(id, atual);
      }
      return mapa;
    },
  });
}
