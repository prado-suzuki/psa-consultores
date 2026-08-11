import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { SEM_CLUSTER } from '@/lib/clusterFilter';

export interface DailyStandup {
  id: string;
  user_id: string;
  date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  blockers: string | null;
  created_at: string;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  // Bloqueio estruturado (T3) — opcionais pois os tipos gerados podem estar defasados
  // até a migração no Lovable rodar; o select('*') já traz os valores em runtime.
  blocked_deliverable_id?: string | null;
  blocker_owner?: string | null;
}

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface Sprint {
  id: string;
  name: string;
  project_id: string | null;
  // status/start_date alimentam a sugestão automática da sprint ativa mais atual.
  status?: string | null;
  start_date?: string | null;
}

export interface Project {
  id: string;
  name: string;
  cluster_id: string | null;
}

export interface Process {
  id: string;
  name: string;
  project_id: string | null;
}

interface EquipeDailyFilters {
  startDate: string;
  endDate: string;
  person: string;
  sprint: string;
}

interface UseDomainEquipeDailyOptions {
  userId: string | undefined;
  today: string;
  filters: EquipeDailyFilters;
  page: number;
  clusterFilter: string;
  clusterProjectIds: string[];
  clusterSprintIds: string[];
  clusterDataLoaded: boolean;
}

interface TeamMembersResult {
  roleProfiles?: TeamMember[];
  additionalProfiles?: TeamMember[];
}

interface StandupsResult {
  myStandup?: DailyStandup;
  standups?: DailyStandup[];
  hasNextPage?: boolean;
}

interface ListResult<T> {
  data?: T;
}

interface UpdateDailyStandupVariables {
  standupId: string;
  payload: TablesUpdate<'daily_standups'>;
}

export const DAILY_PAGE_SIZE = 20;

const referenceQueryOptions = {
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

const standupsQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

const equipeDailyKeys = {
  teamMembers: (userId: string | undefined) =>
    ['domain-equipe-daily', 'team-members', userId ?? null] as const,
  sprints: (userId: string | undefined) =>
    ['domain-equipe-daily', 'sprints', userId ?? null] as const,
  projects: (userId: string | undefined) =>
    ['domain-equipe-daily', 'projects', userId ?? null] as const,
  processes: (userId: string | undefined) =>
    ['domain-equipe-daily', 'processes', userId ?? null] as const,
  standups: (
    userId: string | undefined,
    { startDate, endDate, person, sprint }: EquipeDailyFilters,
    page: number,
    clusterFilter: string,
  ) =>
    [
      'domain-equipe-daily',
      'standups',
      userId ?? null,
      startDate,
      endDate,
      person,
      sprint,
      clusterFilter,
      page,
    ] as const,
};

export function useDomainEquipeDaily({
  userId,
  today,
  filters,
  page,
  clusterFilter,
  clusterProjectIds,
  clusterSprintIds,
  clusterDataLoaded,
}: UseDomainEquipeDailyOptions) {
  const teamMembersQuery = useQuery<TeamMembersResult>({
    queryKey: equipeDailyKeys.teamMembers(userId),
    queryFn: async () => {
      const result: TeamMembersResult = {};

      try {
        const [{ data: rolesData, error: rolesError }, { data: standupUsers, error: standupsError }] =
          await Promise.all([
            supabase
              .from('user_roles')
              .select('user_id')
              .in('role', ['team_member', 'admin']),
            supabase
              .from('daily_standups')
              .select('user_id')
              .order('date', { ascending: false })
              .limit(200),
          ]);

        if (rolesError) throw rolesError;
        if (standupsError) throw standupsError;

        const roleIds = new Set((rolesData ?? []).map((role) => role.user_id));
        const allIds = [...new Set([
          ...roleIds,
          ...(standupUsers ?? []).map((standup) => standup.user_id),
        ])];

        if (allIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', allIds);

          if (profilesError) throw profilesError;
          result.roleProfiles = (profilesData ?? []).filter((profile) => roleIds.has(profile.id));
          result.additionalProfiles = (profilesData ?? []).filter((profile) => !roleIds.has(profile.id));
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }

      return result;
    },
    enabled: !!userId,
    ...referenceQueryOptions,
  });

  const sprintsQuery = useQuery<ListResult<Sprint[]>>({
    queryKey: equipeDailyKeys.sprints(userId),
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('sprints')
          .select('id, name, project_id, status, start_date')
          .order('start_date', { ascending: false });

        return { data: data || [] };
      } catch (error) {
        console.error('Error fetching sprints:', error);
        return {};
      }
    },
    enabled: !!userId,
    ...referenceQueryOptions,
  });

  const projectsQuery = useQuery<ListResult<Project[]>>({
    queryKey: equipeDailyKeys.projects(userId),
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id, name, cluster_id')
          .order('name', { ascending: true });

        return { data: data || [] };
      } catch (error) {
        console.error('Error fetching projects:', error);
        return {};
      }
    },
    enabled: !!userId,
    ...referenceQueryOptions,
  });

  const processesQuery = useQuery<ListResult<Process[]>>({
    queryKey: equipeDailyKeys.processes(userId),
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('processes')
          .select('id, name, project_id')
          .order('name', { ascending: true });

        return { data: data || [] };
      } catch (error) {
        console.error('Error fetching processes:', error);
        return {};
      }
    },
    enabled: !!userId,
    ...referenceQueryOptions,
  });

  const standupsQuery = useQuery<StandupsResult>({
    queryKey: equipeDailyKeys.standups(userId, filters, page, clusterFilter),
    queryFn: async () => {
      const result: StandupsResult = {};
      if (!userId) return result;

      try {
        const myStandupQuery = supabase
          .from('daily_standups')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();

        let historyQuery = supabase
          .from('daily_standups')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });

        if (filters.startDate) historyQuery = historyQuery.gte('date', filters.startDate);
        if (filters.endDate) historyQuery = historyQuery.lte('date', filters.endDate);
        if (filters.sprint !== 'all') historyQuery = historyQuery.eq('sprint_id', filters.sprint);
        if (filters.person !== 'all') historyQuery = historyQuery.eq('user_id', filters.person);

        if (clusterFilter) {
          const clauses: string[] = [];
          if (clusterProjectIds.length > 0) {
            clauses.push(`project_id.in.(${clusterProjectIds.join(',')})`);
          }
          if (clusterSprintIds.length > 0) {
            clauses.push(`and(project_id.is.null,sprint_id.in.(${clusterSprintIds.join(',')}))`);
          }
          if (clusterFilter === SEM_CLUSTER) {
            clauses.push('and(project_id.is.null,sprint_id.is.null)');
          }
          historyQuery = clauses.length > 0
            ? historyQuery.or(clauses.join(','))
            : historyQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        const from = (page - 1) * DAILY_PAGE_SIZE;
        historyQuery = historyQuery.range(from, from + DAILY_PAGE_SIZE);

        const [myStandupResponse, historyResponse] = await Promise.all([
          myStandupQuery,
          historyQuery,
        ]);
        if (myStandupResponse.error) throw myStandupResponse.error;
        if (historyResponse.error) throw historyResponse.error;

        if (myStandupResponse.data) result.myStandup = myStandupResponse.data;
        const rows = historyResponse.data ?? [];
        result.standups = rows.slice(0, DAILY_PAGE_SIZE);
        result.hasNextPage = rows.length > DAILY_PAGE_SIZE;
      } catch (error) {
        console.error('Error fetching standups:', error);
      }

      return result;
    },
    enabled: !!userId && (!clusterFilter || clusterDataLoaded),
    ...standupsQueryOptions,
  });

  const updateDailyStandup = useMutation({
    mutationFn: async ({ standupId, payload }: UpdateDailyStandupVariables) => {
      const { error } = await supabase
        .from('daily_standups')
        .update(payload)
        .eq('id', standupId);

      if (error) throw error;
    },
    onError: () => undefined,
  });

  const insertDailyStandup = useMutation({
    mutationFn: async (payload: TablesInsert<'daily_standups'>) => {
      const { error } = await supabase.from('daily_standups').insert(payload);

      if (error) throw error;
    },
    onError: () => undefined,
  });

  const deleteDailyStandup = useMutation({
    mutationFn: async (standupId: string) => {
      const { error } = await supabase
        .from('daily_standups')
        .delete()
        .eq('id', standupId);

      if (error) throw error;
    },
    onError: () => undefined,
  });

  const fetchStandupsForExport = async () => {
    let query = supabase
      .from('daily_standups')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.sprint !== 'all') query = query.eq('sprint_id', filters.sprint);
    if (filters.person !== 'all') query = query.eq('user_id', filters.person);

    if (clusterFilter) {
      const clauses: string[] = [];
      if (clusterProjectIds.length > 0) clauses.push(`project_id.in.(${clusterProjectIds.join(',')})`);
      if (clusterSprintIds.length > 0) {
        clauses.push(`and(project_id.is.null,sprint_id.in.(${clusterSprintIds.join(',')}))`);
      }
      if (clusterFilter === SEM_CLUSTER) clauses.push('and(project_id.is.null,sprint_id.is.null)');
      query = clauses.length > 0
        ? query.or(clauses.join(','))
        : query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  };

  const copyFromYesterday = useMutation({
    mutationFn: async ({ copyUserId, copyDate }: { copyUserId: string; copyDate: string }) => {
      const { data, error } = await supabase
        .from('daily_standups')
        .select('will_do_today, date')
        .eq('user_id', copyUserId)
        .lt('date', copyDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onError: () => undefined,
  });

  return {
    teamMembersResult: teamMembersQuery.data,
    sprintsResult: sprintsQuery.data,
    projectsResult: projectsQuery.data,
    processesResult: processesQuery.data,
    standupsResult: standupsQuery.data,
    standupsFetching: standupsQuery.isFetching,
    refetchStandups: standupsQuery.refetch,
    updateDailyStandup,
    insertDailyStandup,
    deleteDailyStandup,
    fetchStandupsForExport,
    copyFromYesterday,
  };
}
