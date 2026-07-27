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

// O PostgREST corta a resposta no limite de linhas do projeto (padrão 1000 no Supabase).
// Como o Kanban lê a tabela inteira — e lia sem ORDER BY —, ao passar desse limite algumas
// tarefas simplesmente sumiam do quadro, sem erro nenhum e sem critério: a fatia devolvida
// mudava a cada consulta. Buscamos em páginas ordenadas por id até fechar o total.
const DELIVERABLES_PAGE_SIZE = 500;
const DELIVERABLES_MAX_PAGES = 40;

async function fetchAllDeliverables() {
  const all: EquipeKanbanDeliverable[] = [];
  for (let page = 0; page < DELIVERABLES_MAX_PAGES; page += 1) {
    const from = page * DELIVERABLES_PAGE_SIZE;
    // select('*') traz actual_hours mesmo enquanto o types.ts gerado não a reflete
    // (a lista explícita de colunas dá erro de tipo por causa do types.ts defasado).
    const { data, error, count } = await supabase
      .from('sprint_deliverables')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, from + DELIVERABLES_PAGE_SIZE - 1);
    // Erro segue ignorado aqui (contrato atual da tela): devolve o que já veio.
    if (error) break;
    const rows = (data || []) as EquipeKanbanDeliverable[];
    all.push(...rows);
    if (rows.length === 0 || all.length >= (count ?? all.length)) break;
  }
  return all;
}

export function useEquipeKanbanInitialQuery() {
  return useQuery<EquipeKanbanInitialData>({
    queryKey: ['domain-equipe-kanban', 'initial'],
    queryFn: async () => {
      const [sprintsRes, profilesRes, projectsRes, processesRes, deliverables] = await Promise.all([
        supabase.from('sprints').select('id, name, project_id').order('name', { ascending: true }),
        supabase.from('profiles_safe').select('id, first_name, last_name'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('processes').select('id, name, project_id').order('name'),
        fetchAllDeliverables(),
      ]);
      return {
        sprints: (sprintsRes.data || []) as EquipeKanbanSprint[],
        profiles: (profilesRes.data || []) as EquipeKanbanProfile[],
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
