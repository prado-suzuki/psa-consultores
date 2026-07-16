import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ClienteTable = Database['public']['Tables']['cliente'];
type ContribuinteTable = Database['public']['Tables']['contribuinte'];

type ClienteBalancete = Pick<ClienteTable['Row'], 'id' | 'nome'>;
type ContribuinteBalancete = Pick<
  ContribuinteTable['Row'],
  'id' | 'nome_razao_social' | 'cliente_id'
>;

const controleBalancetesQueryKeys = {
  clientes: ['clientes-balancetes'] as const,
  contribuintes: (clienteId: string) => ['contribuintes-balancetes', clienteId] as const,
};

export function useDomainControleBalancetes(clienteId: string) {
  const clientesQuery = useQuery<ClienteBalancete[]>({
    queryKey: controleBalancetesQueryKeys.clientes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      return data;
    },
  });

  const contribuintesQuery = useQuery<ContribuinteBalancete[]>({
    queryKey: controleBalancetesQueryKeys.contribuintes(clienteId),
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cliente_id')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (clienteId) query = query.eq('cliente_id', clienteId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return {
    clientes: clientesQuery.data,
    contribuintes: contribuintesQuery.data,
    clientesLoading: clientesQuery.isLoading,
    contribuintesLoading: contribuintesQuery.isLoading,
    clientesError: clientesQuery.error,
    contribuintesError: contribuintesQuery.error,
  };
}
