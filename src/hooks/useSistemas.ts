// Hook de Sistema (tabela `sistemas_processo`).
//
// Bespoke (não usa o factory genérico) por dois motivos:
//  1. Hidrata `clustersRateio` via embed de `sistema_clusters` + nome do cluster
//     — é assim que roiCalculator e a tela de Sistemas consomem (por NOME).
//  2. Na escrita, tira os campos sintéticos (clustersRateio/responsaveisHoras)
//     do payload — eles NÃO são colunas de sistemas_processo — e sincroniza o
//     rateio na tabela `sistema_clusters` via syncSistemaClusters.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Sistema } from '@/types';
import { syncSistemaClusters, type RateioInput } from './sistemaClustersSync';

const TABLE = 'sistemas_processo';
const SELECT = '*, sistema_clusters ( cluster_id, rateio, estrutura_clusters ( name ) )';

type DbRow = Record<string, unknown> & {
  sistema_clusters?: Array<{ cluster_id: string; rateio: number | null; estrutura_clusters?: { name?: string } | null }> | null;
};

function hydrate(row: DbRow): Sistema {
  const { sistema_clusters, ...clean } = row;
  return {
    ...(clean as unknown as Sistema),
    // `cluster` = NOME do cluster (fallback id) — casa com roiCalculator (proj.clusterName)
    // e com o rateioNoCluster da SistemasPage.
    clustersRateio: (sistema_clusters ?? []).map((sc) => ({
      cluster: sc.estrutura_clusters?.name ?? sc.cluster_id,
      rateio: sc.rateio ?? 100,
    })),
  };
}

// Campos hidratados (não são colunas) + a API de escrita de rateio.
function stripSyntheticFields(patch: Record<string, unknown>): Record<string, unknown> {
  const out = { ...patch };
  delete out.clustersRateio;
  delete out.responsaveisHoras;
  delete out.rateios;
  return out;
}

export type { RateioInput };
export type SistemaInput = Omit<Sistema, 'id' | 'clustersRateio' | 'responsaveisHoras'> & { rateios?: RateioInput[] };
export type SistemaPatch = Partial<Sistema> & { rateios?: RateioInput[] };

export function useSistemas(): UseQueryResult<Sistema[]> {
  return useQuery<Sistema[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE as never).select(SELECT).order('nome');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useSistema(id: string | undefined): UseQueryResult<Sistema | null> {
  return useQuery<Sistema | null>({
    queryKey: [TABLE, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from(TABLE as never).select(SELECT).eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? hydrate(data as DbRow) : null;
    },
  });
}

export function useCreateSistema(): UseMutationResult<Sistema, Error, SistemaInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SistemaInput) => {
      const rateios = input.rateios;
      const payload = stripSyntheticFields(input as unknown as Record<string, unknown>);
      const { data, error } = await supabase.from(TABLE as never).insert(payload as never).select().single();
      if (error) throw new Error(error.message);
      const created = hydrate(data as DbRow);
      if (rateios && rateios.length) await syncSistemaClusters(created.id, rateios);
      return created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateSistema(): UseMutationResult<Sistema, Error, { id: string; patch: SistemaPatch; old: Sistema }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const rateios = patch.rateios;
      const payload = stripSyntheticFields(patch as unknown as Record<string, unknown>);
      const { data, error } = await supabase.from(TABLE as never).update(payload as never).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      if (rateios) await syncSistemaClusters(id, rateios);
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteSistema(): UseMutationResult<void, Error, { id: string; old: Sistema }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
