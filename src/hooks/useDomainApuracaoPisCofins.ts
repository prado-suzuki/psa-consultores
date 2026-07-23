import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ClienteApuracaoPisCofins = Pick<
  Database['public']['Tables']['cliente']['Row'],
  'id' | 'nome'
>;

type ContribuinteApuracaoPisCofins = Pick<
  Database['public']['Tables']['contribuinte']['Row'],
  'id' | 'nome_razao_social' | 'cpf_cnpj'
>;

const apuracaoPisCofinsQueryKeys = {
  clientes: ['clientes-piscofins'] as const,
  contribuintes: (clienteId: string) => ['contribuintes-piscofins', clienteId] as const,
};

export function useDomainApuracaoPisCofins(clienteId: string) {
  const clientesQuery = useQuery<ClienteApuracaoPisCofins[]>({
    queryKey: apuracaoPisCofinsQueryKeys.clientes,
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      return data ?? [];
    },
  });

  const contribuintesQuery = useQuery<ContribuinteApuracaoPisCofins[]>({
    queryKey: apuracaoPisCofinsQueryKeys.contribuintes(clienteId),
    queryFn: async () => {
      const { data } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      return data ?? [];
    },
    enabled: !!clienteId,
  });

  return { clientesQuery, contribuintesQuery };
}
