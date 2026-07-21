import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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
  membersLoaded: boolean;
  filters: EquipeDailyFilters;
}

interface TeamMembersResult {
  roleProfiles?: TeamMember[];
  additionalProfiles?: TeamMember[];
}

interface StandupsResult {
  myStandup?: DailyStandup;
  standups?: DailyStandup[];
}

interface ListResult<T> {
  data?: T;
}

interface UpdateDailyStandupVariables {
  standupId: string;
  payload: TablesUpdate<'daily_standups'>;
}

const formerEffectQueryOptions = {
  staleTime: 0,
  gcTime: 0,
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
  ) =>
    [
      'domain-equipe-daily',
      'standups',
      userId ?? null,
      startDate,
      endDate,
      person,
      sprint,
    ] as const,
};

export function useDomainEquipeDaily({
  userId,
  today,
  membersLoaded,
  filters,
}: UseDomainEquipeDailyOptions) {
  const teamMembersQuery = useQuery<TeamMembersResult>({
    queryKey: equipeDailyKeys.teamMembers(userId),
    queryFn: async () => {
      const result: TeamMembersResult = {};

      try {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['team_member', 'admin']);

        if (rolesData && rolesData.length > 0) {
          const userIds = rolesData.map((role) => role.user_id);
          const { data: profilesData } = await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', userIds);

          if (profilesData) {
            result.roleProfiles = profilesData;
          }
        }

        const { data: standupUsers } = await supabase
          .from('daily_standups')
          .select('user_id');

        if (standupUsers && standupUsers.length > 0) {
          const uniqueUserIds = [...new Set(standupUsers.map((standup) => standup.user_id))];
          const { data: additionalProfiles } = await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', uniqueUserIds);

          if (additionalProfiles) {
            result.additionalProfiles = additionalProfiles;
          }
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }

      return result;
    },
    enabled: !!userId,
    ...formerEffectQueryOptions,
  });

  const sprintsQuery = useQuery<ListResult<Sprint[]>>({
    queryKey: equipeDailyKeys.sprints(userId),
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('sprints')
          .select('id, name, project_id')
          .order('start_date', { ascending: false });

        return { data: data || [] };
      } catch (error) {
        console.error('Error fetching sprints:', error);
        return {};
      }
    },
    enabled: !!userId,
    ...formerEffectQueryOptions,
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
    ...formerEffectQueryOptions,
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
    ...formerEffectQueryOptions,
  });

  const standupsQuery = useQuery<StandupsResult>({
    queryKey: equipeDailyKeys.standups(userId, filters),
    queryFn: async () => {
      const result: StandupsResult = {};
      if (!userId) return result;

      try {
        const { data: myData } = await supabase
          .from('daily_standups')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();

        if (myData) {
          result.myStandup = myData;
        }

        let query = supabase
          .from('daily_standups')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (filters.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }
        if (filters.sprint !== 'all') {
          query = query.eq('sprint_id', filters.sprint);
        }
        if (filters.person !== 'all') {
          query = query.eq('user_id', filters.person);
        }

        const { data: allStandups } = await query;
        result.standups = allStandups || [];
      } catch (error) {
        console.error('Error fetching standups:', error);
      }

      return result;
    },
    enabled: !!userId && membersLoaded,
    ...formerEffectQueryOptions,
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
    refetchStandups: standupsQuery.refetch,
    updateDailyStandup,
    insertDailyStandup,
    deleteDailyStandup,
    copyFromYesterday,
  };
}
