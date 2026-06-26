// Hook de Etapa (tabela `process_stages`).
// Carrega TANTO AS-IS quanto TO-BE em uma única query e cruza por `id`:
// a row AS-IS é retornada como Etapa principal e a TO-BE (mesmo `id`,
// scenario='TO-BE') vai para `etapa.ficou`. Sem cruzamento, o Dashboard ROI
// e o SetorEvolução ficam sem cenário "Como Ficou" e o ROI ao vivo zera.
//
// Hidrata as junções inline na query: etapa_documentos (split por sentido),
// etapa_responsaveis (com papel/horas) e etapa_sistemas. Já normaliza os
// nomes do schema banco (sentido='entrada'/'saida', rateio, etc.) para o
// formato esperado pelos componentes (docsEntrada/docsSaida/executadoPor).

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncVinculosEtapa } from '@/hooks/etapaVinculosSync';
import type { Etapa } from '@/types';
import { buildEtapasComFicou, hydrateEtapa as hydrate, type EtapaDbRow as DbRow } from '@/utils/etapaHydrate';

const TABLE = 'process_stages';
const SELECT_HYDRATED = `
  *,
  etapa_documentos ( documento_id, sentido, volume ),
  etapa_sistemas   ( sistema_id, rateio ),
  etapa_responsaveis ( responsavel_id, papel, horas ),
  gargalo_etapas ( gargalo_id )
`;

function stripSyntheticFields(patch: Partial<Etapa>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.docsEntrada;
  delete out.docsSaida;
  delete out.executadoPor;
  delete out.sistemas;
  delete out.gargalos;
  delete out.volumeMensal;
  delete out.ficou;
  return out;
}

export type EtapaInput = Omit<Etapa, 'id' | 'docsEntrada' | 'docsSaida' | 'executadoPor' | 'sistemas' | 'gargalos' | 'volumeMensal' | 'ficou'> & {
  id?: string;
  docsEntrada?: Etapa['docsEntrada'];
  docsSaida?: Etapa['docsSaida'];
  executadoPor?: Etapa['executadoPor'];
  sistemas?: Etapa['sistemas'];
  gargalos?: Etapa['gargalos'];
  volumeMensal?: Etapa['volumeMensal'];
  ficou?: Etapa['ficou'];
};

export function useEtapas(): UseQueryResult<Etapa[]> {
  return useQuery<Etapa[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      // Carrega AS-IS e TO-BE no mesmo round-trip e cruza por id.
      // A row TO-BE (mesmo id, scenario='TO-BE') vira `etapa.ficou`.
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT_HYDRATED)
        .in('scenario', ['AS-IS', 'TO-BE'])
        .order('stage_order');
      if (error) throw new Error(error.message);
      return buildEtapasComFicou((data ?? []) as unknown as DbRow[]);
    },
  });
}

export function useEtapa(id: string | undefined): UseQueryResult<Etapa | null> {
  return useQuery<Etapa | null>({
    queryKey: [TABLE, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT_HYDRATED)
        .eq('id', id)
        .in('scenario', ['AS-IS', 'TO-BE']);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as DbRow[];
      const built = buildEtapasComFicou(rows);
      return built[0] ?? null;
    },
  });
}

export function useCreateEtapa(): UseMutationResult<Etapa, Error, EtapaInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EtapaInput) => {
      const payload = stripSyntheticFields(input as Partial<Etapa>);
      payload.scenario = 'AS-IS';
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = hydrate(data as DbRow);
      await syncVinculosEtapa(created.id, 'AS-IS', input);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
      // gargalo_etapas alimenta useGargalos (cascata) — invalida também.
      qc.invalidateQueries({ queryKey: ['gargalos'] });
    },
  });
}

export function useUpdateEtapa(): UseMutationResult<
  Etapa,
  Error,
  { id: string; patch: Partial<Etapa>; old: Etapa }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(stripSyntheticFields(patch) as never)
        .eq('id', id)
        .eq('scenario', 'AS-IS')
        .select()
        .single();
      if (error) throw new Error(error.message);
      await syncVinculosEtapa(id, 'AS-IS', patch);
      return hydrate(data as DbRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
      // gargalo_etapas alimenta useGargalos (cascata) — invalida também.
      qc.invalidateQueries({ queryKey: ['gargalos'] });
    },
  });
}

export function useDeleteEtapa(): UseMutationResult<void, Error, { id: string; old: Etapa }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from(TABLE as never)
        .delete()
        .eq('id', id)
        .eq('scenario', 'AS-IS');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

// Upsert da projeção TO-BE — vive em arquivo dedicado porque usa um
// `onConflict` composto (id, scenario) que o factory genérico não cobre.
export { useUpsertEtapaToBe } from './useEtapaToBe';
export type { UpsertEtapaToBeInput } from './useEtapaToBe';
