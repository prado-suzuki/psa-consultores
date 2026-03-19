import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      // as any: tabela 'area_servicos' ausente do schema tipado gerado
      const { data, error } = await (supabase.from('area_servicos' as any) as any)
        .select('id, area_id, servico_id');
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

/** Clientes externos */
export function useExternalClients(editingClientId?: string | null) {
  return useQuery({
    queryKey: ['external-clients-tax', editingClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, setor_cliente')
        .eq('ativo', true)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return data as ExternalClient[];
    },
  });
}

/** Contribuintes filtrados por cliente */
export function useContribuintes(clientId: string | null, editingContribuinteId?: string | null) {
  return useQuery({
    queryKey: ['contribuintes-for-project', clientId, editingContribuinteId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', clientId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return data as ContribuinteOption[];
    },
    enabled: !!clientId,
  });
}

/** Ordens de serviço do cliente (fallback bidirecional via RPC) */
export function useClienteOrdens(clientId: string | null) {
  return useQuery({
    queryKey: ['cliente-os', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.rpc('get_ordens_by_client_name', {
        p_client_id: clientId,
      });
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
        .from('profiles_safe')
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
