// Upsert da projeção TO-BE de uma etapa.
//
// O TO-BE é representado por uma row em `process_stages` com o mesmo `id`
// do AS-IS e `scenario = 'TO-BE'` (PK composta). O `stage_as_is_id` aponta
// de volta para o AS-IS para o trigger de CASCADE DELETE funcionar.

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Etapa } from '@/types';
import { etapaToDb } from '@/utils/mapa/dbMappers';

export interface UpsertEtapaToBeInput {
  etapa: Etapa;
  processoId: string;
}

export function useUpsertEtapaToBe(): UseMutationResult<void, Error, UpsertEtapaToBeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, processoId }: UpsertEtapaToBeInput) => {
      const payload = etapaToDb(
        { ...etapa, processoId },
        { scenario: 'TO-BE', stageAsIsId: etapa.id },
      );
      const { error } = await supabase
        .from('process_stages' as never)
        .upsert(payload as never, { onConflict: 'id,scenario' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['process_stages'] }); },
  });
}
