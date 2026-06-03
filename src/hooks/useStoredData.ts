// Hook "agregador" para listas CRUD que pages consomem via state local.
// Implementa o padrão Hook-First exigido pela spec: nenhum componente fala
// com Supabase direto; toda I/O passa por aqui (React Query under the hood).
//
// API pública preservada (compatível com o antigo `src/data/storage.ts`):
//   { items, setItems, loaded, addItem, updateItem, removeItem }
//
// `setItems(prev => next)` continua funcionando — internamente compara o
// diff vs o último snapshot do server e dispara as mutations correspondentes
// (insert/update/delete) em paralelo. Em caso de falha, ressincroniza com o
// banco via invalidação do query.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { resolveTable } from '@/lib/tableNameMap';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ────────────────────────────────────────────────────────────────────────
//  Operações puras de I/O sobre o Supabase. Não exportadas — pages só veem
//  os hooks abaixo, garantindo Hook-First.
// ────────────────────────────────────────────────────────────────────────

async function listAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(resolveTable(table) as never).select('*');
  if (error) throw new Error(`SELECT ${table}: ${error.message}`);
  return (data ?? []) as unknown as T[];
}

async function insertOne<T>(table: string, body: Partial<T>): Promise<T> {
  const { data, error } = await supabase
    .from(resolveTable(table) as never)
    .insert(body as never)
    .select()
    .single();
  if (error) throw new Error(`INSERT ${table}: ${error.message}`);
  return data as unknown as T;
}

async function updateOne<T>(table: string, id: string, body: Partial<T>): Promise<T> {
  // Não enviar `id` no patch — evita conflito com a coluna PK.
  const patch = { ...(body as Record<string, unknown>) };
  delete patch.id;
  const { data, error } = await supabase
    .from(resolveTable(table) as never)
    .update(patch as never)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`UPDATE ${table} ${id}: ${error.message}`);
  return data as unknown as T;
}

async function deleteOne(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(resolveTable(table) as never)
    .delete()
    .eq('id', id);
  if (error) throw new Error(`DELETE ${table} ${id}: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────
//  Helper público — chamado APENAS por outros hooks (ex.: roiCsv loader)
//  para fazer SELECT sob demanda. Pages não devem importar.
// ────────────────────────────────────────────────────────────────────────

export async function selectAllRaw<T>(table: string): Promise<T[]> {
  return listAll<T>(table);
}

// ────────────────────────────────────────────────────────────────────────
//  Helper resolvedor — aceita a assinatura legada (storageKey, jsonPath)
//  ou nova (resource).
// ────────────────────────────────────────────────────────────────────────

function resolveResource(arg1: string, arg2?: string): string {
  const raw = arg2 ?? arg1;
  const stripped = raw.replace(/^\/+/, '').replace(/\.json$/i, '');
  return resolveTable(stripped);
}

export interface StorageErrorInfo {
  action: 'adicionar' | 'salvar' | 'excluir';
  resource: string;
  error: unknown;
}
export type StorageErrorHandler = (info: StorageErrorInfo) => void;

function defaultErrorHandler({ action, resource, error }: StorageErrorInfo) {
  console.error(`[useStoredData] Falha ao ${action} (${resource}):`, error);
  if (typeof window !== 'undefined') {
    toast.error(`Não foi possível ${action} "${resource}"`, {
      description:
        'Verifique a conexão com o Supabase e as credenciais. ' +
        'A tela foi revertida para o último estado confirmado pelo banco — nada anterior foi perdido.',
      duration: 8000,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────
//  Hook principal.
// ────────────────────────────────────────────────────────────────────────

export function useStoredData<T extends { id: string }>(
  arg1: string,
  arg2?: string,
  onError?: StorageErrorHandler,
) {
  const resource = resolveResource(arg1, arg2);
  const qc = useQueryClient();
  // Memoizado para que `queryKey` não troque a cada render — caso contrário
  // cada useCallback que o lista nas deps reidentifica em cascata.
  const queryKey = useMemo(() => ['stored-data', resource] as const, [resource]);

  const query = useQuery<T[]>({
    queryKey,
    queryFn: () => listAll<T>(resource),
  });

  const reportError = useCallback((info: StorageErrorInfo) => {
    (onError ?? defaultErrorHandler)(info);
  }, [onError]);

  // Espelho síncrono para usar como "prev" em diffs e reverts otimistas.
  const itemsRef = useRef<T[]>([]);
  const [items, setItemsState] = useState<T[]>([]);
  useEffect(() => {
    if (query.data) {
      itemsRef.current = query.data;
      setItemsState(query.data);
    }
  }, [query.data]);

  const commitOptimistic = useCallback((next: T[]) => {
    itemsRef.current = next;
    setItemsState(next);
    qc.setQueryData<T[]>(queryKey, next);
  }, [qc, queryKey]);

  // ────── Mutations ──────

  const insertMutation = useMutation({
    mutationFn: (item: Partial<T>) => insertOne<T>(resource, item),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<T> }) =>
      updateOne<T>(resource, id, patch),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOne(resource, id),
  });

  const addItem = useCallback(
    async (item: Omit<T, 'id'> & { id?: string }) => {
      const id = item.id || generateId();
      try {
        const created = await insertMutation.mutateAsync({ ...item, id } as Partial<T>);
        commitOptimistic([...itemsRef.current, created]);
        return created;
      } catch (error) {
        reportError({ action: 'adicionar', resource, error });
      }
    },
    [insertMutation, commitOptimistic, resource, reportError],
  );

  const updateItem = useCallback(
    async (id: string, updater: (item: T) => T) => {
      const prev = itemsRef.current;
      const target = prev.find((it) => it.id === id);
      if (!target) return;
      const updated = updater(target);
      commitOptimistic(prev.map((it) => (it.id === id ? updated : it)));
      try {
        const saved = await updateMutation.mutateAsync({ id, patch: updated as Partial<T> });
        commitOptimistic(itemsRef.current.map((it) => (it.id === id ? saved : it)));
        return saved;
      } catch (error) {
        commitOptimistic(itemsRef.current.map((it) => (it.id === id ? target : it)));
        reportError({ action: 'salvar', resource, error });
      }
    },
    [updateMutation, commitOptimistic, resource, reportError],
  );

  const removeItem = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        commitOptimistic(itemsRef.current.filter((it) => it.id !== id));
      } catch (error) {
        reportError({ action: 'excluir', resource, error });
      }
    },
    [deleteMutation, commitOptimistic, resource, reportError],
  );

  // setItems(prev => next) — diff e dispara mutations correspondentes.
  // Útil quando uma página manipula a lista inteira de uma vez (ex.: reordenar).
  const setItems = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      const prev = itemsRef.current;
      const next = typeof updater === 'function' ? (updater as (p: T[]) => T[])(prev) : updater;
      commitOptimistic(next);

      const prevById = new Map(prev.map((p) => [p.id, p]));
      const nextById = new Map(next.map((p) => [p.id, p]));
      const ops: Promise<unknown>[] = [];
      for (const [id, item] of nextById) {
        const before = prevById.get(id);
        if (!before) {
          ops.push(insertMutation.mutateAsync(item as Partial<T>));
        } else if (JSON.stringify(before) !== JSON.stringify(item)) {
          ops.push(updateMutation.mutateAsync({ id, patch: item as Partial<T> }));
        }
      }
      for (const id of prevById.keys()) {
        if (!nextById.has(id)) ops.push(deleteMutation.mutateAsync(id));
      }

      if (ops.length) {
        Promise.all(ops).catch((error) => {
          reportError({ action: 'salvar', resource, error });
          // Sucesso parcial é possível: ressincroniza com a verdade do banco.
          qc.invalidateQueries({ queryKey });
        });
      }
    },
    [insertMutation, updateMutation, deleteMutation, commitOptimistic, qc, queryKey, resource, reportError],
  );

  return {
    items,
    setItems,
    loaded: !query.isLoading,
    addItem,
    updateItem,
    removeItem,
  };
}
