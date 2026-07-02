import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Tabela `dashboards` (colunas escalares) criada em 20260623120000; colunas
// min_role/grupo/all_clusters e as junções dashboard_cluster_access /
// dashboard_cliente_access em 20260701100000. Enquanto os tipos do Supabase não
// forem regerados (após rodar a migration no Lovable), usamos `as any` no acesso.
// As LISTAS de acesso vivem nas junções — ver useDashboardAccess.ts.

export type DashboardFilterType = 'cluster' | 'cliente' | 'nenhum';

/** Nível mínimo ("X ou superior") — hierarquia interna do has_role_or_higher. */
export type MinRole = 'team_member' | 'sublider' | 'lider' | 'admin';

export interface Dashboard {
  id: string;
  name: string;
  embed_url: string;
  param_names: string[];
  filter_type: DashboardFilterType;
  target_page: string | null;
  sop_url: string | null;
  is_active: boolean;
  grupo: string | null;
  // Acesso (colunas escalares): cluster/nenhum -> min_role + all_clusters (+ junção).
  min_role: MinRole | null;
  all_clusters: boolean;
}

export interface DashboardForm {
  name: string;
  embed_url: string;
  param_names: string[];
  filter_type: DashboardFilterType;
  target_page: string;
  sop_url: string;
  grupo: string;
  min_role: MinRole;
  all_clusters: boolean;
  // arrays de trabalho da UI — persistidos nas junções (não em colunas)
  allowed_cluster_ids: string[];
  allowed_cliente_ids: string[];
}

export const useDashboardsList = () =>
  useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('dashboards' as any)
        .select('id, name, embed_url, param_names, filter_type, target_page, sop_url, is_active, grupo, min_role, all_clusters') as any)
        .order('name');
      if (error) throw error;
      return (data || []) as Dashboard[];
    },
  });

export const useDashboardSave = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return {
    // devolve o id do dashboard (novo ou editado) p/ encadear a sincronia das junções.
    save: async (editId: string | null, form: DashboardForm): Promise<string> => {
      if (!form.name.trim()) { toast.error('Nome é obrigatório'); throw new Error('Validation'); }
      if (!form.embed_url.trim()) { toast.error('URL do embed é obrigatória'); throw new Error('Validation'); }
      const isCliente = form.filter_type === 'cliente';
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        embed_url: form.embed_url.trim(),
        param_names: form.param_names,
        filter_type: form.filter_type,
        target_page: form.target_page.trim() || null,
        sop_url: form.sop_url.trim() || null,
        grupo: form.grupo.trim() || null,
        // colunas escalares de acesso; as listas vão p/ as junções (useSetDashboardAccess).
        min_role: isCliente ? null : form.min_role,
        all_clusters: isCliente ? false : form.all_clusters,
      };
      try {
        let id = editId;
        if (editId) {
          const { error } = await (supabase.from('dashboards' as any) as any)
            .update({ ...payload, updated_by: user?.id }).eq('id', editId);
          if (error) throw error;
          toast.success('Dashboard atualizado');
        } else {
          const { data, error } = await (supabase.from('dashboards' as any) as any)
            .insert({ ...payload, created_by: user?.id, updated_by: user?.id }).select('id').single();
          if (error) throw error;
          id = data.id as string;
          toast.success('Dashboard criado');
        }
        qc.invalidateQueries({ queryKey: ['dashboards'] });
        return id as string;
      } catch (e: any) {
        if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useDashboardToggle = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (item: Dashboard) => {
      const { error } = await (supabase.from('dashboards' as any) as any)
        .update({ is_active: !item.is_active, updated_by: user?.id }).eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });
};

export const useDashboardDelete = () => {
  const qc = useQueryClient();

  return {
    // hard delete — sem coluna `excluido` (acessos somem em cascata via FK)
    remove: async (item: Dashboard) => {
      try {
        const { error } = await (supabase.from('dashboards' as any) as any)
          .delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['dashboards'] });
        toast.success('Dashboard excluído');
      } catch {
        toast.error('Erro ao excluir');
      }
    },
  };
};
