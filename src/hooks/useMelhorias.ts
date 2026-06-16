// Hook de Melhoria (tabela `process_improvements`).
// Hidrata JOIN cluster + 4 junções M:N (processos, sistemas, acoes_td)
// inline na query — sem mapper externo.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Melhoria, AcaoTd, ResponsavelHoras } from '@/types';

const TABLE = 'process_improvements';
const SELECT = '*, estrutura_clusters(name), melhoria_processos(processo_id), melhoria_sistemas(sistema_id), melhoria_acoes_td(acao_td), gargalo_melhorias(gargalo_id), melhoria_responsaveis(responsavel_id, papel, horas)';

type DbRow = Record<string, unknown>;
type MelhoriaRespRow = { responsavel_id: string; papel: string; horas: number | null };

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrate(row: DbRow): Melhoria {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  const respRows = (row.melhoria_responsaveis as MelhoriaRespRow[] | null | undefined) ?? [];
  const exec: ResponsavelHoras[] = [];
  const treino: ResponsavelHoras[] = [];
  for (const r of respRows) {
    const ref: ResponsavelHoras = { responsavelId: r.responsavel_id, nome: '', horas: r.horas ?? 0 };
    if (r.papel === 'treinando') treino.push(ref);
    else exec.push(ref);
  }
  return {
    ...(row as unknown as Melhoria),
    clusterName: rel?.name,
    processos: pluck<string>(row.melhoria_processos, 'processo_id'),
    sistemas: pluck<string>(row.melhoria_sistemas, 'sistema_id'),
    acoesTd: pluck<AcaoTd>(row.melhoria_acoes_td, 'acao_td'),
    gargalos: pluck<string>(row.gargalo_melhorias, 'gargalo_id'),
    executadoPor: exec,
    treinamentoPor: treino,
  };
}

function stripSyntheticFields(patch: Partial<Melhoria>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  // Campos derivados de JOINs/junções — não vão pra UPDATE/INSERT do row principal.
  delete out.clusterName;
  delete out.processos;
  delete out.sistemas;
  delete out.executadoPor;
  delete out.treinamentoPor;
  delete out.acoesTd;
  delete out.gargalos;
  return out;
}

export type MelhoriaInput = Omit<Melhoria, 'id' | 'clusterName' | 'processos' | 'sistemas' | 'executadoPor' | 'acoesTd' | 'treinamentoPor'> & {
  // Campos opcionais que a UI envia pra serem persistidos em queries
  // separadas (junções) — não fazem parte do INSERT da row principal.
  sistemas?: string[];
  executadoPor?: Melhoria['executadoPor'];
  treinamentoPor?: Melhoria['treinamentoPor'];
  acoesTd?: Melhoria['acoesTd'];
  gargalos?: string[];
};

/** Sincroniza gargalo_melhorias (N:M) pelo lado da MELHORIA: apaga todos os
 *  vínculos da melhoria e reinsere os selecionados. É a fonte de verdade do
 *  vínculo problema↔solução; o processo da melhoria é DERIVADO daí (via
 *  gargalo_etapas). O vínculo direto melhoria_processos foi aposentado. */
async function syncGargalos(melhoriaId: string, gargaloIds: string[]): Promise<void> {
  const { error: delErr } = await supabase
    .from('gargalo_melhorias' as never)
    .delete()
    .eq('melhoria_id', melhoriaId);
  if (delErr) throw new Error(delErr.message);
  if (gargaloIds.length > 0) {
    const rows = gargaloIds.map((gargalo_id) => ({ gargalo_id, melhoria_id: melhoriaId }));
    const { error: insErr } = await supabase.from('gargalo_melhorias' as never).insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

export function useMelhorias(): UseQueryResult<Melhoria[]> {
  return useQuery<Melhoria[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .not('cluster_id', 'is', null) // ⚠️ MAPA-only: esconde rows do Digital Rotina
        .order('created_at');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useMelhoria(id: string | undefined): UseQueryResult<Melhoria | null> {
  return useQuery<Melhoria | null>({
    queryKey: [TABLE, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? hydrate(data as DbRow) : null;
    },
  });
}

export function useCreateMelhoria(): UseMutationResult<Melhoria, Error, MelhoriaInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MelhoriaInput) => {
      const gargalos = input.gargalos;
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(stripSyntheticFields(input as Partial<Melhoria>) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = data as unknown as Melhoria;
      if (gargalos !== undefined) await syncGargalos(created.id, gargalos);
      const { data: full } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', created.id)
        .maybeSingle();
      return full ? hydrate(full as DbRow) : created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateMelhoria(): UseMutationResult<
  Melhoria,
  Error,
  { id: string; patch: Partial<Melhoria>; old: Melhoria }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const novosGargalos = patch.gargalos;
      const dbPatch = stripSyntheticFields(patch);
      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase
          .from(TABLE as never)
          .update(dbPatch as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }
      if (novosGargalos !== undefined) await syncGargalos(id, novosGargalos);
      const { data, error: selErr } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);
      if (!data) throw new Error('Melhoria não encontrada após update.');
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteMelhoria(): UseMutationResult<void, Error, { id: string; old: Melhoria }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
