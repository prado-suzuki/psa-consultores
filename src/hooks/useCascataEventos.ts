// CRUD de eventos de cascata. Tabela `cascata_eventos` + junção
// `cascata_evento_etapas` (que viaja junto no payload, hidratada como
// `evento.etapas`).
//
// A CascataPage antes usava `api.list/create/update/remove` de
// `src/data/storage.ts` — agora pages só consomem hooks (Hook-First).

import {
  useQuery, useMutation, useQueryClient,
  type UseQueryResult, type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CascataEvento } from '@/types';

const TABLE = 'cascata_eventos';
const QUERY_KEY = ['cascata_eventos'] as const;

export function useCascataEventos(): UseQueryResult<CascataEvento[]> {
  return useQuery<CascataEvento[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE).select('*');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CascataEvento[];
    },
  });
}

export function useCreateCascataEvento(): UseMutationResult<CascataEvento, Error, Partial<CascataEvento>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CascataEvento>) => {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as CascataEvento;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
}

export function useUpdateCascataEvento(): UseMutationResult<
  CascataEvento, Error, { id: string; patch: Partial<CascataEvento> }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const clean = { ...patch } as Record<string, unknown>;
      delete clean.id;
      const { data, error } = await supabase
        .from(TABLE)
        .update(clean as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as CascataEvento;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
}

export function useDeleteCascataEvento(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
}
