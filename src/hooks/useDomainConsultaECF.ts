import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

interface ConsultaECFCliente {
  id: string;
  nome: string;
}

interface ConsultaECFContribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string;
}

export function useDomainConsultaECF(selectedCliente: string) {
  const clientesQuery = useQuery<ConsultaECFCliente[]>({
    queryKey: ['clientes-efd-ecf'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      return (data || []) as unknown as ConsultaECFCliente[];
    },
  });

  const contribuintesQuery = useQuery<ConsultaECFContribuinte[]>({
    queryKey: ['contribuintes-efd-ecf', selectedCliente],
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
      return (data || []) as unknown as ConsultaECFContribuinte[];
    },
  });

  return { clientesQuery, contribuintesQuery };
}
