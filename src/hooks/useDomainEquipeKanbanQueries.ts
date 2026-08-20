import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchPerfisEquipeDigital } from '@/lib/equipeDigital';
import { fetchAllRows } from '@/lib/supabasePagination';
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

// O Kanban lê a tabela inteira, então precisa paginar: acima do limite de linhas do PostgREST as
// tarefas sumiam do quadro sem erro e sem critério, e o corte ainda quebrava a hierarquia (mãe sem
// as filhas virava card vazio, filha sem a mãe era promovida a card raiz). Ver supabasePagination.
async function fetchAllDeliverables() {
  // select('*') traz actual_hours mesmo enquanto o types.ts gerado não a reflete
  // (a lista explícita de colunas dá erro de tipo por causa do types.ts defasado).
  const { rows } = await fetchAllRows<EquipeKanbanDeliverable>((from, to) =>
    supabase
      .from('sprint_deliverables')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to),
  );
  // Erro segue ignorado aqui (contrato atual da tela): devolve o que já veio.
  return rows;
}

export function useEquipeKanbanInitialQuery() {
  return useQuery<EquipeKanbanInitialData>({
    queryKey: ['domain-equipe-kanban', 'initial'],
    queryFn: async () => {
      // Responsáveis são a equipe do cluster Digital, o mesmo recorte da tela de Sprint. Antes
      // vinham de `profiles_safe` cru, que devolve todo perfil do sistema: representante de
      // cliente aparecia no filtro. Ver lib/equipeDigital.
      const [sprintsRes, profiles, projectsRes, processesRes, deliverables] = await Promise.all([
        supabase.from('sprints').select('id, name, project_id').order('name', { ascending: true }),
        fetchPerfisEquipeDigital(),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('processes').select('id, name, project_id').order('name'),
        fetchAllDeliverables(),
      ]);
      return {
        sprints: (sprintsRes.data || []) as EquipeKanbanSprint[],
        profiles,
        projects: (projectsRes.data || []) as EquipeKanbanProject[],
        processes: (processesRes.data || []) as EquipeKanbanProcess[],
        deliverables,
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
