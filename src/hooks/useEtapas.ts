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
import type { Etapa, EtapaFicou, DocRef, ResponsavelEtapa } from '@/types';

const TABLE = 'process_stages';
const SELECT_HYDRATED = `
  *,
  etapa_documentos ( documento_id, sentido, volume ),
  etapa_sistemas   ( sistema_id, rateio ),
  etapa_responsaveis ( responsavel_id, papel, horas )
`;

type DbRow = Record<string, unknown> & {
  scenario?: string;
  etapa_documentos?: Array<{ documento_id: string; sentido: string; volume: number | null }> | null;
  etapa_sistemas?: Array<{ sistema_id: string; rateio: number | null }> | null;
  etapa_responsaveis?: Array<{ responsavel_id: string; papel: string; horas: number | null }> | null;
};

function splitDocs(row: DbRow): { docsEntrada: DocRef[]; docsSaida: DocRef[] } {
  const docs = row.etapa_documentos ?? [];
  const docsEntrada: DocRef[] = [];
  const docsSaida: DocRef[] = [];
  for (const d of docs) {
    const ref: DocRef = { documentoId: d.documento_id, nome: '', volume: d.volume ?? 0 };
    if (d.sentido === 'saida' || d.sentido === 'saída') docsSaida.push(ref);
    else docsEntrada.push(ref);
  }
  return { docsEntrada, docsSaida };
}

function hydrateExec(row: DbRow): ResponsavelEtapa[] {
  return (row.etapa_responsaveis ?? []).map((r) => ({ responsavelId: r.responsavel_id, nome: '', horas: r.horas ?? 0 }));
}

function hydrateSistemas(row: DbRow): string[] {
  return (row.etapa_sistemas ?? []).map((s) => s.sistema_id);
}

function hydrate(row: DbRow): Etapa {
  const { docsEntrada, docsSaida } = splitDocs(row);
  const { etapa_documentos: _ed, etapa_sistemas: _es, etapa_responsaveis: _er, ...clean } = row;
  void _ed; void _es; void _er;
  return {
    ...(clean as unknown as Etapa),
    docsEntrada,
    docsSaida,
    executadoPor: hydrateExec(row),
    sistemas: hydrateSistemas(row),
    volumeMensal: 0,
  };
}

// Extrai os campos do cenário TO-BE (espelho lateral) a partir da row TO-BE.
function hydrateFicou(row: DbRow): EtapaFicou {
  const { docsEntrada, docsSaida } = splitDocs(row);
  const r = row as unknown as Etapa;
  return {
    description: r.description ?? null,
    execution: r.execution,
    lead_time_days: r.lead_time_days ?? null,
    volume_per_process: r.volume_per_process ?? null,
    error_rate: r.error_rate ?? null,
    rework_rate: r.rework_rate ?? null,
    error_cost: r.error_cost ?? null,
    error_volume: r.error_volume ?? null,
    executadoPor: hydrateExec(row),
    sistemas: hydrateSistemas(row),
    docsEntrada,
    docsSaida,
  };
}

// Recebe rows de AMBOS scenarios (AS-IS e TO-BE) e cruza por id.
// Retorna só os AS-IS, com `ficou` populado quando há row TO-BE de mesmo id.
function buildEtapasComFicou(rows: DbRow[]): Etapa[] {
  const ficouById = new Map<string, EtapaFicou>();
  for (const r of rows) {
    if (r.scenario === 'TO-BE' && typeof r.id === 'string') ficouById.set(r.id, hydrateFicou(r));
  }
  const asis = rows.filter(r => r.scenario === 'AS-IS').map(hydrate);
  for (const e of asis) {
    const f = ficouById.get(e.id);
    if (f) e.ficou = f;
  }
  return asis;
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
