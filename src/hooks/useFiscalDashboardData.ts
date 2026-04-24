import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FiscalDashProject {
  id: string;
  name: string;
  status: string | null;
  estrutura_area_id: string | null;
  external_client_id: string | null;
  contribuinte_id: string | null;
}

export interface FiscalDashTask {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  client_id: string | null;
  contribuinte_id: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  estimated_hours: number | null;
  due_date: string | null;
}

export interface FiscalDashContribuinte {
  id: string;
  cliente_id: string;
}

export function useFiscalDashProjects() {
  return useQuery<FiscalDashProject[]>({
    queryKey: ['fiscal-dash-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_projects')
        .select('id, name, status, estrutura_area_id, external_client_id, contribuinte_id')
        .order('name');
      if (error) throw error;
      return (data ?? []) as FiscalDashProject[];
    },
  });
}

export function useFiscalDashTasks() {
  return useQuery<FiscalDashTask[]>({
    queryKey: ['fiscal-dash-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_tasks')
        .select('id, title, status, project_id, client_id, contribuinte_id, assigned_to, assigned_to_name, estimated_hours, due_date')
        .is('parent_task_id', null);
      if (error) throw error;
      return (data ?? []) as FiscalDashTask[];
    },
  });
}

export function useFiscalDashContribuintes() {
  return useQuery<FiscalDashContribuinte[]>({
    queryKey: ['fiscal-dash-contribuintes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, cliente_id')
        .eq('excluido', false);
      if (error) throw error;
      return (data ?? []) as FiscalDashContribuinte[];
    },
  });
}

export interface FiscalDashClientName {
  id: string;
  nome: string;
}

/**
 * Map id→nome de TODOS os clientes (sem filtro de ativo/ambiente), usado
 * para resolver nomes em tarefas que possam referenciar clientes inativos
 * ou de outro ambiente. Use `useFiscalClientsList` para dropdowns.
 */
export function useFiscalDashClientNames() {
  return useQuery<FiscalDashClientName[]>({
    queryKey: ['fiscal-dash-client-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('excluido', false);
      if (error) throw error;
      return (data ?? []) as FiscalDashClientName[];
    },
  });
}
