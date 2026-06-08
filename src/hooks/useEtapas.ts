// Hook de Etapa (tabela `process_stages`, cenário AS-IS).
// Hidrata as junções inline na query: etapa_documentos (split por sentido),
// etapa_responsaveis (com papel/horas) e etapa_sistemas. Já normaliza os
// nomes do schema banco (sentido='entrada'/'saida', rateio, etc.) para o
// formato esperado pelos componentes (docsEntrada/docsSaida/executadoPor).

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Etapa, DocRef, ResponsavelEtapa } from '@/types';

const TABLE = 'process_stages';
const SELECT_HYDRATED = `
  *,
  etapa_documentos ( documento_id, sentido, volume ),
  etapa_sistemas   ( sistema_id, rateio ),
  etapa_responsaveis ( responsavel_id, papel, horas )
`;

type DbRow = Record<string, unknown> & {
  etapa_documentos?: Array<{ documento_id: string; sentido: string; volume: number | null }> | null;
  etapa_sistemas?: Array<{ sistema_id: string; rateio: number | null }> | null;
  etapa_responsaveis?: Array<{ responsavel_id: string; papel: string; horas: number | null }> | null;
};

function hydrate(row: DbRow): Etapa {
  const docs = row.etapa_documentos ?? [];
  const docsEntrada: DocRef[] = [];
  const docsSaida: DocRef[] = [];
  for (const d of docs) {
    const ref: DocRef = {
      documentoId: d.documento_id,
      nome: '',
      volume: d.volume ?? 0,
    };
    if (d.sentido === 'saida' || d.sentido === 'saída') docsSaida.push(ref);
    else docsEntrada.push(ref);
  }
  const sistemas = (row.etapa_sistemas ?? []).map((s) => s.sistema_id);
  const executadoPor: ResponsavelEtapa[] = (row.etapa_responsaveis ?? []).map((r) => ({
    responsavelId: r.responsavel_id,
    nome: '',
    horas: r.horas ?? 0,
  }));

  // Remove os campos crus do banco para não vazarem como propriedades extras
  const { etapa_documentos: _ed, etapa_sistemas: _es, etapa_responsaveis: _er, ...clean } = row;
  void _ed; void _es; void _er;

  return {
    ...(clean as unknown as Etapa),
    docsEntrada,
    docsSaida,
    executadoPor,
    sistemas,
    volumeMensal: 0,
  };
}

function stripSyntheticFields(patch: Partial<Etapa>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.docsEntrada;
  delete out.docsSaida;
  delete out.executadoPor;
  delete out.sistemas;
  delete out.volumeMensal;
  delete out.ficou;
  return out;
}

export type EtapaInput = Omit<Etapa, 'id' | 'docsEntrada' | 'docsSaida' | 'executadoPor' | 'sistemas' | 'volumeMensal' | 'ficou'> & {
  id?: string;
  docsEntrada?: Etapa['docsEntrada'];
  docsSaida?: Etapa['docsSaida'];
  executadoPor?: Etapa['executadoPor'];
  sistemas?: Etapa['sistemas'];
  volumeMensal?: Etapa['volumeMensal'];
  ficou?: Etapa['ficou'];
};

export function useEtapas(): UseQueryResult<Etapa[]> {
  return useQuery<Etapa[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT_HYDRATED)
        .eq('scenario', 'AS-IS')
        .order('stage_order');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
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
        .eq('scenario', 'AS-IS')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? hydrate(data as DbRow) : null;
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
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
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
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
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
