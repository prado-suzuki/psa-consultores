import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type OsgTipoExploracao = Database['public']['Enums']['osg_tipo_exploracao'];

/**
 * A linha do cadastro mais os três nomes que vêm por join. O corpo sai do tipo
 * gerado: coluna nova (ou renomeada) na migration aparece aqui sozinha, em vez
 * de ficar divergindo de uma cópia escrita à mão.
 */
export type ExploracaoRuralRow = Database['public']['Tables']['exploracao_rural']['Row'] & {
  explorador: { denominacao: string | null } | null;
  outorgante: { denominacao: string | null } | null;
  bem: { denominacao: string | null } | null;
};

export function useExploracaoRural(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['exploracao_rural', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<ExploracaoRuralRow[]> => {
      const { data, error } = await supabase
        .from('exploracao_rural')
        .select(
          '*, explorador:pessoa!explorador_pessoa_id(denominacao), outorgante:pessoa!outorgante_pessoa_id(denominacao), bem:bem!bem_id(denominacao)',
        )
        .eq('cliente_id', clienteId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExploracaoRuralRow[];
    },
  });
}
