// Escrita das etapas TO-BE como LINHAS PRÓPRIAS (id independente, sem par no
// AS-IS) — o que o "Como ficou" editável do MapearProcessoPage precisa no modelo
// por-cenário. Difere do useUpsertEtapaToBe (modelo pareado legado, cluster
// fiscal), que força `stage_as_is_id = id do AS-IS` e cruza por id em `.ficou`.
//
// Aqui a etapa TO-BE tem id próprio e `stage_as_is_id = NULL` (coluna nullable):
//  - create: insere sem id (o banco gera o uuid), scenario='TO-BE';
//  - update: por (id, scenario='TO-BE'), NÃO toca stage_as_is_id (preserva);
//  - delete: limpa os vínculos TO-BE e apaga a row (o AS-IS fica intocado).
// Todos sincronizam as junções via syncVinculosEtapa (gargalos ficam só no AS-IS).

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncVinculosEtapa } from '@/hooks/etapaVinculosSync';
import type { Etapa } from '@/types';

const TABLE = 'process_stages';

/** Row da etapa sem os campos sintéticos da UI (mesma limpeza do AS-IS). */
function toRow(etapa: Partial<Etapa>): Record<string, unknown> {
  const out = { ...(etapa as Record<string, unknown>) };
  delete out.docsEntrada;
  delete out.docsSaida;
  delete out.executadoPor;
  delete out.sistemas;
  delete out.gargalos;
  delete out.volumeMensal;
  delete out.ficou;
  return out;
}

/** Vínculos do cenário TO-BE (gargalos só no AS-IS). */
function vinculos(e: Etapa) {
  return {
    docsEntrada: e.docsEntrada,
    docsSaida: e.docsSaida,
    executadoPor: e.executadoPor,
    sistemas: e.sistemas,
  };
}

export interface CreateEtapaToBeInput { etapa: Etapa; process_id: string; }

/** Insere uma etapa TO-BE nova (linha própria, sem par no AS-IS). */
export function useCreateEtapaToBe(): UseMutationResult<string, Error, CreateEtapaToBeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, process_id }: CreateEtapaToBeInput) => {
      const row = toRow(etapa);
      delete row.id;              // id provisório da UI — o banco gera o uuid
      delete row.stage_as_is_id;  // linha própria: sem par no AS-IS (default NULL)
      delete row.created_at;
      delete row.updated_at;
      row.scenario = 'TO-BE';
      row.process_id = process_id;

      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(row as never)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const newId = (data as unknown as { id: string }).id;

      await syncVinculosEtapa(newId, 'TO-BE', vinculos(etapa));
      return newId;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export interface UpdateEtapaToBeInput { etapa: Etapa; }

/** Atualiza uma etapa TO-BE existente pelo id próprio (preserva stage_as_is_id). */
export function useUpdateEtapaToBe(): UseMutationResult<void, Error, UpdateEtapaToBeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa }: UpdateEtapaToBeInput) => {
      const row = toRow(etapa);
      delete row.id;             // não reescreve a PK
      delete row.scenario;       // idem
      delete row.stage_as_is_id; // preserva o vínculo existente (não força)
      delete row.process_id;     // não muda de processo por aqui
      delete row.created_at;
      delete row.updated_at;

      const { error } = await supabase
        .from(TABLE as never)
        .update(row as never)
        .eq('id', etapa.id)
        .eq('scenario', 'TO-BE');
      if (error) throw new Error(error.message);

      await syncVinculosEtapa(etapa.id, 'TO-BE', vinculos(etapa));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export interface DeleteEtapaToBeInput { id: string; }

/** Apaga uma etapa TO-BE (linha própria) e seus vínculos. O AS-IS fica intocado. */
export function useDeleteEtapaToBe(): UseMutationResult<void, Error, DeleteEtapaToBeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteEtapaToBeInput) => {
      // Limpa as junções TO-BE (diff-based com arrays vazios) antes de apagar a row.
      await syncVinculosEtapa(id, 'TO-BE', {
        docsEntrada: [], docsSaida: [], executadoPor: [], sistemas: [], gargalos: [],
      });
      const { error } = await supabase
        .from(TABLE as never)
        .delete()
        .eq('id', id)
        .eq('scenario', 'TO-BE');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
