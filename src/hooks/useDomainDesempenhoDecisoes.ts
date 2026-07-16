import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegistrarDecisaoMetasInput {
  cicloId: string;
  responsavelId: string;
  decisao: 'promover' | 'reajustar' | 'manter';
}

const REGISTRAR_DECISAO_METAS_KEY = ['desempenho-decisoes', 'registrar-decisao-metas'] as const;

export function useRegistrarDecisaoMetas(): UseMutationResult<
  void,
  Error,
  RegistrarDecisaoMetasInput
> {
  return useMutation({
    mutationKey: REGISTRAR_DECISAO_METAS_KEY,
    mutationFn: async ({ cicloId, responsavelId, decisao }) => {
      // Mantém o fluxo best-effort atual: erros do select/update não interrompem a confirmação.
      const { data: metasData } = await supabase
        .from('metas')
        .select('id')
        .eq('ciclo_id', cicloId)
        .eq('responsavel_id', responsavelId)
        .eq('nivel', 'individual');

      for (const meta of metasData ?? []) {
        await supabase.from('metas').update({ recomendacao_decisao: decisao }).eq('id', meta.id);
      }
    },
  });
}
