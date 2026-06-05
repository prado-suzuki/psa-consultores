// Hook de entidade Projeto (tabela `projects`).
// JOIN com `estrutura_clusters(name)` pra hidratar `clusterName` no acesso.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/types';

export type ProjetoInput = Omit<Projeto, 'id' | 'clusterName'>;

const TABLE = 'projects';
const SELECT = '*, estrutura_clusters(name)';

type DbRow = Record<string, unknown>;

function hydrateClusterName(row: DbRow): Projeto {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return { ...(row as unknown as Projeto), clusterName: rel?.name };
}

export function useProjetos(): UseQueryResult<Projeto[]> {
  return useQuery<Projeto[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .not('cluster_id', 'is', null) // ⚠️ MAPA-only: esconde rows do Digital Rotina
        .order('name');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrateClusterName);
    },
  });
}

export function useProjeto(id: string | undefined): UseQueryResult<Projeto | null> {
  return useQuery<Projeto | null>({
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
      return data ? hydrateClusterName(data as DbRow) : null;
    },
  });
}

export function useCreateProjeto(): UseMutationResult<Projeto, Error, ProjetoInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjetoInput) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Projeto;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateProjeto(): UseMutationResult<
  Projeto,
  Error,
  { id: string; patch: Partial<Projeto>; old: Projeto }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      // Não persistir clusterName (campo sintético — vem do JOIN, não tem coluna).
      const dbPatch = { ...patch };
      delete (dbPatch as Record<string, unknown>).clusterName;
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(dbPatch as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Projeto;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteProjeto(): UseMutationResult<void, Error, { id: string; old: Projeto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
