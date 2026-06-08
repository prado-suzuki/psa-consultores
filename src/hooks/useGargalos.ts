// Hook de Gargalo (tabela `gargalos` PT-native).
// Hidrata JOIN cluster + junções `gargalo_processos` e
// `gargalo_documentos_afetados` inline.
//
// `documentosAfetados` (M:N nova) é o que torna o gargalo participante do
// grafo de cascata — quando o array tem ≥1 documento, a CascataPage o lista
// e deriva o impacto em tempo real.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Gargalo } from '@/types';

const TABLE = 'gargalos';
const SELECT = '*, estrutura_clusters(name), gargalo_processos(processo_id), gargalo_documentos_afetados(documento_id)';
// Fallback sem JOIN com estrutura_clusters quando a FK não está no schema cache
const SELECT_FALLBACK = '*, gargalo_processos(processo_id), gargalo_documentos_afetados(documento_id)';

type DbRow = Record<string, unknown>;

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrate(row: DbRow): Gargalo {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return {
    ...(row as unknown as Gargalo),
    clusterName: rel?.name,
    processos: pluck<string>(row.gargalo_processos, 'processo_id'),
    documentosAfetados: pluck<string>(row.gargalo_documentos_afetados, 'documento_id'),
  };
}

function stripSyntheticFields(patch: Partial<Gargalo>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  delete out.clusterName;
  delete out.processos;
  delete out.documentosAfetados;
  delete out.responsaveisHoras;
  return out;
}

/** Sincroniza gargalo_documentos_afetados (M:N delete-all + insert) */
async function syncDocumentosAfetados(gargaloId: string, documentoIds: string[]): Promise<void> {
  const { error: delErr } = await supabase
    .from('gargalo_documentos_afetados' as never)
    .delete()
    .eq('gargalo_id', gargaloId);
  if (delErr) throw new Error(delErr.message);

  if (documentoIds.length > 0) {
    const rows = documentoIds.map(documento_id => ({ gargalo_id: gargaloId, documento_id }));
    const { error: insErr } = await supabase
      .from('gargalo_documentos_afetados' as never)
      .insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

export type GargaloInput = Omit<Gargalo, 'id' | 'clusterName' | 'processos' | 'documentosAfetados' | 'responsaveisHoras'> & {
  processos?: string[];
  documentosAfetados?: string[];
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
      const docs = input.documentosAfetados ?? [];
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(stripSyntheticFields(input as Partial<Gargalo>) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = data as unknown as Gargalo;

      if (docs.length > 0) {
        await syncDocumentosAfetados(created.id, docs);
      }

      // Re-fetch hidratado para devolver array preenchido
      const { data: full } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', created.id)
        .maybeSingle();
      return full ? hydrate(full as DbRow) : { ...created, documentosAfetados: docs, processos: [] };
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
      const novoDocs = patch.documentosAfetados;
      const dbPatch = stripSyntheticFields(patch);

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase
          .from(TABLE as never)
          .update(dbPatch as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }

      // Sincroniza junção quando o patch incluiu o array
      if (novoDocs !== undefined) {
        await syncDocumentosAfetados(id, novoDocs);
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
      // ON DELETE CASCADE em gargalo_documentos_afetados/gargalo_processos
      // cuida da limpeza das junções.
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
