import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

const CLIENTES_PERMITIDOS_NOMES = ['Barralcool', 'COPRODIA'];

interface ClienteRecord {
  id: string;
  nome: string;
}

interface ContribuinteRecord {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
}

export function useDomainIcmsSaidas(selectedCliente: string) {
  const clientesQuery = useQuery<ClienteRecord[]>({
    queryKey: ['icms-saidas-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .or(CLIENTES_PERMITIDOS_NOMES.map((nome) => `nome.ilike.${nome}`).join(','))
        .order('nome');

      if (error) throw error;
      return data ?? [];
    },
  });

  const contribuintesQuery = useQuery<ContribuinteRecord[]>({
    queryKey: ['icms-saidas-contribuintes', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];

      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedCliente)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedCliente,
  });

  return { clientesQuery, contribuintesQuery };
}
