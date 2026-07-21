import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  EquipeKanbanDeliverable,
  EquipeKanbanProcess,
  EquipeKanbanProfile,
  EquipeKanbanProject,
  EquipeKanbanSprint,
} from '@/lib/equipeKanban';

export interface EquipeKanbanInitialData {
  sprints: EquipeKanbanSprint[];
  profiles: EquipeKanbanProfile[];
  projects: EquipeKanbanProject[];
  processes: EquipeKanbanProcess[];
  deliverables: EquipeKanbanDeliverable[];
}

export function useEquipeKanbanInitialQuery() {
  return useQuery<EquipeKanbanInitialData>({
    queryKey: ['domain-equipe-kanban', 'initial'],
    queryFn: async () => {
      const [sprintsRes, profilesRes, projectsRes, processesRes, deliverablesRes] =
        await Promise.all([
          supabase
            .from('sprints')
            .select('id, name, project_id')
            .order('name', { ascending: true }),
          supabase.from('profiles_safe').select('id, first_name, last_name'),
          supabase.from('projects').select('id, name').order('name'),
          supabase.from('processes').select('id, name, project_id').order('name'),
          // select('*') traz actual_hours mesmo enquanto o types.ts gerado não a reflete
          // (a lista explícita de colunas dá erro de tipo por causa do types.ts defasado).
          supabase.from('sprint_deliverables').select('*'),
        ]);
      return {
        sprints: (sprintsRes.data || []) as EquipeKanbanSprint[],
        profiles: (profilesRes.data || []) as EquipeKanbanProfile[],
        projects: (projectsRes.data || []) as EquipeKanbanProject[],
        processes: (processesRes.data || []) as EquipeKanbanProcess[],
        deliverables: (deliverablesRes.data || []) as EquipeKanbanDeliverable[],
      };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    networkMode: 'always',
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
