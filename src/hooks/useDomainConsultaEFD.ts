import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

interface ClienteConsultaEFD {
  id: string;
  nome: string;
}

interface ContribuinteConsultaEFD {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string;
}

export function useDomainConsultaEFD(selectedCliente: string) {
  const clientesQuery = useQuery({
    queryKey: ['clientes-efd'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      return (data || []) as unknown as ClienteConsultaEFD[];
    },
  });

  const contribuintesQuery = useQuery({
    queryKey: ['contribuintes-efd', selectedCliente],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj, cliente_id')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (selectedCliente) {
        query = query.eq('cliente_id', selectedCliente);
      }

      const { data } = await query;
      return (data || []) as unknown as ContribuinteConsultaEFD[];
    },
  });

  return {
    clientes: clientesQuery.data,
    loadingClientes: clientesQuery.isLoading,
    contribuintes: contribuintesQuery.data,
    loadingContribuintes: contribuintesQuery.isLoading,
  };
}
