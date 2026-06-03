// Hook piloto — entidade Projeto. Usa mapper PT↔EN porque a tabela `projects`
// é reaproveitada do Digital Rotina (schema em inglês).

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto } from '@/types';
import { projetoFromDb, projetoToDb } from '@/utils/mapa/dbMappers';

export type ProjetoInput = Omit<Projeto, 'id'>;

const TABLE = 'projects';

export function useProjetos(): UseQueryResult<Projeto[]> {
  return useQuery<Projeto[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown[]).map(r => projetoFromDb(r as Record<string, unknown>));
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
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? projetoFromDb(data as Record<string, unknown>) : null;
    },
  });
}

export function useCreateProjeto(): UseMutationResult<Projeto, Error, ProjetoInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjetoInput) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(projetoToDb(input) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return projetoFromDb(data as Record<string, unknown>);
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
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(projetoToDb(patch) as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return projetoFromDb(data as Record<string, unknown>);
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
