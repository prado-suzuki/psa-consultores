import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteConsultaEFDICMS {
  id: string;
  nome: string;
}

export interface ContribuinteConsultaEFDICMS {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string;
}

const consultaEFDICMSQueryKeys = {
  clientes: ['clientes-efd-icms'] as const,
  contribuintes: (clienteId: string) => ['contribuintes-efd-icms', clienteId] as const,
};

export function useDomainConsultaEFDICMS(clienteId: string) {
  const clientesQuery = useQuery<ClienteConsultaEFDICMS[]>({
    queryKey: consultaEFDICMSQueryKeys.clientes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      return data ?? [];
    },
  });

  const contribuintesQuery = useQuery<ContribuinteConsultaEFDICMS[]>({
    queryKey: consultaEFDICMSQueryKeys.contribuintes(clienteId),
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj, cliente_id')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    clientes: clientesQuery.data,
    loadingClientes: clientesQuery.isLoading,
    contribuintes: contribuintesQuery.data,
    loadingContribuintes: contribuintesQuery.isLoading,
  };
}
