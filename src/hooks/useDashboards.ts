import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/rlsMessages';
import type { Database } from '@/integrations/supabase/types';

// Tabela `dashboards` (colunas escalares) criada em 20260623120000; colunas
// min_role/grupo/all_clusters e as junções dashboard_cluster_access /
// dashboard_cliente_access em 20260701100000. As LISTAS de acesso vivem nas
// junções — ver useDashboardAccess.ts.
//
// Este arquivo usava `as any` em todo acesso, com o motivo escrito: os tipos do
// Supabase ainda não conheciam a tabela. Eles conhecem — e as colunas agora vêm
// do schema, então coluna renomeada ou removida para de compilar em vez de
// falhar em runtime.

type DashboardRow = Database['public']['Tables']['dashboards']['Row'];
type DashboardInsert = Database['public']['Tables']['dashboards']['Insert'];
type AppRole = Database['public']['Enums']['app_role'];

export type DashboardFilterType = 'cluster' | 'cliente' | 'nenhum';

/**
 * Nível mínimo ("X ou superior") — hierarquia interna do has_role_or_higher.
 *
 * `Extract` e não união literal: são QUATRO dos SETE membros de `app_role`
 * (ficam fora `client`, `timecliente` e `marketing`, que não participam da
 * hierarquia de dashboards). Escrito assim, renomear um papel no banco quebra
 * aqui; escrito como literal solto, passaria calado.
 */
export type MinRole = Extract<AppRole, 'team_member' | 'sublider' | 'lider' | 'admin'>;

/**
 * As colunas vêm do schema; as duas que a tela ESTREITA ficam explícitas.
 *
 * O banco é mais largo que a tela nas duas: `filter_type` é `text` e aceita
 * qualquer string, e `min_role` aceita os sete papéis. Um valor fora do que
 * está modelado aqui existe no banco e a tela não o representa — o `as any`
 * anterior escondia isso. Hoje o recorte está escrito, e a asserção que o
 * afirma mora num lugar só (`useDashboardsList`).
 */
export interface Dashboard
  extends Pick<
    DashboardRow,
    'id' | 'name' | 'embed_url' | 'param_names' | 'target_page' | 'sop_url' | 'is_active' | 'grupo' | 'all_clusters'
  > {
  filter_type: DashboardFilterType;
  min_role: MinRole | null;
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
      const { data, error } = await supabase
        .from('dashboards')
        .select(
          'id, name, embed_url, param_names, filter_type, target_page, sop_url, is_active, grupo, min_role, all_clusters',
        )
        .order('name');
      if (error) throw error;
      // A ÚNICA asserção do arquivo, e é o estreitamento descrito em `Dashboard`:
      // `filter_type` vem `string` e `min_role` vem com os sete papéis. Preservado
      // como estava — decidir o que fazer com um valor fora do modelado é mudança
      // de comportamento, não de tipagem.
      return (data || []) as unknown as Dashboard[];
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
      // `Insert` do schema em vez de `Record<string, unknown>`: chave de coluna
      // com typo era erro de runtime e agora é erro de compilação.
      const payload: DashboardInsert = {
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
          const { error } = await supabase
            .from('dashboards')
            .update({ ...payload, updated_by: user?.id }).eq('id', editId);
          if (error) throw error;
          toast.success('Dashboard atualizado');
        } else {
          const { data, error } = await supabase
            .from('dashboards')
            .insert({ ...payload, created_by: user?.id, updated_by: user?.id }).select('id').single();
          if (error) throw error;
          id = data.id;
          toast.success('Dashboard criado');
        }
        qc.invalidateQueries({ queryKey: ['dashboards'] });
        return id as string;
      } catch (e: unknown) {
        // `extractErrorMessage` cobre os três casos que aparecem aqui, e o do
        // meio é o que um `e instanceof Error` perderia: erro do PostgREST é
        // objeto simples com `message`, não instância de Error. Trocar por
        // `instanceof` mostraria "Erro ao salvar" no lugar da mensagem do banco.
        const mensagem = extractErrorMessage(e);
        if (mensagem !== 'Validation') toast.error(mensagem || 'Erro ao salvar');
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
      const { error } = await supabase
        .from('dashboards')
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
        const { error } = await supabase
          .from('dashboards')
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
