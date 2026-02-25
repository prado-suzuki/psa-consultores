 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 import { useAuditLog } from '@/hooks/useAuditLog';
 
export type FiscalTaskStatus = 'backlog' | 'waiting_client' | 'todo' | 'in_progress' | 'review' | 'done';
export type FiscalTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type FiscalTaskCategory = 'task' | 'fixed_event';
export type FiscalRecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
 
export interface FiscalTask {
   id: string;
   title: string;
   description: string | null;
   status: FiscalTaskStatus;
   priority: FiscalTaskPriority;
   assigned_to: string | null;
   assigned_to_name: string | null;
   created_by: string | null;
   due_date: string | null;
   due_time: string | null;
   is_recurring: boolean;
   recurrence_type: FiscalRecurrenceType | null;
   category: FiscalTaskCategory;
   tags: string[];
   
   parent_task_id: string | null;
  start_date: string | null;
  project_id: string | null;
  client_id: string | null;
  categoria_id: string | null;
  contribuinte_id: string | null;
   created_at: string;
   updated_at: string;
  // Joined data
  project?: { id: string; name: string } | null;
  client?: { id: string; nome: string } | null;
  categoria?: { id: string; nome: string } | null;
  contribuinte?: { id: string; nome_razao_social: string } | null;
 }
 
 export interface FiscalTaskComment {
   id: string;
   task_id: string;
   user_id: string | null;
   user_name: string | null;
   comment: string;
   is_system: boolean;
   created_at: string;
 }
 
export interface TaskFilters {
  search?: string;
  assignedTo?: string | 'mine' | 'all';
  status?: FiscalTaskStatus[];
  priority?: FiscalTaskPriority[];
  projectId?: string;
  clientId?: string;
  contribuinteId?: string;
  startDate?: string;
  endDate?: string;
}
 
 export interface CreateFiscalTaskInput {
   title: string;
   description?: string;
   status?: FiscalTaskStatus;
   priority?: FiscalTaskPriority;
   assigned_to?: string;
   assigned_to_name?: string;
    due_date?: string;
    due_time?: string;
    start_date?: string;
   is_recurring?: boolean;
   recurrence_type?: FiscalRecurrenceType;
   category?: FiscalTaskCategory;
   tags?: string[];
   parent_task_id?: string;
  project_id?: string;
  client_id?: string;
  categoria_id?: string;
  contribuinte_id?: string;
 }
 
 export const useFiscalTasks = (filters?: TaskFilters) => {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ['fiscal-tasks', filters],
     queryFn: async () => {
       let query = supabase
         .from('fiscal_tasks')
        .select(`
           *,
           project:tax_projects(id, name),
           client:cliente(id, nome),
           categoria:tax_categorias(id, nome),
           contribuinte:contribuinte(id, nome_razao_social)
         `)
         .order('created_at', { ascending: false });
 
       if (filters?.search) {
         query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
       }
 
       if (filters?.assignedTo === 'mine' && user) {
         query = query.eq('assigned_to', user.id);
       } else if (filters?.assignedTo && filters.assignedTo !== 'all') {
         query = query.eq('assigned_to', filters.assignedTo);
       }
 
       if (filters?.status && filters.status.length > 0) {
         query = query.in('status', filters.status);
       }
 
       if (filters?.priority && filters.priority.length > 0) {
         query = query.in('priority', filters.priority);
       }
 

       if (filters?.projectId) {
         query = query.eq('project_id', filters.projectId);
       }

       if (filters?.clientId) {
         query = query.eq('client_id', filters.clientId);
       }

       if (filters?.contribuinteId) {
         query = query.eq('contribuinte_id', filters.contribuinteId);
       }

       if (filters?.startDate) {
          query = query.gte('due_date', filters.startDate);
        }
  
        if (filters?.endDate) {
          query = query.lte('due_date', filters.endDate);
        }
 
        const { data, error } = await query;
        if (error) throw error;
        // Guard against self-referencing parent_task_id
        return (data || []).map(t => ({
          ...t,
          parent_task_id: t.parent_task_id === t.id ? null : t.parent_task_id,
        })) as FiscalTask[];
     },
   });
 };
 
 export const useCreateFiscalTask = () => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async (input: CreateFiscalTaskInput) => {
       const { data, error } = await supabase
         .from('fiscal_tasks')
         .insert({
           ...input,
           created_by: user?.id,
         })
         .select()
         .single();

       if (error) throw error;

       await logAction({
         area: 'tax', entity_type: input.parent_task_id ? 'subtask' : 'task',
         entity_id: data.id, entity_name: input.title, action: 'created',
       });

       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
       toast.success('Tarefa criada com sucesso');
     },
     onError: (error) => {
       toast.error('Erro ao criar tarefa: ' + error.message);
     },
   });
 };
 
 export const useUpdateFiscalTask = () => {
   const queryClient = useQueryClient();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async ({ id, ...updates }: Partial<FiscalTask> & { id: string }) => {
       // Fetch current state for diff
       const { data: current } = await supabase.from('fiscal_tasks').select('*').eq('id', id).single();

        const { data, error } = await supabase
          .from('fiscal_tasks')
          .update(updates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;

        // Build changed_fields
        const changedFields: Record<string, { old: unknown; new: unknown }> = {};
        if (current) {
          for (const key of Object.keys(updates)) {
            if (key === 'id') continue;
            const oldVal = (current as any)[key];
            const newVal = (updates as any)[key];
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
              changedFields[key] = { old: oldVal, new: newVal };
            }
          }
        }

        const entityName = data?.title || current?.title || 'Tarefa';
        const isSubtask = !!(data?.parent_task_id || current?.parent_task_id);

        await logAction({
          area: 'tax', entity_type: isSubtask ? 'subtask' : 'task',
          entity_id: id, entity_name: entityName, action: 'updated',
          changed_fields: Object.keys(changedFields).length > 0 ? changedFields : undefined,
        });

        return data || current;

        return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
       toast.success('Tarefa atualizada');
     },
     onError: (error) => {
       toast.error('Erro ao atualizar tarefa: ' + error.message);
     },
   });
 };
 
 export const useDeleteFiscalTask = () => {
   const queryClient = useQueryClient();
   const { logAction } = useAuditLog();

   return useMutation({
     mutationFn: async (id: string) => {
       // Get task info for audit log
       const { data: task } = await supabase.from('fiscal_tasks').select('title, parent_task_id').eq('id', id).single();

       const { error } = await supabase
         .from('fiscal_tasks')
         .delete()
         .eq('id', id);

       if (error) throw error;

       await logAction({
         area: 'tax', entity_type: task?.parent_task_id ? 'subtask' : 'task',
         entity_id: id, entity_name: task?.title || 'Tarefa excluída', action: 'deleted',
       });
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
       toast.success('Tarefa excluída');
     },
     onError: (error) => {
       toast.error('Erro ao excluir tarefa: ' + error.message);
     },
   });
 };
 
 export const useReassignFiscalTask = () => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
 
   return useMutation({
     mutationFn: async ({ taskId, newAssigneeId, newAssigneeName, comment, currentUserName }: {
       taskId: string;
       newAssigneeId: string;
       newAssigneeName: string;
       comment: string;
       currentUserName: string;
     }) => {
        // Fetch current task to get old assignee and title
        const { data: currentTask } = await supabase
          .from('fiscal_tasks')
          .select('title, assigned_to, assigned_to_name, parent_task_id')
          .eq('id', taskId)
          .single();

        const { error: updateError } = await supabase
          .from('fiscal_tasks')
          .update({
            assigned_to: newAssigneeId,
            assigned_to_name: newAssigneeName,
          })
          .eq('id', taskId);

        if (updateError) throw updateError;

        const { error: commentError } = await supabase
          .from('fiscal_task_comments')
          .insert({
            task_id: taskId,
            user_id: user?.id,
            user_name: currentUserName,
            comment: `Tarefa reatribuída para ${newAssigneeName}. Motivo: ${comment}`,
            is_system: true,
          });

        if (commentError) throw commentError;

        // Audit log for reassignment
        if (user?.id && currentTask) {
          await supabase.from('audit_logs').insert({
            area: 'tax',
            entity_type: currentTask.parent_task_id ? 'subtask' : 'task',
            entity_id: taskId,
            entity_name: currentTask.title || 'Tarefa',
            action: 'updated',
            changed_fields: {
              assigned_to: { old: currentTask.assigned_to, new: newAssigneeId },
              assigned_to_name: { old: currentTask.assigned_to_name, new: newAssigneeName },
            },
            performed_by: user.id,
            details: `Reatribuído para ${newAssigneeName}. Motivo: ${comment}`,
          });
        }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['fiscal-tasks'] });
       toast.success('Tarefa reatribuída com sucesso');
     },
     onError: (error) => {
       toast.error('Erro ao reatribuir tarefa: ' + error.message);
     },
   });
 };
 
 export const useFiscalTaskComments = (taskId: string) => {
   return useQuery({
     queryKey: ['fiscal-task-comments', taskId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('fiscal_task_comments')
         .select('*')
         .eq('task_id', taskId)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as FiscalTaskComment[];
     },
     enabled: !!taskId,
   });
 };
 
 export const useCreateFiscalTaskComment = () => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
 
   return useMutation({
     mutationFn: async ({ taskId, comment, userName }: { taskId: string; comment: string; userName: string }) => {
       const { data, error } = await supabase
         .from('fiscal_task_comments')
         .insert({
           task_id: taskId,
           user_id: user?.id,
           user_name: userName,
           comment,
           is_system: false,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['fiscal-task-comments', variables.taskId] });
       toast.success('Comentário adicionado');
     },
     onError: (error) => {
       toast.error('Erro ao adicionar comentário: ' + error.message);
     },
   });
 };
 
 export const useTaskStatusCounts = () => {
   const { data: tasks } = useFiscalTasks();
 
   const counts = {
     backlog: 0,
     todo: 0,
     in_progress: 0,
     review: 0,
     done: 0,
   };
 
   tasks?.forEach(task => {
     counts[task.status]++;
   });
 
   return counts;
 };