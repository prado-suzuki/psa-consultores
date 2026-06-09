// Snapshots de processo (append-only, tabela `process_scenarios`).
//
// Histórico cronológico puro — não tem `tipo` nem `versao`, e a "última
// mensuração" de um processo é a linha com MAX(snapshot_at). Como o
// Supabase REST não suporta `DISTINCT ON`, fazemos a dedup no client.

import {
  useMutation, useQuery, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessSnapshot } from '@/types';

const TABLE = 'process_scenarios';

// QueryFn isolada para `useSnapshotsLatest` — também é usada pelo Dashboard
// no momento de exportar o CSV (`fetchQuery` força refetch ignorando o
// cache stale, evitando exportar com dados antigos quando o banco foi
// alterado externamente por uma migration).
export async function fetchSnapshotsLatest(): Promise<ProcessSnapshot[]> {
  const { data, error } = await supabase
    .from(TABLE as never)
    .select('*')
    .order('snapshot_at', { ascending: false });
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const out: ProcessSnapshot[] = [];
  for (const row of (data ?? []) as unknown as ProcessSnapshot[]) {
    if (seen.has(row.process_id)) continue;
    seen.add(row.process_id);
    out.push(row);
  }
  return out;
}

export const SNAPSHOTS_LATEST_QUERY_KEY = ['process_snapshots', '_latest'] as const;

export function useSnapshots(processId?: string): UseQueryResult<ProcessSnapshot[]> {
  return useQuery<ProcessSnapshot[]>({
    queryKey: ['process_snapshots', processId ?? '_all'],
    queryFn: async () => {
      let q = supabase.from(TABLE as never).select('*');
      if (processId) q = q.eq('process_id', processId);
      const { data, error } = await q.order('snapshot_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProcessSnapshot[];
    },
  });
}

export function useSnapshotsLatest(): UseQueryResult<ProcessSnapshot[]> {
  return useQuery<ProcessSnapshot[]>({
    queryKey: SNAPSHOTS_LATEST_QUERY_KEY as unknown as readonly unknown[],
    queryFn: fetchSnapshotsLatest,
  });
}

export type NovoSnapshotInput = Omit<ProcessSnapshot, 'id' | 'snapshot_at'> & { snapshot_at?: string };

export function useCreateSnapshot(): UseMutationResult<ProcessSnapshot, Error, NovoSnapshotInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoSnapshotInput) => {
      const payload = { ...input, snapshot_at: input.snapshot_at ?? new Date().toISOString() };
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ProcessSnapshot;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['process_snapshots'] }); },
  });
}
