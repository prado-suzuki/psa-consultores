// Hook de Gargalo (tabela `gargalos` PT-native).
// Hidrata JOIN cluster + junção `gargalo_processos` inline.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Gargalo } from '@/types';

const TABLE = 'gargalos';
const SELECT = '*, estrutura_clusters(name), gargalo_processos(processo_id)';
// Fallback quando a FK gargalos.cluster_id → estrutura_clusters não está
// registrada no schema cache do PostgREST (acontece se a migration
// 20260603150000 não foi aplicada). Sem a FK, o embed dá erro e a página
// fica vazia — o fallback degrada gracefully omitindo o nome do cluster.
const SELECT_FALLBACK = '*, gargalo_processos(processo_id)';

type DbRow = Record<string, unknown>;

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrate(row: DbRow): Gargalo {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return {
    ...(row as unknown as Gargalo),
    clusterName: rel?.name,
    processos: pluck<string>(row.gargalo_processos, 'processo_id'),
  };
}

function stripSyntheticFields(patch: Partial<Gargalo>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.clusterName;
  delete out.processos;
  delete out.responsaveisHoras;
  return out;
}

export type GargaloInput = Omit<Gargalo, 'id' | 'clusterName' | 'processos' | 'responsaveisHoras'> & {
  processos?: string[];
  responsaveisHoras?: Gargalo['responsaveisHoras'];
};

export function useGargalos(): UseQueryResult<Gargalo[]> {
  return useQuery<Gargalo[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      // 1ª tentativa com JOIN cluster — se a FK não estiver no schema cache
      // do PostgREST, a query falha com "no relationship found". Aí cai no
      // fallback sem o JOIN.
      let result = await supabase.from(TABLE as never).select(SELECT).order('nome');
      if (result.error && /relationship|not find/i.test(result.error.message)) {
        result = await supabase.from(TABLE as never).select(SELECT_FALLBACK).order('nome');
      }
      if (result.error) throw new Error(result.error.message);
      return ((result.data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useGargalo(id: string | undefined): UseQueryResult<Gargalo | null> {
  return useQuery<Gargalo | null>({
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

export function useCreateGargalo(): UseMutationResult<Gargalo, Error, GargaloInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GargaloInput) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(stripSyntheticFields(input as Partial<Gargalo>) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Gargalo;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateGargalo(): UseMutationResult<
  Gargalo,
  Error,
  { id: string; patch: Partial<Gargalo>; old: Gargalo }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(stripSyntheticFields(patch) as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Gargalo;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteGargalo(): UseMutationResult<void, Error, { id: string; old: Gargalo }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
