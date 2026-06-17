// Hook de Gargalo (tabela `gargalos` PT-native).
// Hidrata JOIN cluster + 2 junções:
//   - gargalo_processos (M:N, vínculo macro opcional para gargalos
//     organizacionais sem etapa específica — NÃO usado pela cascata)
//   - gargalo_etapas (M:N com FK composta etapa_id+scenario — etapas-origem
//     que definem a cascata derivada em tempo real)
//
// Quando o array etapasOrigem tem ≥1 entrada, a CascataPage lista o gargalo
// e deriva o grafo de impacto BFS jusante automaticamente.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Gargalo, GargaloEtapaRef } from '@/types';

const TABLE = 'gargalos';
const SELECT = `
  *,
  estrutura_clusters(name),
  gargalo_processos(processo_id),
  gargalo_etapas (
    etapa_id, scenario,
    process_stages ( name, stage_order, process_id, processes ( name ) )
  )
`;
// Fallback sem JOIN com estrutura_clusters quando a FK não está no schema cache
const SELECT_FALLBACK = `
  *,
  gargalo_processos(processo_id),
  gargalo_etapas (
    etapa_id, scenario,
    process_stages ( name, stage_order, process_id, processes ( name ) )
  )
`;

type DbGargaloEtapaRow = {
  etapa_id: string;
  scenario: string;
  process_stages: {
    name: string | null;
    stage_order: number | null;
    process_id: string | null;
    processes: { name: string | null } | null;
  } | null;
};

type DbRow = Record<string, unknown> & {
  estrutura_clusters?: { name?: string } | null;
  gargalo_processos?: Array<{ processo_id: string }> | null;
  gargalo_etapas?: DbGargaloEtapaRow[] | null;
};

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrateEtapasOrigem(rel: DbGargaloEtapaRow[] | null | undefined): GargaloEtapaRef[] {
  if (!Array.isArray(rel)) return [];
  return rel.map((j) => ({
    etapaId: j.etapa_id,
    scenario: j.scenario as 'AS-IS' | 'TO-BE',
    etapaNome: j.process_stages?.name ?? undefined,
    stage_order: j.process_stages?.stage_order ?? undefined,
    processo_id: j.process_stages?.process_id ?? undefined,
    processoNome: j.process_stages?.processes?.name ?? undefined,
  }));
}

function hydrate(row: DbRow): Gargalo {
  return {
    ...(row as unknown as Gargalo),
    clusterName: row.estrutura_clusters?.name,
    processos: pluck<string>(row.gargalo_processos, 'processo_id'),
    etapasOrigem: hydrateEtapasOrigem(row.gargalo_etapas),
  };
}

function stripSyntheticFields(patch: Partial<Gargalo>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.clusterName;
  delete out.processos;
  delete out.etapasOrigem;
  delete out.responsaveisHoras;
  return out;
}

/** Sincroniza gargalo_etapas (M:N delete-all + insert) */
async function syncEtapasOrigem(gargaloId: string, etapas: GargaloEtapaRef[]): Promise<void> {
  const { error: delErr } = await supabase
    .from('gargalo_etapas' as never)
    .delete()
    .eq('gargalo_id', gargaloId);
  if (delErr) throw new Error(delErr.message);

  if (etapas.length > 0) {
    const rows = etapas.map((e) => ({
      gargalo_id: gargaloId,
      etapa_id: e.etapaId,
      scenario: e.scenario,
    }));
    const { error: insErr } = await supabase
      .from('gargalo_etapas' as never)
      .insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Sincroniza gargalo_processos (M:N) por DIFF — grão = PROCESSO.
 *  Insere só os processos que faltam e remove só os que saíram (em vez de
 *  delete-all + insert). Evita violar a unique (gargalo_id, processo_id) quando
 *  o gargalo já tem vínculos do backfill e a lista reenviada repete os atuais. */
async function syncProcessos(gargaloId: string, processoIds: string[]): Promise<void> {
  const desejados = [...new Set(processoIds.filter(Boolean))];

  const { data: atuaisRows, error: selErr } = await supabase
    .from('gargalo_processos' as never)
    .select('processo_id')
    .eq('gargalo_id', gargaloId);
  if (selErr) throw new Error(selErr.message);
  const atuais = ((atuaisRows ?? []) as Array<{ processo_id: string }>).map((r) => r.processo_id);

  const aRemover = atuais.filter((p) => !desejados.includes(p));
  const aInserir = desejados.filter((p) => !atuais.includes(p));

  if (aRemover.length > 0) {
    const { error: delErr } = await supabase
      .from('gargalo_processos' as never)
      .delete()
      .eq('gargalo_id', gargaloId)
      .in('processo_id', aRemover);
    if (delErr) throw new Error(delErr.message);
  }
  if (aInserir.length > 0) {
    const rows = aInserir.map((processo_id) => ({ gargalo_id: gargaloId, processo_id }));
    const { error: insErr } = await supabase
      .from('gargalo_processos' as never)
      .insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

export type GargaloInput = Omit<Gargalo, 'id' | 'clusterName' | 'processos' | 'etapasOrigem' | 'responsaveisHoras'> & {
  processos?: string[];
  etapasOrigem?: GargaloEtapaRef[];
  responsaveisHoras?: Gargalo['responsaveisHoras'];
};

export function useGargalos(): UseQueryResult<Gargalo[]> {
  return useQuery<Gargalo[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      let result = await supabase.from(TABLE as never).select(SELECT).order('nome');
      if (result.error && /relationship|not find/i.test(result.error.message)) {
        result = await supabase.from(TABLE as never).select(SELECT_FALLBACK).order('nome');
      }
      if (result.error) throw new Error(result.error.message);
      return ((result.data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useGargalo(id: string | undefined): UseQueryResult<Gargalo | null> {
  return useQuery<Gargalo | null>({
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
      return data ? hydrate(data as DbRow) : null;
    },
  });
}

export function useCreateGargalo(): UseMutationResult<Gargalo, Error, GargaloInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GargaloInput) => {
      const processos = input.processos ?? [];
      const etapas = input.etapasOrigem ?? [];
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(stripSyntheticFields(input as Partial<Gargalo>) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = data as unknown as Gargalo;

      // Grão = PROCESSO (gargalo_processos). etapasOrigem mantido por compat.
      if (processos.length > 0) {
        await syncProcessos(created.id, processos);
      }
      if (etapas.length > 0) {
        await syncEtapasOrigem(created.id, etapas);
      }

      // Re-fetch hidratado
      const { data: full } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', created.id)
        .maybeSingle();
      return full ? hydrate(full as DbRow) : { ...created, etapasOrigem: etapas, processos: [] };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateGargalo(): UseMutationResult<
  Gargalo,
  Error,
  { id: string; patch: Partial<Gargalo>; old: Gargalo }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const novosProcessos = patch.processos;
      const novasEtapas = patch.etapasOrigem;
      const dbPatch = stripSyntheticFields(patch);

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase
          .from(TABLE as never)
          .update(dbPatch as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }

      if (novosProcessos !== undefined) {
        await syncProcessos(id, novosProcessos);
      }
      if (novasEtapas !== undefined) {
        await syncEtapasOrigem(id, novasEtapas);
      }

      const { data, error: selErr } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);
      if (!data) throw new Error('Gargalo não encontrado após update.');
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteGargalo(): UseMutationResult<void, Error, { id: string; old: Gargalo }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      // ON DELETE CASCADE em gargalo_etapas e gargalo_processos cuida das junções.
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
