// Factory thin de hooks CRUD pra uma entidade Supabase. Produz 5 hooks:
// useList, useById, useCreate, useUpdate, useDelete.
//
// Sem mappers — rows do DB são consumidas direto. Tipos casam 1:1 com colunas.
// Pra hidratar junções (M:N) ou JOINs, use `selectClause` PostgREST e faça
// o flattening em hook dedicado em vez de no factory.

import {
  useQuery, useMutation, useQueryClient,
  type UseMutationResult, type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog, type AuditArea, type AuditEntityType } from './useAuditLog';

export interface EntityHooksConfig {
  /** Nome da tabela Supabase. */
  resource: string;
  /** Coluna usada como ORDER BY default na listagem. */
  defaultOrder?: string;
  /** Cláusula SELECT customizada — default '*'. Use pra incluir JOINs PostgREST. */
  selectClause?: string;
  /**
   * Colunas que devem ser NOT NULL na listagem. Útil pra esconder ruído de
   * tabelas compartilhadas (ex.: `['cluster_id']` em `processes` esconde os
   * 28 processos do Digital Rotina que ficaram com cluster_id NULL).
   * Aplica apenas em `useList()` — `useById()` continua aberto pra navegação direta.
   */
  listNotNull?: string[];
  /**
   * Liga a auditoria das três mutações. Sem isto a entidade nasce sem rastro,
   * contra a regra "sempre auditar" do AGENTS.md.
   */
  auditoria?: {
    area: AuditArea;
    entityType: AuditEntityType;
    /** Coluna que dá o nome legível no log. */
    campoDoNome: string;
  };
}

export interface EntityHooks<T extends { id: string }, Input = Omit<T, 'id'>> {
  useList: () => UseQueryResult<T[]>;
  useById: (id: string | undefined) => UseQueryResult<T | null>;
  useCreate: () => UseMutationResult<T, Error, Input>;
  useUpdate: () => UseMutationResult<T, Error, { id: string; patch: Partial<T>; old: T }>;
  useDelete: () => UseMutationResult<void, Error, { id: string; old: T }>;
}

export function createEntityHooks<T extends { id: string }, Input = Omit<T, 'id'>>(
  cfg: EntityHooksConfig,
): EntityHooks<T, Input> {
  const { resource, defaultOrder, selectClause = '*', listNotNull, auditoria } = cfg;

  /** O nome legível da linha, com o id como último recurso. */
  const nomeDe = (linha: Record<string, unknown> | null | undefined, id: string) => {
    const bruto = auditoria ? linha?.[auditoria.campoDoNome] : undefined;
    return bruto == null || bruto === '' ? id : String(bruto);
  };

  function useList(): UseQueryResult<T[]> {
    return useQuery<T[]>({
      queryKey: [resource],
      queryFn: async () => {
        let q = supabase.from(resource as never).select(selectClause);
        for (const col of listNotNull ?? []) {
          q = q.not(col, 'is', null);
        }
        if (defaultOrder) q = q.order(defaultOrder);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as T[];
      },
    });
  }

  function useById(id: string | undefined): UseQueryResult<T | null> {
    return useQuery<T | null>({
      queryKey: [resource, id],
      enabled: !!id,
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await supabase
          .from(resource as never)
          .select(selectClause)
          .eq('id', id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return (data ?? null) as unknown as T | null;
      },
    });
  }

  function useCreate(): UseMutationResult<T, Error, Input> {
    const qc = useQueryClient();
    const { logAction } = useAuditLog();
    return useMutation({
      mutationFn: async (input: Input) => {
        const { data, error } = await supabase
          .from(resource as never)
          .insert(input as never)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as unknown as T;
      },
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: [resource] });
        if (!auditoria) return;
        const linha = data as unknown as Record<string, unknown>;
        void logAction({
          area: auditoria.area, entity_type: auditoria.entityType,
          entity_id: String(linha.id), entity_name: nomeDe(linha, String(linha.id)),
          action: 'created',
        });
      },
    });
  }

  function useUpdate(): UseMutationResult<T, Error, { id: string; patch: Partial<T>; old: T }> {
    const qc = useQueryClient();
    const { logAction } = useAuditLog();
    return useMutation({
      mutationFn: async ({ id, patch }) => {
        const { data, error } = await supabase
          .from(resource as never)
          .update(patch as never)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as unknown as T;
      },
      // O diff sai do `old` que o chamador já passava e o factory ignorava; o
      // campo que não mudou é descartado no `useAuditLog`.
      onSuccess: (data, { id, patch, old }) => {
        qc.invalidateQueries({ queryKey: [resource] });
        if (!auditoria) return;
        const antes = old as unknown as Record<string, unknown>;
        const mudancas: Record<string, { old: unknown; new: unknown }> = {};
        for (const campo of Object.keys(patch as Record<string, unknown>)) {
          mudancas[campo] = { old: antes?.[campo], new: (patch as Record<string, unknown>)[campo] };
        }
        void logAction({
          area: auditoria.area, entity_type: auditoria.entityType,
          entity_id: id, entity_name: nomeDe(data as unknown as Record<string, unknown>, id),
          action: 'updated', changed_fields: mudancas,
        });
      },
    });
  }

  function useDelete(): UseMutationResult<void, Error, { id: string; old: T }> {
    const qc = useQueryClient();
    const { logAction } = useAuditLog();
    return useMutation({
      mutationFn: async ({ id }) => {
        const { error } = await supabase.from(resource as never).delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      onSuccess: (_vazio, { id, old }) => {
        qc.invalidateQueries({ queryKey: [resource] });
        if (!auditoria) return;
        void logAction({
          area: auditoria.area, entity_type: auditoria.entityType,
          entity_id: id, entity_name: nomeDe(old as unknown as Record<string, unknown>, id),
          action: 'deleted',
        });
      },
    });
  }

  return { useList, useById, useCreate, useUpdate, useDelete };
}
