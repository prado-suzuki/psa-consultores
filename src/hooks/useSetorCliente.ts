import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SetorCliente {
  id: string;
  nome: string;
  sigla: string;
  descricao: string | null;
}

/** Lista todos os setores de cliente ordenados por nome */
export function useSetoresCliente() {
  return useQuery<SetorCliente[]>({
    queryKey: ['setores-cliente'],
    queryFn: async () => {
      // as any: tabela 'setor_cliente' pode não estar no schema tipado ainda
      const { data, error } = await (supabase.from('setor_cliente' as any) as any)
        .select('id, nome, sigla, descricao')
        .order('nome');
      if (error) throw error;
      return data as SetorCliente[];
    },
  });
}
