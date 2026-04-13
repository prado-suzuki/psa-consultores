import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

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
  data_emissao: string | null;
  situacao: string | null;
  id_cliente: string;
  id_servico: string | null;
  /** @deprecated Legado — usar produtos_contratados */
  id_produto_segmento: string | null;
  excluido: boolean;
  created_at: string;
  produtos_contratados?: Array<{ id: string; produto_segmento_id: string }>;
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
        .eq('excluido', false)
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
/** Resolve cluster_id a partir de page_categories das áreas — reutilizável ('tax', 'osg', etc.) */
export function useClusterIdByPageCategory(category: string) {
  return useQuery({
    queryKey: ['cluster-id-by-page-category', category],
    queryFn: async () => {
      const { data } = await supabase
        .from('estrutura_areas')
        .select('cluster_id')
        .contains('page_categories', [category])
        .limit(1)
        .single();
      return data?.cluster_id ?? null;
    },
  });
}

/** Profiles para dropdowns de tarefas — se clusterId fornecido, filtra pela estrutura organizacional */
export function useTeamMembersForTasks(clusterId?: string) {
  return useQuery({
    queryKey: ['team-members-for-tasks', clusterId ?? 'all'],
    queryFn: async () => {
      let allowedIds: string[];

      if (clusterId) {
        // 1. Áreas do cluster
        const { data: areas } = await supabase
          .from('estrutura_areas')
          .select('id')
          .eq('cluster_id', clusterId)
          .eq('is_active', true);
        const areaIds = (areas || []).map(a => a.id);
        if (areaIds.length === 0) return [];

        // 2. Equipes dessas áreas
        const { data: equipes } = await supabase
          .from('estrutura_equipes')
          .select('id')
          .in('area_id', areaIds);
        const equipeIds = (equipes || []).map(e => e.id);

        // 3. Membros das equipes
        const membrosPromise = equipeIds.length > 0
          ? supabase.from('estrutura_equipe_membros').select('user_id').in('equipe_id', equipeIds)
          : Promise.resolve({ data: [] as { user_id: string }[] });

        // 4. Líderes das áreas
        const lideresPromise = supabase
          .from('estrutura_area_lideres')
          .select('user_id')
          .in('area_id', areaIds);

        // 5. Admins (sempre visíveis)
        const adminsPromise = supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const [{ data: membros }, { data: lideres }, { data: admins }] = await Promise.all([
          membrosPromise,
          lideresPromise,
          adminsPromise,
        ]);

        const combined = new Set([
          ...(membros || []).map(m => m.user_id),
          ...(lideres || []).map(l => l.user_id),
          ...(admins || []).map(a => a.user_id),
        ]);
        if (combined.size === 0) return [];

        // 6. Validar roles internas
        const { data: validRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['team_member', 'sublider', 'lider', 'admin'])
          .in('user_id', [...combined]);
        allowedIds = [...new Set((validRoles || []).map(r => r.user_id))];
      } else {
        // Sem cluster: todos com roles internas (comportamento original)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['team_member', 'sublider', 'lider', 'admin']);
        allowedIds = [...new Set((roles || []).map(r => r.user_id))];
      }

      if (allowedIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', allowedIds)
        .order('first_name');
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      }));
    },
  });
}

/** Projetos org para filtros */
export function useOrgProjectsForFilter() {
  return useQuery({
    queryKey: ['org-projects-for-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('org_projects')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });
}

/** @deprecated Use useOrgProjectsForFilter */
export const useTaxProjectsForFilter = useOrgProjectsForFilter;
