// Upsert da projeção TO-BE de uma etapa.
//
// O TO-BE é representado por uma row em `process_stages` com o mesmo `id`
// do AS-IS e `scenario = 'TO-BE'` (PK composta). O `stage_as_is_id` aponta
// de volta para o AS-IS para o trigger de CASCADE DELETE funcionar.

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncVinculosEtapa } from '@/hooks/etapaVinculosSync';
import type { Etapa } from '@/types';

export interface UpsertEtapaToBeInput {
  etapa: Etapa;
  process_id: string;
}

export function useUpsertEtapaToBe(): UseMutationResult<void, Error, UpsertEtapaToBeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, process_id }: UpsertEtapaToBeInput) => {
      // Payload é a row da etapa direta, sem campos sintéticos da UI,
      // + scenario/stage_as_is_id.
      const payload: Record<string, unknown> = { ...(etapa as unknown as Record<string, unknown>) };
      // Strip campos não-coluna
      delete payload.docsEntrada;
      delete payload.docsSaida;
      delete payload.executadoPor;
      delete payload.sistemas;
      delete payload.gargalos;
      delete payload.volumeMensal;
      delete payload.ficou;
      payload.process_id = process_id;
      payload.scenario = 'TO-BE';
      payload.stage_as_is_id = etapa.id;

      const { error } = await supabase
        .from('process_stages' as never)
        .upsert(payload as never, { onConflict: 'id,scenario' });
      if (error) throw new Error(error.message);

      // Vínculos do cenário TO-BE (gargalos ficam só no AS-IS).
      await syncVinculosEtapa(etapa.id, 'TO-BE', {
        docsEntrada: etapa.docsEntrada,
        docsSaida: etapa.docsSaida,
        executadoPor: etapa.executadoPor,
        sistemas: etapa.sistemas,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['process_stages'] }); },
  });
}
