// Snapshots de processo (append-only, tabela `process_scenarios`).
//
// Histórico cronológico puro — não tem `tipo` nem `versao`, e a "última
// mensuração" de um processo é a linha com MAX(snapshot_at). Como o
// Supabase REST não suporta `DISTINCT ON`, fazemos a dedup no client.
//
// Schema EN snake_case (process_id, snapshot_at, annual_cost, ...). Mapeado
// para o type `ProcessSnapshot` (camelCase em PT) via dbMappers.

import {
  useMutation, useQuery, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessSnapshot } from '@/types';
import { snapshotFromDb, snapshotToDb } from '@/utils/mapa/dbMappers';

const TABLE = 'process_scenarios';

export function useSnapshots(processoId?: string): UseQueryResult<ProcessSnapshot[]> {
  return useQuery<ProcessSnapshot[]>({
    queryKey: ['process_snapshots', processoId ?? '_all'],
    queryFn: async () => {
      let q = supabase.from(TABLE as never).select('*');
      if (processoId) q = q.eq('process_id', processoId);
      const { data, error } = await q.order('snapshot_at', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown[]).map(r => snapshotFromDb(r as Record<string, unknown>));
    },
  });
}

export function useSnapshotsLatest(): UseQueryResult<ProcessSnapshot[]> {
  return useQuery<ProcessSnapshot[]>({
    queryKey: ['process_snapshots', '_latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select('*')
        .order('snapshot_at', { ascending: false });
      if (error) throw new Error(error.message);
      const seen = new Set<string>();
      const out: ProcessSnapshot[] = [];
      for (const row of (data ?? []) as unknown[]) {
        const snap = snapshotFromDb(row as Record<string, unknown>);
        if (seen.has(snap.processoId)) continue;
        seen.add(snap.processoId);
        out.push(snap);
      }
      return out;
    },
  });
}

export type NovoSnapshotInput = Omit<ProcessSnapshot, 'id' | 'snapshotEm'> & { snapshotEm?: string };

export function useCreateSnapshot(): UseMutationResult<ProcessSnapshot, Error, NovoSnapshotInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoSnapshotInput) => {
      const payload = snapshotToDb({
        ...input,
        snapshotEm: input.snapshotEm ?? new Date().toISOString(),
      });
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return snapshotFromDb(data as Record<string, unknown>);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['process_snapshots'] }); },
  });
}
