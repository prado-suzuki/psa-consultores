import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  WorkPackage, 
  WorkPackageActivity, 
  WorkPackageRelation,
  WorkPackageFile,
  WorkPackageStatus,
  WorkPackageType,
  WorkPackagePriority,
  WorkPackageArea,
  WorkPackageStage
} from '@/types/workPackage';

interface WorkPackageFilters {
  status?: WorkPackageStatus[];
  area?: WorkPackageArea[];
  assigned_to?: string;
  created_by?: string;
  client_id?: string;
  project_id?: string;
  search?: string;
}

export function useWorkPackages(filters?: WorkPackageFilters) {
  return useQuery({
    queryKey: ['work-packages', filters],
    queryFn: async () => {
      let query = supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(first_name, last_name),
          responsible_profile:profiles!project_work_packages_responsible_fkey(first_name, last_name),
          project:projects(id, name),
          client:catalog_clients(id, name, color)
        `)
        .order('code', { ascending: true });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.area && filters.area.length > 0) {
        query = query.in('area', filters.area);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to match WorkPackage type
      return (data || []).map((item) => ({
        ...item,
        parent: null, // Parent needs separate fetch if needed
      })) as WorkPackage[];
    },
  });
}

export function useWorkPackage(id: string | undefined) {
  return useQuery({
    queryKey: ['work-package', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(first_name, last_name),
          responsible_profile:profiles!project_work_packages_responsible_fkey(first_name, last_name),
          project:projects(id, name),
          client:catalog_clients(id, name, color)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      
      // Fetch parent separately if exists
      let parentData = null;
      if (data.parent_id) {
        const { data: parent } = await supabase
          .from('project_work_packages')
          .select('id, code, title')
          .eq('id', data.parent_id)
          .single();
        parentData = parent;
      }
      
      return {
        ...data,
        parent: parentData,
      } as WorkPackage;
    },
    enabled: !!id,
  });
}

export function useWorkPackageActivities(workPackageId: string | undefined) {
  return useQuery({
    queryKey: ['work-package-activities', workPackageId],
    queryFn: async () => {
      if (!workPackageId) return [];
      const { data, error } = await supabase
        .from('work_package_activities')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('work_package_id', workPackageId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkPackageActivity[];
    },
    enabled: !!workPackageId,
  });
}

export function useWorkPackageRelations(workPackageId: string | undefined) {
  return useQuery({
    queryKey: ['work-package-relations', workPackageId],
    queryFn: async () => {
      if (!workPackageId) return { parents: [], children: [], related: [] };
      
      // Get relations where this package is the source
      const { data: sourceRelations, error: sourceError } = await supabase
        .from('work_package_relations')
        .select(`
          *,
          target:project_work_packages!work_package_relations_target_id_fkey(id, code, title, type, status)
        `)
        .eq('source_id', workPackageId);
      
      if (sourceError) throw sourceError;

      // Get relations where this package is the target
      const { data: targetRelations, error: targetError } = await supabase
        .from('work_package_relations')
        .select(`
          *,
          source:project_work_packages!work_package_relations_source_id_fkey(id, code, title, type, status)
        `)
        .eq('target_id', workPackageId);
      
      if (targetError) throw targetError;

      const parents: WorkPackageRelation[] = [];
      const children: WorkPackageRelation[] = [];
      const related: WorkPackageRelation[] = [];

      // Process source relations
      (sourceRelations || []).forEach((rel) => {
        if (rel.relation_type === 'filho') {
          children.push(rel as WorkPackageRelation);
        } else if (rel.relation_type === 'pai') {
          parents.push(rel as WorkPackageRelation);
        } else {
          related.push(rel as WorkPackageRelation);
        }
      });

      // Process target relations (inverse)
      (targetRelations || []).forEach((rel) => {
        if (rel.relation_type === 'filho') {
          parents.push(rel as WorkPackageRelation);
        } else if (rel.relation_type === 'pai') {
          children.push(rel as WorkPackageRelation);
        } else {
          related.push(rel as WorkPackageRelation);
        }
      });

      return { parents, children, related };
    },
    enabled: !!workPackageId,
  });
}

export function useWorkPackageChildren(parentId: string | undefined) {
  return useQuery({
    queryKey: ['work-package-children', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const { data, error } = await supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(first_name, last_name),
          responsible_profile:profiles!project_work_packages_responsible_fkey(first_name, last_name)
        `)
        .eq('parent_id', parentId)
        .order('code', { ascending: true });
      if (error) throw error;
      return data as WorkPackage[];
    },
    enabled: !!parentId,
  });
}

export function useCreateWorkPackage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<WorkPackage>) => {
      // Prepare insert data, excluding joined fields
      const insertData = {
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        priority: data.priority,
        area: data.area,
        stage: data.stage,
        assigned_to: data.assigned_to,
        responsible: data.responsible,
        parent_id: data.parent_id,
        project_id: data.project_id,
        client_id: data.client_id,
        estimated_hours: data.estimated_hours,
        start_date: data.start_date,
        due_date: data.due_date,
        created_by: user?.id,
      };
      
      const { data: result, error } = await supabase
        .from('project_work_packages')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      // Create activity log
      await supabase.from('work_package_activities').insert({
        work_package_id: result.id,
        user_id: user?.id,
        action_type: 'created',
        new_value: data.title,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Pacote de trabalho criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating work package:', error);
      toast.error('Erro ao criar pacote de trabalho');
    },
  });
}

export function useUpdateWorkPackage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: Partial<WorkPackage>; oldData?: Partial<WorkPackage> }) => {
      // Prepare update data, excluding joined fields
      const updateData: Record<string, unknown> = {};
      const allowedFields = [
        'title', 'description', 'type', 'status', 'priority', 'area', 'stage',
        'assigned_to', 'responsible', 'parent_id', 'project_id', 'client_id',
        'estimated_hours', 'spent_hours', 'remaining_hours', 'completion_percent',
        'start_date', 'due_date'
      ];
      
      allowedFields.forEach((key) => {
        if (key in data) {
          updateData[key] = data[key as keyof WorkPackage];
        }
      });
      
      const { data: result, error } = await supabase
        .from('project_work_packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Create activity logs for changed fields
      type ActivityType = 'status_change' | 'assignment' | 'field_update';
      const activities: Array<{
        work_package_id: string;
        user_id: string | undefined;
        action_type: ActivityType;
        field_name: string;
        old_value: string | null;
        new_value: string | null;
      }> = [];

      Object.keys(updateData).forEach((key) => {
        const oldValue = oldData?.[key as keyof WorkPackage];
        const newValue = data[key as keyof WorkPackage];
        
        if (oldValue !== newValue) {
          let actionType: ActivityType = 'field_update';
          if (key === 'status') actionType = 'status_change';
          if (key === 'assigned_to' || key === 'responsible') actionType = 'assignment';

          activities.push({
            work_package_id: id,
            user_id: user?.id,
            action_type: actionType,
            field_name: key,
            old_value: oldValue ? String(oldValue) : null,
            new_value: newValue ? String(newValue) : null,
          });
        }
      });

      if (activities.length > 0) {
        await supabase.from('work_package_activities').insert(activities);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      queryClient.invalidateQueries({ queryKey: ['work-package', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['work-package-activities', variables.id] });
      toast.success('Pacote de trabalho atualizado');
    },
    onError: (error) => {
      console.error('Error updating work package:', error);
      toast.error('Erro ao atualizar pacote de trabalho');
    },
  });
}

export function useDeleteWorkPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_work_packages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages'] });
      toast.success('Pacote de trabalho excluído');
    },
    onError: (error) => {
      console.error('Error deleting work package:', error);
      toast.error('Erro ao excluir pacote de trabalho');
    },
  });
}

export function useAddWorkPackageComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workPackageId, comment }: { workPackageId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('work_package_activities')
        .insert({
          work_package_id: workPackageId,
          user_id: user?.id,
          action_type: 'comment',
          comment,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-package-activities', variables.workPackageId] });
      toast.success('Comentário adicionado');
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    },
  });
}
