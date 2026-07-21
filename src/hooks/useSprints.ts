// Hooks de leitura de sprints (tabela `sprints`) para o módulo /equipe.
// Fonte única — nenhuma tela deve chamar supabase.from('sprints') direto.

import {
  useQuery, useMutation, useQueryClient,
  type UseQueryResult, type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
}

export interface SprintInput {
  name: string;
  goal?: string | null;
  start_date: string;
  end_date: string;
  project_id?: string | null;
  status?: string;
  created_by?: string | null;
}

const TABLE = 'sprints';
const SELECT = 'id, name, goal, start_date, end_date, status, project_id';

/** Todas as sprints, mais recentes primeiro. */
export function useSprints(): UseQueryResult<Sprint[]> {
  return useQuery<Sprint[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sprint[];
    },
  });
}

/** Apenas as sprints ativas (podem coexistir várias, uma por projeto). */
export function useActiveSprints(): UseQueryResult<Sprint[]> {
  return useQuery<Sprint[]>({
    queryKey: [TABLE, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sprint[];
    },
  });
}

export function useCreateSprint(): UseMutationResult<Sprint, Error, SprintInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Sprint;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateSprint(): UseMutationResult<Sprint, Error, { id: string; patch: Partial<Sprint> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      await assertCanPerform('sprints', 'update', id);
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(patch as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Sprint;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateSprintStatus(): UseMutationResult<void, Error, { id: string; status: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      await assertCanPerform('sprints', 'update', id);
      const { error } = await supabase
        .from(TABLE as never)
        .update({ status } as never)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteSprint(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await assertCanPerform('sprints', 'delete', id);
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
