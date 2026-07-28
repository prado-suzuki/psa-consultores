import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SinteseExecutiva {
  sintese: string;
  bullets: string[];
}

/**
 * Síntese executiva gerada pela edge function `gerar-sintese-executiva`.
 *
 * Vive num hook para o componente não conhecer o Supabase (regra nº1 do
 * AGENTS.md) e para o erro subir de verdade — a tela precisa saber que a IA
 * falhou, em vez de exibir um texto local como se fosse análise da IA.
 */
export function useSinteseExecutiva() {
  return useMutation<SinteseExecutiva, Error, void>({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gerar-sintese-executiva');
      if (error) throw error;
      const parsed = data as Partial<SinteseExecutiva> | null;
      if (!parsed?.sintese) throw new Error('Resposta vazia da sintese executiva');
      return { sintese: parsed.sintese, bullets: parsed.bullets ?? [] };
    },
  });
}
