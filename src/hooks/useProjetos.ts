// Hook de entidade Projeto (tabela `projects`).
// JOIN com `estrutura_clusters(name)` pra hidratar `clusterName` no acesso.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Projeto, JustificativaProjeto } from '@/types';

export type ProjetoInput = Omit<Projeto, 'id' | 'clusterName'>;

const TABLE = 'projects';
const JUNCTION = 'projeto_justificativas'; // justificativas não são coluna de `projects` — vivem aqui (N:N).
const SELECT = '*, estrutura_clusters(name)';

type DbRow = Record<string, unknown>;

function hydrateClusterName(row: DbRow): Projeto {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return { ...(row as unknown as Projeto), clusterName: rel?.name };
}

// Carrega justificativas da junção para um conjunto de projetos, agrupadas por projeto_id.
async function loadJustificativas(ids: string[]): Promise<Map<string, JustificativaProjeto[]>> {
  const map = new Map<string, JustificativaProjeto[]>();
  if (!ids.length) return map;
  const { data, error } = await supabase
    .from(JUNCTION as never)
    .select('projeto_id, justificativa, ordem')
    .in('projeto_id', ids as never)
    .order('ordem');
  if (error) throw new Error(error.message);
  for (const r of (data ?? []) as unknown as { projeto_id: string; justificativa: JustificativaProjeto }[]) {
    const arr = map.get(r.projeto_id) ?? [];
    arr.push(r.justificativa);
    map.set(r.projeto_id, arr);
  }
  return map;
}

// Substitui o conjunto de justificativas de um projeto (delete + reinsert, preservando ordem).
async function syncJustificativas(projetoId: string, justificativas: JustificativaProjeto[]): Promise<void> {
  const { error: delErr } = await supabase.from(JUNCTION as never).delete().eq('projeto_id', projetoId);
  if (delErr) throw new Error(delErr.message);
  if (!justificativas.length) return;
  const rows = justificativas.map((j, i) => ({ projeto_id: projetoId, justificativa: j, ordem: i }));
  const { error: insErr } = await supabase.from(JUNCTION as never).insert(rows as never);
  if (insErr) throw new Error(insErr.message);
}

export function useProjetos(): UseQueryResult<Projeto[]> {
  return useQuery<Projeto[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .not('cluster_id', 'is', null) // ⚠️ MAPA-only: esconde rows do Digital Rotina
        .order('name');
      if (error) throw new Error(error.message);
      const projetos = ((data ?? []) as unknown as DbRow[]).map(hydrateClusterName);
      const just = await loadJustificativas(projetos.map(p => p.id));
      return projetos.map(p => ({ ...p, justificativas: just.get(p.id) ?? [] }));
    },
  });
}

export function useProjeto(id: string | undefined): UseQueryResult<Projeto | null> {
  return useQuery<Projeto | null>({
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
      if (!data) return null;
      const projeto = hydrateClusterName(data as DbRow);
      const just = await loadJustificativas([projeto.id]);
      return { ...projeto, justificativas: just.get(projeto.id) ?? [] };
    },
  });
}

export function useCreateProjeto(): UseMutationResult<Projeto, Error, ProjetoInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjetoInput) => {
      // justificativas não é coluna de `projects` — persiste na junção depois do insert.
      const { justificativas = [], ...dbInput } = input;
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(dbInput as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const projeto = data as unknown as Projeto;
      await syncJustificativas(projeto.id, justificativas);
      return { ...projeto, justificativas };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateProjeto(): UseMutationResult<
  Projeto,
  Error,
  { id: string; patch: Partial<Projeto>; old: Projeto }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      // clusterName é sintético (vem do JOIN); justificativas vivem na junção.
      // Ambos precisam sair do patch antes do update em `projects`.
      const dbPatch = { ...patch };
      delete (dbPatch as Record<string, unknown>).clusterName;
      const temJustificativas = 'justificativas' in dbPatch;
      const justificativas = patch.justificativas ?? [];
      delete (dbPatch as Record<string, unknown>).justificativas;
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(dbPatch as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (temJustificativas) await syncJustificativas(id, justificativas);
      return { ...(data as unknown as Projeto), justificativas };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteProjeto(): UseMutationResult<void, Error, { id: string; old: Projeto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
