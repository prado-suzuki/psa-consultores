import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Lista de clientes (id, nome) para seletores — ex.: preview por cliente. */
export interface ClienteOption {
  id: string;
  nome: string;
}

/**
 * Sempre lista clientes de PROD. Os relatórios do Looker usam dados de PROD
 * (psa-digital-prod), e os ids de cliente diferem entre dev/prod — então mesmo
 * o app rodando no preview (ambiente=dev), o filtro precisa de id PROD pra casar
 * com a view. Listar do ambiente do app injetava id de dev → fail-closed (zerava).
 */
export function useClientesList() {
  return useQuery({
    queryKey: ['clientes-list', 'prod'],
    queryFn: async (): Promise<ClienteOption[]> => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', 'prod')
        .order('nome');
      if (error) throw error;
      return (data || []) as ClienteOption[];
    },
  });
}
