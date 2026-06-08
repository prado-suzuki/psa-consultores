// Hook de Melhoria (tabela `process_improvements`).
// Hidrata JOIN cluster + 4 junções M:N (processos, sistemas, acoes_td)
// inline na query — sem mapper externo.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Melhoria, AcaoTd } from '@/types';

const TABLE = 'process_improvements';
const SELECT = '*, estrutura_clusters(name), melhoria_processos(processo_id), melhoria_sistemas(sistema_id), melhoria_acoes_td(acao_td), gargalo_melhorias(gargalo_id)';

type DbRow = Record<string, unknown>;

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrate(row: DbRow): Melhoria {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  return {
    ...(row as unknown as Melhoria),
    clusterName: rel?.name,
    processos: pluck<string>(row.melhoria_processos, 'processo_id'),
    sistemas: pluck<string>(row.melhoria_sistemas, 'sistema_id'),
    acoesTd: pluck<AcaoTd>(row.melhoria_acoes_td, 'acao_td'),
    gargalos: pluck<string>(row.gargalo_melhorias, 'gargalo_id'),
    executadoPor: [],
  };
}

function stripSyntheticFields(patch: Partial<Melhoria>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  // Campos derivados de JOINs/junções — não vão pra UPDATE/INSERT do row principal.
  delete out.clusterName;
  delete out.processos;
  delete out.sistemas;
  delete out.executadoPor;
  delete out.treinamentoPor;
  delete out.acoesTd;
  delete out.gargalos;
  return out;
}

export type MelhoriaInput = Omit<Melhoria, 'id' | 'clusterName' | 'processos' | 'sistemas' | 'executadoPor' | 'acoesTd' | 'treinamentoPor'> & {
  // Campos opcionais que a UI envia pra serem persistidos em queries
  // separadas (junções) — não fazem parte do INSERT da row principal.
  processos?: string[];
  sistemas?: string[];
  executadoPor?: Melhoria['executadoPor'];
  treinamentoPor?: Melhoria['treinamentoPor'];
  acoesTd?: Melhoria['acoesTd'];
};

export function useMelhorias(): UseQueryResult<Melhoria[]> {
  return useQuery<Melhoria[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .not('cluster_id', 'is', null) // ⚠️ MAPA-only: esconde rows do Digital Rotina
        .order('created_at');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useMelhoria(id: string | undefined): UseQueryResult<Melhoria | null> {
  return useQuery<Melhoria | null>({
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

export function useCreateMelhoria(): UseMutationResult<Melhoria, Error, MelhoriaInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MelhoriaInput) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(stripSyntheticFields(input as Partial<Melhoria>) as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Melhoria;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateMelhoria(): UseMutationResult<
  Melhoria,
  Error,
  { id: string; patch: Partial<Melhoria>; old: Melhoria }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(stripSyntheticFields(patch) as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Melhoria;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteMelhoria(): UseMutationResult<void, Error, { id: string; old: Melhoria }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
