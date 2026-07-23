import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

interface ConsultaECDCliente {
  id: string;
  nome: string;
}

interface ConsultaECDContribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string;
}

export function useDomainConsultaECD(selectedCliente: string) {
  const clientesQuery = useQuery<ConsultaECDCliente[]>({
    queryKey: ['clientes-efd-ecd'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      return (data || []) as unknown as ConsultaECDCliente[];
    },
  });

  const contribuintesQuery = useQuery<ConsultaECDContribuinte[]>({
    queryKey: ['contribuintes-efd-ecd', selectedCliente],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj, cliente_id')
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (selectedCliente) {
        query = query.eq('cliente_id', selectedCliente);
      }

      const { data } = await query;
      return (data || []) as unknown as ConsultaECDContribuinte[];
    },
  });

  return { clientesQuery, contribuintesQuery };
}
