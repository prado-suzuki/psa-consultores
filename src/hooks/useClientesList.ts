import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Lista de clientes (id, nome) para seletores — ex.: preview por cliente. */
export interface ClienteOption {
  id: string;
  nome: string;
}

export function useClientesList() {
  return useQuery({
    queryKey: ['clientes-list'],
    queryFn: async (): Promise<ClienteOption[]> => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('excluido', false)
        .order('nome');
      if (error) throw error;
      return (data || []) as ClienteOption[];
    },
  });
}
