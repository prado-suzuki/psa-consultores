import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { ambientePorClienteQuery } from '@/hooks/useDomainAmbienteClientes';
import { isProjetoDoAmbiente } from '@/lib/ambienteScope';

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

/** @deprecated sublider_id removido de estrutura_equipes; mantido como no-op para compatibilidade */
export function useSubliderTeamMembers(_subliderIds: string[], _enabled: boolean) {
  return useQuery({
    queryKey: ['sublider-team-members-deprecated'],
    queryFn: async () => [] as string[],
    enabled: false,
  });
}

/** Clientes externos */
export function useExternalClients(editingClientId?: string | null) {
  return useQuery({
    queryKey: ['external-clients-tax', editingClientId],
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

      // Garante que o cliente em edição apareça mesmo se estiver inativo,
      // excluído ou em outro ambiente — necessário para edição via deep-link.
      if (editingClientId && !list.some(c => c.id === editingClientId)) {
        const { data: editing } = await supabase
          .from('cliente')
          .select('id, nome')
          .eq('id', editingClientId)
          .maybeSingle();
        if (editing) list.push({ id: editing.id, nome: editing.nome, setor_cliente: null });
      }

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

      return list as ExternalClient[];
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
      const list = (data as ContribuinteOption[]) || [];
      // Garante que o contribuinte em edição apareça mesmo se estiver excluído
      // ou em outro ambiente — necessário para edição via deep-link.
      if (editingContribuinteId && !list.some(c => c.id === editingContribuinteId)) {
        const { data: editing } = await supabase
          .from('contribuinte')
          .select('id, nome_razao_social, cpf_cnpj')
          .eq('id', editingContribuinteId)
          .maybeSingle();
        if (editing) list.push(editing as ContribuinteOption);
      }
      return list;
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
/**
 * Resolve cluster_id a partir de page_categories das áreas — reutilizável
 * ('tax', 'osg', etc.).
 *
 * Ordena antes de pegar a primeira, preferindo área ATIVA: mais de uma área pode
 * declarar a mesma categoria (no sandbox são seis para 'tax', cinco delas
 * inativas), e sem ordenação a escolha fica a cargo da ordem que o Postgres
 * devolver. Hoje todas apontam para o mesmo cluster, então funciona por sorte —
 * no dia em que uma área inativa de outro cluster aparecer, a tela troca de
 * escopo sozinha.
 *
 * Prefere ativa em vez de FILTRAR por ativa: se em algum ambiente a única área
 * da categoria estiver inativa, filtrar devolveria nulo e apagaria a tela. A
 * ordenação escolhe a ativa quando existe e continua funcionando quando não.
 *
 * `maybeSingle` no lugar de `single`: sem nenhuma área na categoria, `single`
 * ERRA, e o erro estava sendo descartado (`const { data } = ...`). O cluster
 * virava nulo em silêncio e a lista de projetos aparecia vazia — indistinguível
 * de "não há projetos". Agora o erro sobe para o React Query, que já tem estado
 * de falha para os consumidores.
 */
export function useClusterIdByPageCategory(category: string) {
  return useQuery({
    queryKey: ['cluster-id-by-page-category', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('cluster_id')
        .contains('page_categories', [category])
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
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

        // 4. Gestores das equipes (substitui antigos líderes de área)
        const lideresPromise = equipeIds.length > 0
          ? supabase
              .from('estrutura_equipes')
              .select('gestor_id')
              .in('id', equipeIds)
              .not('gestor_id', 'is', null)
          : Promise.resolve({ data: [] as { gestor_id: string }[] });

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
          ...(lideres || []).map(l => l.gestor_id as string),
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['org-projects-for-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('org_projects')
        .select('id, name, external_client_id')
        .order('name');

      // Mesmo escopo das listas: o filtro não oferece projeto do outro ambiente
      // (org_projects não tem coluna `ambiente` — ver lib/ambienteScope).
      const ambientePorCliente = await queryClient.fetchQuery(ambientePorClienteQuery());
      return (data || []).filter(project => isProjetoDoAmbiente(project, ambientePorCliente));
    },
  });
}

/** @deprecated Use useOrgProjectsForFilter */
export const useTaxProjectsForFilter = useOrgProjectsForFilter;
