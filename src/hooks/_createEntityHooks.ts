// Factory thin de hooks CRUD pra uma entidade Supabase. Produz 5 hooks:
// useList, useById, useCreate, useUpdate, useDelete.
//
// Sem mappers — rows do DB são consumidas direto. Tipos casam 1:1 com colunas.
// Pra hidratar junções (M:N) ou JOINs, use `selectClause` PostgREST e faça
// o flattening em hook dedicado em vez de no factory.

import {
  useQuery, useMutation, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EntityHooksConfig {
  /** Nome da tabela Supabase. */
  resource: string;
  /** Coluna usada como ORDER BY default na listagem. */
  defaultOrder?: string;
  /** Cláusula SELECT customizada — default '*'. Use pra incluir JOINs PostgREST. */
  selectClause?: string;
  /**
   * Colunas que devem ser NOT NULL na listagem. Útil pra esconder ruído de
   * tabelas compartilhadas (ex.: `['cluster_id']` em `processes` esconde os
   * 28 processos do Digital Rotina que ficaram com cluster_id NULL).
   * Aplica apenas em `useList()` — `useById()` continua aberto pra navegação direta.
   */
  listNotNull?: string[];
}

export interface EntityHooks<T extends { id: string }, Input = Omit<T, 'id'>> {
  useList: () => UseQueryResult<T[]>;
  useById: (id: string | undefined) => UseQueryResult<T | null>;
  useCreate: () => UseMutationResult<T, Error, Input>;
  useUpdate: () => UseMutationResult<T, Error, { id: string; patch: Partial<T>; old: T }>;
  useDelete: () => UseMutationResult<void, Error, { id: string; old: T }>;
}

export function createEntityHooks<T extends { id: string }, Input = Omit<T, 'id'>>(
  cfg: EntityHooksConfig,
): EntityHooks<T, Input> {
  const { resource, defaultOrder, selectClause = '*', listNotNull } = cfg;

  function useList(): UseQueryResult<T[]> {
    return useQuery<T[]>({
      queryKey: [resource],
      queryFn: async () => {
        let q = supabase.from(resource as never).select(selectClause);
        for (const col of listNotNull ?? []) {
          q = q.not(col, 'is', null);
        }
        if (defaultOrder) q = q.order(defaultOrder);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as T[];
      },
    });
  }

  function useById(id: string | undefined): UseQueryResult<T | null> {
    return useQuery<T | null>({
      queryKey: [resource, id],
      enabled: !!id,
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await supabase
          .from(resource as never)
          .select(selectClause)
          .eq('id', id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return (data ?? null) as unknown as T | null;
      },
    });
  }

  function useCreate(): UseMutationResult<T, Error, Input> {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Input) => {
        const { data, error } = await supabase
          .from(resource as never)
          .insert(input as never)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as unknown as T;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [resource] }); },
    });
  }

  function useUpdate(): UseMutationResult<T, Error, { id: string; patch: Partial<T>; old: T }> {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, patch }) => {
        const { data, error } = await supabase
          .from(resource as never)
          .update(patch as never)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as unknown as T;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [resource] }); },
    });
  }

  function useDelete(): UseMutationResult<void, Error, { id: string; old: T }> {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id }) => {
        const { error } = await supabase.from(resource as never).delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [resource] }); },
    });
  }

  return { useList, useById, useCreate, useUpdate, useDelete };
}
