import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { useCallback } from 'react';

// ── Constants ──────────────────────────────────────────────────────────

const clienteTable = 'cliente';
const contribuinteTable = 'contribuinte';
const representanteTable = 'representante';

// ── Types ──────────────────────────────────────────────────────────────

export interface ClienteListItem {
  id: string;
  nome: string;
  ativo: boolean;
  setor_cliente: string | null;
  regiao: string | null;
  municipio: string | null;
  uf: string | null;
  fixo: string | null;
  categoria: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContribuinteListItem {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string;
  setor_cliente_id: string | null;
}

// ── Queries ────────────────────────────────────────────────────────────

export const useClientesList = (filters?: { ativo?: boolean; search?: string }) => {
  return useQuery({
    queryKey: ['clientes-lista', filters],
    queryFn: async () => {
      let query = supabase.from(clienteTable).select('*').eq('excluido', false).eq('ambiente', currentAmbiente).order('nome');
      if (filters?.ativo !== undefined) query = query.eq('ativo', filters.ativo);
      if (filters?.search) query = query.ilike('nome', `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      const list = ((data || []) as unknown as ClienteListItem[]).map(c => ({ ...c, setor_cliente: null as string | null, regiao: null as string | null }));

      // Enrich setor_cliente / regiao a partir da OS mais recente (view)
      const ids = list.map(c => c.id);
      if (ids.length > 0) {
        const { data: viewRows } = await (supabase.from('cliente_setor_regiao_atual' as any) as any)
          .select('id_cliente, setor_cliente, regiao')
          .in('id_cliente', ids);
        const byId = new Map<string, { setor_cliente: string | null; regiao: string | null }>(
          ((viewRows || []) as Array<{ id_cliente: string; setor_cliente: string | null; regiao: string | null }>)
            .map(r => [r.id_cliente, { setor_cliente: r.setor_cliente, regiao: r.regiao }])
        );
        for (const c of list) {
          const v = byId.get(c.id);
          c.setor_cliente = v?.setor_cliente ?? null;
          c.regiao = v?.regiao ?? null;
        }
      }

      return list;
    },
  });
};

export const useContribuintesByCliente = (clienteId: string | null | undefined) => {
  return useQuery({
    queryKey: ['contribuintes-por-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj, setor_cliente_id')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return (data || []) as ContribuinteListItem[];
    },
    enabled: !!clienteId,
  });
};

/** Fetch external clients for dropdowns (active only) */
export const useExternalClients = (editingClientId?: string | null) => {
  return useQuery({
    queryKey: ['external-clients', editingClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      const list = (data as { id: string; nome: string }[]).map(c => ({ ...c, setor_cliente: null as string | null }));

      // If editing a client not in the active list, fetch it individually
      if (editingClientId && !list.some(c => c.id === editingClientId)) {
        const { data: extra } = await supabase
          .from('cliente')
          .select('id, nome')
          .eq('id', editingClientId)
          .maybeSingle();
        if (extra) list.push({ ...(extra as { id: string; nome: string }), setor_cliente: null });
      }

      // Enrich setor_cliente via view (OS mais recente)
      const ids = list.map(c => c.id);
      if (ids.length > 0) {
        const { data: viewRows } = await (supabase.from('cliente_setor_regiao_atual' as any) as any)
          .select('id_cliente, setor_cliente')
          .in('id_cliente', ids);
        const byId = new Map<string, string | null>(
          ((viewRows || []) as Array<{ id_cliente: string; setor_cliente: string | null }>)
            .map(r => [r.id_cliente, r.setor_cliente])
        );
        for (const c of list) c.setor_cliente = byId.get(c.id) ?? null;
      }

      return list;
    },
  });
};

// ── Mutations ──────────────────────────────────────────────────────────

export const useDevClientMutations = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  const invalidateClients = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['clientes-lista'] });
    qc.invalidateQueries({ queryKey: ['clientes-filtrados'] });
    qc.invalidateQueries({ queryKey: ['contribuintes-modal'] });
    qc.invalidateQueries({ queryKey: ['contribuintes-por-cliente'] });
    qc.invalidateQueries({ queryKey: ['external-clients'] });
  }, [qc]);

  const logClientAction = useCallback((
    entityType: 'cliente' | 'contribuinte' | 'representante' | 'ordem_servico',
    entityId: string,
    entityName: string,
    action: 'created' | 'updated' | 'deleted',
    details?: string,
  ) => {
    logAction({
      area: 'dev',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action,
      details,
    });
  }, [logAction]);

  /** Soft-delete a client */
  const softDeleteCliente = useCallback(async (id: string, nome: string) => {
    const { error } = await supabase.from(clienteTable).update({ excluido: true } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente excluído');
    logClientAction('cliente', id, nome, 'deleted');
    invalidateClients();
  }, [logClientAction, invalidateClients]);

  return {
    invalidateClients,
    logClientAction,
    softDeleteCliente,
    clienteTable,
    contribuinteTable,
    representanteTable,
  };
};
