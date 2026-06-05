// CRUD de eventos de cascata. Tabela `cascata_eventos` + junção
// `cascata_evento_etapas` (que viaja junto no payload, hidratada como
// `evento.etapas`).
//
// Hidratação:
//   - cascata_evento_etapas → array de etapas marcadas (etapaId + cenario)
//   - cada etapa traz o nome/ordem da process_stages e o nome do processo via
//     join aninhado, para o seletor hierárquico da UI funcionar sem cruzamento.

import {
  useQuery, useMutation, useQueryClient,
  type UseQueryResult, type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CascataEvento, CascataEventoEtapaRef } from '@/types';

const TABLE = 'cascata_eventos';
const QUERY_KEY = ['cascata_eventos'] as const;

// Select aninhado para hidratar etapas marcadas + nome/ordem da stage e nome do processo
const SELECT_HYDRATED = `
  id, nome, descricao, processo_raiz_id, cluster_id, created_at, updated_at,
  cascata_evento_etapas (
    etapa_id, scenario,
    process_stages ( name, stage_order, process_id, processes ( name ) )
  )
`;

type DbCascataRow = {
  id: string;
  nome: string;
  descricao: string | null;
  processo_raiz_id: string | null;
  cluster_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  cascata_evento_etapas: Array<{
    etapa_id: string;
    scenario: string;
    process_stages: {
      name: string | null;
      stage_order: number | null;
      process_id: string | null;
      processes: { name: string | null } | null;
    } | null;
  }> | null;
};

function hydrateEvento(row: DbCascataRow): CascataEvento {
  const etapas: CascataEventoEtapaRef[] = (row.cascata_evento_etapas ?? []).map((j) => ({
    etapaId: j.etapa_id,
    cenario: j.scenario as 'AS-IS' | 'TO-BE',
    etapaNome: j.process_stages?.name ?? undefined,
    etapaOrdem: j.process_stages?.stage_order ?? undefined,
    process_id: j.process_stages?.process_id ?? undefined,
    processoNome: j.process_stages?.processes?.name ?? undefined,
  }));
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? undefined,
    processoRaizId: row.processo_raiz_id ?? undefined,
    cluster: row.cluster_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    etapas,
  };
}

export function useCascataEventos(): UseQueryResult<CascataEvento[]> {
  return useQuery<CascataEvento[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT_HYDRATED);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbCascataRow[]).map(hydrateEvento);
    },
  });
}

export function useCreateCascataEvento(): UseMutationResult<CascataEvento, Error, Partial<CascataEvento>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CascataEvento>) => {
      // O insert não persiste `etapas` aqui — junção é gerenciada à parte (update).
      const dbInsert: Record<string, unknown> = {
        nome: payload.nome,
        descricao: payload.descricao,
        processo_raiz_id: payload.processoRaizId ?? null,
        cluster_id: payload.cluster ?? null,
      };
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(dbInsert as never)
        .select(SELECT_HYDRATED)
        .single();
      if (error) throw new Error(error.message);
      return hydrateEvento(data as unknown as DbCascataRow);
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
      const dbPatch: Record<string, unknown> = {};
      if (patch.nome !== undefined) dbPatch.nome = patch.nome;
      if (patch.descricao !== undefined) dbPatch.descricao = patch.descricao;
      if (patch.processoRaizId !== undefined) dbPatch.processo_raiz_id = patch.processoRaizId;
      if (patch.cluster !== undefined) dbPatch.cluster_id = patch.cluster;

      // Se a UI mandou patch.etapas, sincroniza a junção (delete-all + insert).
      if (patch.etapas !== undefined) {
        const { error: delErr } = await supabase
          .from('cascata_evento_etapas' as never)
          .delete()
          .eq('evento_id', id);
        if (delErr) throw new Error(delErr.message);

        if (patch.etapas.length > 0) {
          const rows = patch.etapas.map((e) => ({
            evento_id: id,
            etapa_id: e.etapaId,
            scenario: e.cenario,
          }));
          const { error: insErr } = await supabase
            .from('cascata_evento_etapas' as never)
            .insert(rows as never);
          if (insErr) throw new Error(insErr.message);
        }
      }

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase
          .from(TABLE as never)
          .update(dbPatch as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }

      // Re-fetch hidratado pra refletir junção atualizada
      const { data, error: selErr } = await supabase
        .from(TABLE as never)
        .select(SELECT_HYDRATED)
        .eq('id', id)
        .single();
      if (selErr) throw new Error(selErr.message);
      return hydrateEvento(data as unknown as DbCascataRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
}

export function useDeleteCascataEvento(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });
}
