import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkPackageType, WorkPackageStatus, WorkPackagePriority, WorkPackageArea, WorkPackageStage } from '@/types/workPackage';

export interface MyWorkPackage {
  id: string;
  code: number;
  title: string;
  description: string | null;
  type: WorkPackageType;
  status: WorkPackageStatus;
  priority: WorkPackagePriority;
  area: WorkPackageArea;
  stage: WorkPackageStage | null;
  due_date: string | null;
  start_date: string | null;
  completion_percent: number | null;
  estimated_hours: number | null;
  spent_hours: number | null;
  remaining_hours: number | null;
  assigned_to: string | null;
  responsible: string | null;
  created_by: string | null;
  client_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_profile: { first_name: string; last_name: string } | null;
  responsible_profile: { first_name: string; last_name: string } | null;
  created_by_profile: { first_name: string; last_name: string } | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

export function useMyWorkPackages() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-work-packages', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(first_name, last_name),
          responsible_profile:profiles!project_work_packages_responsible_fkey(first_name, last_name),
          created_by_profile:profiles!project_work_packages_created_by_fkey(first_name, last_name),
          client:catalog_clients!project_work_packages_client_id_fkey(id, name),
          project:projects!project_work_packages_project_id_fkey(id, name)
        `)
        .eq('area', 'fiscal')
        .or(`assigned_to.eq.${userId},responsible.eq.${userId},created_by.eq.${userId}`)
        .neq('status', 'concluido')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as MyWorkPackage[];
    },
    enabled: !!userId,
  });
}

export function useAllFiscalWorkPackages() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['all-fiscal-work-packages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(first_name, last_name),
          responsible_profile:profiles!project_work_packages_responsible_fkey(first_name, last_name),
          created_by_profile:profiles!project_work_packages_created_by_fkey(first_name, last_name),
          client:catalog_clients!project_work_packages_client_id_fkey(id, name),
          project:projects!project_work_packages_project_id_fkey(id, name)
        `)
        .eq('area', 'fiscal')
        .neq('status', 'concluido')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as MyWorkPackage[];
    },
    enabled: !!userId,
  });
}
