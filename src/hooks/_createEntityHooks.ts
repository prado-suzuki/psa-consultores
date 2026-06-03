// Factory: produz os 5 hooks padrão (list, byId, create, update, delete) para
// uma entidade. Cada chamada à fábrica gera APIs equivalentes ao template
// canônico documentado em `useProjetos.ts`.
//
// Suporta mappers opcionais (fromDb/toDb) — usados pelos hooks de tabelas
// reaproveitadas com schema EN snake_case (processes, projects, process_stages,
// etc.) para traduzir entre o nome das colunas EN e os types camelCase em PT
// do MAPA. Hooks de tabelas nativas do MAPA (documentos_processo, etc.) não
// precisam — chave do DB e do type são iguais.

import {
  useQuery, useMutation, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DbRow = Record<string, unknown>;

export interface EntityHooksConfig<T extends { id: string }> {
  /** Nome da tabela Supabase. */
  resource: string;
  /** Coluna usada como ORDER BY default na listagem (no schema do DB). */
  defaultOrder?: string;
  /** Mapper opcional: row do DB → tipo T. Sem ele, usa cast bruto. */
  fromDb?: (row: DbRow) => T;
  /** Mapper opcional: input T (parcial) → linha do DB para insert/update. */
  toDb?: (input: Partial<T>) => DbRow;
}

export interface EntityHooks<T extends { id: string }, Input = Omit<T, 'id'>> {
  useList: () => UseQueryResult<T[]>;
  useById: (id: string | undefined) => UseQueryResult<T | null>;
  useCreate: () => UseMutationResult<T, Error, Input>;
  useUpdate: () => UseMutationResult<T, Error, { id: string; patch: Partial<T>; old: T }>;
  useDelete: () => UseMutationResult<void, Error, { id: string; old: T }>;
}

export function createEntityHooks<T extends { id: string }, Input = Omit<T, 'id'>>(
  cfg: EntityHooksConfig<T>,
): EntityHooks<T, Input> {
  const { resource, defaultOrder, fromDb, toDb } = cfg;

  const mapOut = (row: unknown): T =>
    fromDb ? fromDb(row as DbRow) : (row as unknown as T);

  const mapIn = (input: unknown): DbRow =>
    toDb ? toDb(input as Partial<T>) : (input as DbRow);

  function useList(): UseQueryResult<T[]> {
    return useQuery<T[]>({
      queryKey: [resource],
      queryFn: async () => {
        let q = supabase.from(resource as never).select('*');
        if (defaultOrder) q = q.order(defaultOrder);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return ((data ?? []) as unknown[]).map(mapOut);
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
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapOut(data) : null;
      },
    });
  }

  function useCreate(): UseMutationResult<T, Error, Input> {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: Input) => {
        const { data, error } = await supabase
          .from(resource as never)
          .insert(mapIn(input) as never)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return mapOut(data);
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
          .update(mapIn(patch) as never)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return mapOut(data);
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
