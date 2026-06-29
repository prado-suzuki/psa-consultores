import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

/** Lista de clientes (id, nome) para seletores — ex.: preview por cliente. */
export interface ClienteOption {
  id: string;
  nome: string;
}

export function useClientesList() {
  return useQuery({
    // chaveado por ambiente: prod e dev têm clientes distintos.
    queryKey: ['clientes-list', currentAmbiente],
    queryFn: async (): Promise<ClienteOption[]> => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente) // só clientes do ambiente atual (prod NÃO mostra dev)
        .order('nome');
      if (error) throw error;
      return (data || []) as ClienteOption[];
    },
  });
}
