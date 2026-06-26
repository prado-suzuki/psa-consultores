// Snapshots de ROI (append-only, tabela `roi_snapshots`).
//
// Tabela dedicada e limpa (separada do what-if `process_scenarios`). Modelo:
//   * snapshot é POR PROCESSO; `checkpoint_id` agrupa um "Salvar".
//   * escopo 'process' → 1 linha; escopo 'project' → N linhas (mesmo
//     checkpoint_id/snapshot_at) que somadas formam 1 ponto do histórico
//     consolidado do projeto.
// Histórico cronológico puro — a "última mensuração" de um processo é a linha
// com MAX(snapshot_at). Como o REST não suporta DISTINCT ON, dedup no client.

import {
  useMutation, useQuery, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ratioRoi, ratioPayback } from '@/utils/roiCalculator';
import type { ProcessSnapshot, ConsolidatedCheckpoint } from '@/types';

const TABLE = 'roi_snapshots';

// QueryFn isolada para `useSnapshotsLatest` — também usada pelo Dashboard ao
// exportar o CSV (`fetchQuery` força refetch ignorando cache stale).
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

export const SNAPSHOTS_LATEST_QUERY_KEY = ['roi_snapshots', '_latest'] as const;

// Histórico de um processo (todas as mensurações dele, qualquer escopo).
export function useSnapshots(processId?: string): UseQueryResult<ProcessSnapshot[]> {
  return useQuery<ProcessSnapshot[]>({
    queryKey: ['roi_snapshots', processId ?? '_all'],
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

// KPIs congelados num snapshot (o que o app calcula ao vivo e salva).
export interface SnapshotKpis {
  annual_cost: number;
  annual_hours: number;
  annual_savings: number;
  roi_percent: number;
  payback_months: number;
  hours_freed: number;
  investment: number;
}

const kpisDe = (k: SnapshotKpis) => ({
  annual_cost: k.annual_cost,
  annual_hours: k.annual_hours,
  annual_savings: k.annual_savings,
  roi_percent: k.roi_percent,
  payback_months: k.payback_months,
  hours_freed: k.hours_freed,
  investment: k.investment,
});

export type NovoSnapshotInput = SnapshotKpis & {
  process_id: string;
  snapshot_at?: string;
  label?: string | null;
};

// Salvar mensuração de UM processo (escopo 'process'): 1 linha, checkpoint próprio.
export function useCreateSnapshot(): UseMutationResult<ProcessSnapshot, Error, NovoSnapshotInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovoSnapshotInput) => {
      const payload = {
        checkpoint_id: crypto.randomUUID(),
        scope_kind: 'process' as const,
        scope_id: input.process_id,
        process_id: input.process_id,
        label: input.label ?? null,
        snapshot_at: input.snapshot_at ?? new Date().toISOString(),
        ...kpisDe(input),
      };
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ProcessSnapshot;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roi_snapshots'] }); },
  });
}

export interface CheckpointProjetoInput {
  projectId: string;
  label?: string | null;
  snapshot_at?: string;
  /** Um conjunto de KPIs por processo do projeto. Todos viram 1 checkpoint. */
  processos: Array<SnapshotKpis & { process_id: string }>;
}

// Salvar mensuração do PROJETO (escopo 'project'): N linhas, MESMO checkpoint_id
// e snapshot_at → 1 ponto do histórico consolidado.
export function useCreateCheckpointProjeto(): UseMutationResult<ProcessSnapshot[], Error, CheckpointProjetoInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, label, snapshot_at, processos }: CheckpointProjetoInput) => {
      if (processos.length === 0) {
        throw new Error('Checkpoint de projeto sem processos para salvar.');
      }
      const checkpoint_id = crypto.randomUUID();
      const ts = snapshot_at ?? new Date().toISOString();
      const rows = processos.map(p => ({
        checkpoint_id,
        scope_kind: 'project' as const,
        scope_id: projectId,
        process_id: p.process_id,
        label: label ?? null,
        snapshot_at: ts,
        ...kpisDe(p),
      }));
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(rows as never)
        .select();
      if (error) throw new Error(error.message);
      return data as unknown as ProcessSnapshot[];
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roi_snapshots'] }); },
  });
}

// Agrupa linhas de checkpoints de projeto em pontos consolidados (soma dos KPIs).
export function agruparCheckpoints(rows: ProcessSnapshot[]): ConsolidatedCheckpoint[] {
  const byCp = new Map<string, ProcessSnapshot[]>();
  for (const r of rows) {
    const arr = byCp.get(r.checkpoint_id) ?? [];
    arr.push(r);
    byCp.set(r.checkpoint_id, arr);
  }
  const out: ConsolidatedCheckpoint[] = [];
  for (const [checkpoint_id, group] of byCp) {
    const sum = (k: keyof ProcessSnapshot) => group.reduce((s, x) => s + (Number(x[k]) || 0), 0);
    const annual_savings = sum('annual_savings');
    const investment = sum('investment');
    out.push({
      checkpoint_id,
      snapshot_at: group[0].snapshot_at,
      label: group[0].label ?? null,
      qtdProcessos: group.length,
      annual_cost: sum('annual_cost'),
      annual_hours: sum('annual_hours'),
      annual_savings,
      hours_freed: sum('hours_freed'),
      investment,
      roi_percent: ratioRoi(annual_savings, investment),
      payback_months: ratioPayback(annual_savings / 12, investment),
    });
  }
  return out.sort((a, b) => a.snapshot_at.localeCompare(b.snapshot_at));
}

// Histórico CONSOLIDADO do projeto: pontos (checkpoints escopo 'project') no tempo.
export function useCheckpointsProjeto(projectId?: string): UseQueryResult<ConsolidatedCheckpoint[]> {
  return useQuery<ConsolidatedCheckpoint[]>({
    queryKey: ['roi_snapshots', '_checkpoints', projectId ?? '_none'],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select('*')
        .eq('scope_kind', 'project')
        .eq('scope_id', projectId as string)
        .order('snapshot_at', { ascending: true });
      if (error) throw new Error(error.message);
      return agruparCheckpoints((data ?? []) as unknown as ProcessSnapshot[]);
    },
  });
}
