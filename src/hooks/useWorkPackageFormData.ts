import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfileOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ParentPackageOption {
  id: string;
  code: number;
  title: string;
  type: string;
}

/** Profiles para dropdown de atribuição */
export function useWPTeamMembers() {
  return useQuery<ProfileOption[]>({
    queryKey: ['team-members-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });
}

/** Clientes do catálogo para dropdown */
export function useWPClients() {
  return useQuery<ClientOption[]>({
    queryKey: ['catalog-clients-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

/** Projetos para dropdown */
export function useWPProjects() {
  return useQuery<ProjectOption[]>({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

/** Work packages pai (fases e épicos) para dropdown */
export function useWPParentPackages() {
  return useQuery<ParentPackageOption[]>({
    queryKey: ['parent-packages-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_work_packages')
        .select('id, code, title, type')
        .in('type', ['fase', 'epico'])
        .order('code');
      if (error) throw error;
      return data;
    },
  });
}
