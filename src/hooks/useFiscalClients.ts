import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Cliente {
  id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  setor_cliente: string | null;
  telefone: string | null;
  fixo: string | null;
  ativo: boolean | null;
  categoria: string | null;
  created_at: string;
  updated_at: string;
}

/** Lista de clientes ativos */
export function useFiscalClientsList() {
  return useQuery<Cliente[]>({
    queryKey: ['empresa-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Cliente[];
    },
  });
}
