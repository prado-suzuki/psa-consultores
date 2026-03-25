import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfDay, differenceInDays, parseISO, isAfter, isBefore, format, subMonths } from 'date-fns';

// ── helpers ──
function getPeriodDays(periodo: string) {
  if (periodo === '7d') return 7;
  if (periodo === '30d') return 30;
  if (periodo === '90d') return 90;
  return 30; // ciclo uses dynamic range
}

function getDateRange(periodo: string, cicloInicio?: string, cicloFim?: string) {
  if (periodo === 'ciclo' && cicloInicio && cicloFim) {
    return { from: cicloInicio, to: cicloFim };
  }
  const days = getPeriodDays(periodo);
  const from = startOfDay(subDays(new Date(), days)).toISOString();
  const to = new Date().toISOString();
  return { from, to };
}

// ── Types ──
export interface PerformanceProject {
  id: string;
  name: string;
  client_name: string | null;
  area_name: string | null;
  area_color: string | null;
  responsible_name: string | null;
  responsible_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  computed_status: 'em_dia' | 'em_risco' | 'atrasado';
}

export interface PerformanceMember {
  id: string;
  name: string;
  area: string | null;
  tasks_completed: number;
  tasks_on_time: number;
  tasks_total: number;
  projects_active: number;
  last_activity: string | null;
  meta_progress: number | null;
}

// ── Main hook ──
export const usePerformanceData = (periodo: string, area: string) => {
  const { user } = useAuth();

  // Preferences
  const prefsQuery = useQuery({
    queryKey: ['performance-prefs', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('performance_preferencias' as any) // table not yet in generated types
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user?.id,
  });

  // Active cycle
  const cicloQuery = useQuery({
    queryKey: ['perf-ciclo-ativo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ciclos_avaliacao')
        .select('*')
        .eq('status', 'em_andamento')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const ciclo = cicloQuery.data;
  const { from: periodFrom, to: periodTo } = getDateRange(
    periodo,
    ciclo?.data_inicio,
    ciclo?.data_fim
  );

  // Projects + tasks
  const projectsQuery = useQuery({
    queryKey: ['perf-projects', area, periodFrom],
    queryFn: async () => {
      let q = supabase
        .from('tax_projects')
        .select(`
          id, name, status, start_date, end_date,
          external_client_id,
          estrutura_area_id,
          cliente:cliente!tax_projects_external_client_id_fkey(nome),
          area:estrutura_areas!tax_projects_estrutura_area_id_fkey(name, color)
        `)
        .eq('is_active', true);

      if (area !== 'todas') {
        // filter by area name
        // We'll filter client-side since we can't easily filter join
      }

      const { data: projects, error } = await q;
      if (error) throw error;

      // Fetch tasks for these projects
      const projectIds = (projects || []).map((p: any) => p.id);
      let tasks: any[] = [];
      if (projectIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < projectIds.length; i += 50) {
          chunks.push(projectIds.slice(i, i + 50));
        }
        for (const chunk of chunks) {
          const { data } = await supabase
            .from('fiscal_tasks')
            .select('id, status, due_date, project_id, assigned_to, updated_at')
            .in('project_id', chunk);
          if (data) tasks.push(...data);
        }
      }

      // Fetch members
      let members: any[] = [];
      if (projectIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < projectIds.length; i += 50) {
          chunks.push(projectIds.slice(i, i + 50));
        }
        for (const chunk of chunks) {
          const { data } = await supabase
            .from('tax_project_members')
            .select('project_id, user_id, profiles:profiles!tax_project_members_user_id_fkey(first_name, last_name)')
            .in('project_id', chunk);
          if (data) members.push(...data);
        }
      }

      const now = new Date();

      const enriched: PerformanceProject[] = (projects || []).map((p: any) => {
        const pTasks = tasks.filter((t: any) => t.project_id === p.id);
        const total = pTasks.length;
        const completed = pTasks.filter((t: any) => t.status === 'concluida').length;
        const overdue = pTasks.filter((t: any) =>
          t.due_date && isBefore(parseISO(t.due_date), now) && t.status !== 'concluida'
        ).length;

        const overdueRatio = total > 0 ? overdue / total : 0;
        const completionRatio = total > 0 ? completed / total : 1;
        const endDate = p.end_date ? parseISO(p.end_date) : null;
        const daysLeft = endDate ? differenceInDays(endDate, now) : 999;

        let computedStatus: 'em_dia' | 'em_risco' | 'atrasado' = 'em_dia';
        if ((endDate && isBefore(endDate, now)) || overdueRatio > 0.4) {
          computedStatus = 'atrasado';
        } else if (overdueRatio > 0.2 || (daysLeft < 15 && completionRatio < 0.7)) {
          computedStatus = 'em_risco';
        }

        const projectMembers = members.filter((m: any) => m.project_id === p.id);
        const responsible = projectMembers[0];

        return {
          id: p.id,
          name: p.name,
          client_name: p.cliente?.nome || null,
          area_name: p.area?.name || null,
          area_color: p.area?.color || null,
          responsible_name: responsible?.profiles
            ? `${responsible.profiles.first_name} ${responsible.profiles.last_name}`.trim()
            : null,
          responsible_id: responsible?.user_id || null,
          start_date: p.start_date,
          end_date: p.end_date,
          status: p.status,
          total_tasks: total,
          completed_tasks: completed,
          overdue_tasks: overdue,
          computed_status: computedStatus,
        };
      }).filter((p: PerformanceProject) => {
        if (area === 'todas') return true;
        return p.area_name?.toLowerCase().includes(area.toLowerCase());
      });

      return enriched;
    },
  });

  // Tickets
  const ticketsQuery = useQuery({
    queryKey: ['perf-tickets', periodFrom],
    queryFn: async () => {
      const { data: allTickets } = await supabase
        .from('tickets')
        .select('id, status, created_at, updated_at');
      
      const open = (allTickets || []).filter((t: any) => t.status !== 'resolvido' && t.status !== 'fechado');
      const resolvedInPeriod = (allTickets || []).filter((t: any) =>
        (t.status === 'resolvido' || t.status === 'fechado') &&
        t.updated_at && isAfter(parseISO(t.updated_at), parseISO(periodFrom))
      );
      const pendingOver7 = open.filter((t: any) =>
        t.created_at && differenceInDays(new Date(), parseISO(t.created_at)) > 7
      );

      return { total: open.length, resolved: resolvedInPeriod.length, pendingOver7: pendingOver7.length };
    },
  });

  // Active members
  const membersQuery = useQuery({
    queryKey: ['perf-members', area],
    queryFn: async () => {
      const { data: allMembers } = await supabase
        .from('estrutura_equipe_membros')
        .select(`
          user_id,
          equipe:estrutura_equipes!estrutura_equipe_membros_equipe_id_fkey(
            area:estrutura_areas!estrutura_equipes_area_id_fkey(name)
          )
        `);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');

      return { members: allMembers || [], profiles: profiles || [] };
    },
  });

  // Metas do ciclo ativo
  const metasQuery = useQuery({
    queryKey: ['perf-metas', ciclo?.id],
    queryFn: async () => {
      if (!ciclo?.id) return [];
      const { data } = await supabase
        .from('metas')
        .select('*')
        .eq('ciclo_id', ciclo.id);
      return data || [];
    },
    enabled: !!ciclo?.id,
  });

  // Tasks with period filter for individual contribution
  const periodTasksQuery = useQuery({
    queryKey: ['perf-period-tasks', periodFrom, periodTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_tasks')
        .select('id, status, due_date, assigned_to, updated_at, project_id')
        .gte('updated_at', periodFrom)
        .lte('updated_at', periodTo);
      return data || [];
    },
  });

  // Process improvements for ROI
  const roiQuery = useQuery({
    queryKey: ['perf-roi'],
    queryFn: async () => {
      const { data } = await supabase
        .from('process_improvements')
        .select('*');
      return data || [];
    },
  });

  return {
    prefsQuery,
    cicloQuery,
    projectsQuery,
    ticketsQuery,
    membersQuery,
    metasQuery,
    periodTasksQuery,
    roiQuery,
    periodFrom,
    periodTo,
  };
};

// ── Save preferences ──
export const useSavePerformancePrefs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: { periodo_padrao?: string; area_padrao?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('performance_preferencias' as any) as any)
        .upsert({
          usuario_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'usuario_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-prefs'] });
    },
  });
};
