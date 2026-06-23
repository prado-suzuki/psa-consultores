import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tabelas `dashboards` / `dashboard_access` criadas pela migration
// 20260623120000_crud_dashboards.sql. Enquanto os tipos do Supabase não forem
// regerados (após rodar a migration no Lovable), usamos `as any` no acesso.

export type DashboardFilterType = 'cluster' | 'cliente' | 'nenhum';

export interface Dashboard {
  id: string;
  name: string;
  embed_url: string;
  param_names: string[];
  filter_type: DashboardFilterType;
  target_page: string | null;
  is_active: boolean;
}

export interface DashboardForm {
  name: string;
  embed_url: string;
  param_names: string[];
  filter_type: DashboardFilterType;
  target_page: string;
}

export const useDashboardsList = () =>
  useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('dashboards' as any)
        .select('id, name, embed_url, param_names, filter_type, target_page, is_active') as any)
        .order('name');
      if (error) throw error;
      return (data || []) as Dashboard[];
    },
  });

export const useDashboardSave = () => {
  const qc = useQueryClient();

  return {
    save: async (editId: string | null, form: DashboardForm) => {
      if (!form.name.trim()) { toast.error('Nome é obrigatório'); throw new Error('Validation'); }
      if (!form.embed_url.trim()) { toast.error('URL do embed é obrigatória'); throw new Error('Validation'); }
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        embed_url: form.embed_url.trim(),
        param_names: form.param_names,
        filter_type: form.filter_type,
        target_page: form.target_page.trim() || null,
      };
      try {
        if (editId) {
          const { error } = await (supabase.from('dashboards' as any) as any).update(payload).eq('id', editId);
          if (error) throw error;
          toast.success('Dashboard atualizado');
        } else {
          const { error } = await (supabase.from('dashboards' as any) as any).insert(payload);
          if (error) throw error;
          toast.success('Dashboard criado');
        }
        qc.invalidateQueries({ queryKey: ['dashboards'] });
      } catch (e: any) {
        if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useDashboardToggle = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (item: Dashboard) => {
      const { error } = await (supabase.from('dashboards' as any) as any)
        .update({ is_active: !item.is_active }).eq('id', item.id);
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
