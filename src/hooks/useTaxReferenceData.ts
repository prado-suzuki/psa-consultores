import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';

// ── Interfaces locais ──────────────────────────────────────────────────

export interface ProfileSafe {
  id: string;
  first_name: string;
  last_name: string;
}

export interface UserRoleEntry {
  user_id: string;
  role: string;
}

export interface TaxCategoria {
  id: string;
  nome: string;
}

export interface TaxAreaCategoria {
  id: string;
  area_id: string;
  estrutura_area_id: string;
  servico_id: string;
}

export interface ExternalClient {
  id: string;
  nome: string;
  setor_cliente: string | null;
}

export interface ContribuinteOption {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
}

/** Interface local para evitar (os as any) — tabela 'ordem_servico' ausente do schema tipado */
export interface OrdemServico {
  id: string;
  numero_os: string | null;
  valor_projeto: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  situacao: string | null;
  id_cliente: string;
  id_servico: string | null;
  id_produto_segmento: string | null;
  excluido: boolean;
  created_at: string;
  [key: string]: unknown;
}

// ── Hooks ──────────────────────────────────────────────────────────────

/** Catálogo de serviços prestados */
export function useServicosPrestados() {
  return useQuery({
    queryKey: ['servicos-prestados'],
    queryFn: async () => {
      // as any: tabela 'servicos_prestados' ausente do schema tipado gerado
      const { data, error } = await (supabase.from('servicos_prestados' as any) as any)
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data as TaxCategoria[];
    },
  });
}

/** Links entre áreas e serviços */
export function useAreaServicos() {
  return useQuery({
    queryKey: ['area-servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('area_servicos')
        .select('id, area_id, estrutura_area_id, servico_id');
      if (error) throw error;
      return data as TaxAreaCategoria[];
    },
  });
}

/** Perfis seguros para dropdowns de seleção de pessoas */
export function useTeamProfilesSafe() {
  return useQuery({
    queryKey: ['team-members-profiles-safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data as ProfileSafe[];
    },
  });
}

/** Roles dos usuários (lider, sublider, team_member) */
export function useTeamRolesForProjects() {
  return useQuery({
    queryKey: ['user-roles-lider-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['lider', 'team_member', 'sublider']);
      if (error) throw error;
      return data as UserRoleEntry[];
    },
  });
}

/** Membros filtrados por equipes de sublíderes selecionados */
export function useSubliderTeamMembers(subliderIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['sublider-team-members', subliderIds],
    queryFn: async () => {
      if (subliderIds.length === 0) return [];
      const { data: teams, error: tErr } = await supabase
        .from('estrutura_equipes')
        .select('id')
        .in('sublider_id', subliderIds);
      if (tErr) throw tErr;
      if (!teams?.length) return [];
      const { data: members, error: mErr } = await supabase
        .from('estrutura_equipe_membros')
        .select('user_id')
        .in('equipe_id', teams.map(t => t.id));
      if (mErr) throw mErr;
      return [...new Set((members || []).map(m => m.user_id))];
    },
    enabled,
  });
}

/** Clientes externos com fallback cross-environment */
export function useExternalClients(editingClientId?: string | null) {
  const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
  const fallbackTable = isProductionEnvironment ? 'cliente_dev' : 'cliente';

  return useQuery({
    queryKey: ['external-clients-tax', clienteTable, editingClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('id, nome, setor_cliente')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      const list = data as ExternalClient[];

      if (editingClientId && !list.some(c => c.id === editingClientId)) {
        const { data: fallback } = await supabase
          .from(fallbackTable)
          .select('id, nome, setor_cliente')
          .eq('id', editingClientId)
          .maybeSingle();
        if (fallback) list.push(fallback as ExternalClient);
      }

      return list;
    },
  });
}

/** Contribuintes filtrados por cliente, com fallback cross-environment */
export function useContribuintes(clientId: string | null, editingContribuinteId?: string | null) {
  const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';
  const fallbackTable = isProductionEnvironment ? 'contribuinte_dev' : 'contribuinte';

  return useQuery({
    queryKey: ['contribuintes-for-project', contribuinteTable, clientId, editingContribuinteId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', clientId)
        .eq('excluido', false)
        .order('nome_razao_social');
      if (error) throw error;
      let list = data as ContribuinteOption[];

      if (list.length === 0) {
        const { data: fallback } = await supabase
          .from(fallbackTable)
          .select('id, nome_razao_social, cpf_cnpj')
          .eq('cliente_id', clientId)
          .eq('excluido', false)
          .order('nome_razao_social');
        if (fallback?.length) list = fallback as typeof list;
      }

      return list;
    },
    enabled: !!clientId,
  });
}

/** Ordens de serviço do cliente */
export function useClienteOrdens(clientId: string | null) {
  return useQuery({
    queryKey: ['cliente-os', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      // as any: tabela 'ordem_servico' ausente do schema tipado gerado
      const { data, error } = await (supabase.from('ordem_servico' as any) as any)
        .select('*')
        .eq('id_cliente', clientId)
        .eq('excluido', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OrdemServico[];
    },
    enabled: !!clientId,
  });
}

/** Profiles para dropdowns de tarefas (formato {id, name}) */
export function useTeamMembersForTasks() {
  return useQuery({
    queryKey: ['team-members-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      }));
    },
  });
}

/** Projetos tax para filtros */
export function useTaxProjectsForFilter() {
  return useQuery({
    queryKey: ['tax-projects-for-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_projects')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });
}
