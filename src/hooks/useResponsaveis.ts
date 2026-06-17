// Hook de Responsavel (tabela `job_roles`) com JOIN cluster pra `clusterName`.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Responsavel } from '@/types';

const TABLE = 'job_roles';
const SELECT = '*, estrutura_clusters(name)';

type DbRow = Record<string, unknown>;

function hydrate(row: DbRow): Responsavel {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return { ...(row as unknown as Responsavel), clusterName: rel?.name };
}

function stripSyntheticFields(patch: Partial<Responsavel>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.clusterName;
  return out;
}

export type ResponsavelInput = Omit<Responsavel, 'id' | 'clusterName'>;

export function useResponsaveis(): UseQueryResult<Responsavel[]> {
  return useQuery<Responsavel[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .order('name');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useResponsavel(id: string | undefined): UseQueryResult<Responsavel | null> {
  return useQuery<Responsavel | null>({
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

export function useCreateResponsavel(): UseMutationResult<Responsavel, Error, ResponsavelInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResponsavelInput) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Responsavel;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateResponsavel(): UseMutationResult<
  Responsavel,
  Error,
  { id: string; patch: Partial<Responsavel>; old: Responsavel }
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
      return data as unknown as Responsavel;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteResponsavel(): UseMutationResult<void, Error, { id: string; old: Responsavel }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
