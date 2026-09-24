import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import {
  CAPACIDADES_RICAS_BASICAS,
  converterRespostaEnriquecimento,
  type CapacidadesRichText,
  type DestinoEnriquecimento,
  type RespostaEnriquecimentoApi,
} from '@/lib/enriquecimentoTexto';

interface OpcoesEnriquecimento {
  destino?: DestinoEnriquecimento;
  capacidades?: CapacidadesRichText;
}

export function useEnriquecerTexto(perfil: string, opcoes: OpcoesEnriquecimento = {}) {
  const capacidades = opcoes.capacidades ?? CAPACIDADES_RICAS_BASICAS;

  return useMutation({
    mutationKey: ['enriquecer-texto', perfil, opcoes.destino],
    retry: false,
    mutationFn: async (texto: string) => {
      const origem = texto;
      const textoLimpo = texto.trim();
      if (!textoLimpo) throw new Error('Informe um texto para enriquecer.');

      const { data, error } = await supabase.functions.invoke<RespostaEnriquecimentoApi>(
        'enriquecer-texto',
        {
          body: {
            perfil,
            texto: textoLimpo,
            ...(opcoes.destino ? { destino: opcoes.destino } : {}),
          },
        },
      );
      if (error) throw error;
      if (!data) throw new Error('O enriquecimento não devolveu uma resposta.');
      if (data.error) throw new Error(data.error);
      return converterRespostaEnriquecimento(origem, data, capacidades);
    },
  });
}
