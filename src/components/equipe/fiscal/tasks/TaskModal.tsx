import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  FiscalTask, 
  CreateFiscalTaskInput,
 useCreateFiscalTask,
 useUpdateFiscalTask
} from '@/hooks/useFiscalTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().optional(),
  assigned_to_name: z.string().optional(),
  due_date: z.date().optional(),
  due_time: z.string().optional(),
  is_recurring: z.boolean(),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  category: z.enum(['task', 'fixed_event']),
  parent_task_id: z.string().optional(),
  project_id: z.string().optional(),
  client_id: z.string().optional(),
  categoria_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: FiscalTask | null;
  teamMembers: { id: string; name: string }[];
  parentTasks?: FiscalTask[];
  defaultParentId?: string | null;
}

export const TaskModal = ({ 
  open, 
  onOpenChange, 
  task, 
  teamMembers,
  parentTasks = [],
  defaultParentId
}: TaskModalProps) => {
  const createTask = useCreateFiscalTask();
  const updateTask = useUpdateFiscalTask();
  const isEditing = !!task;

  // Fetch projects for Tax area
  const { data: projects = [] } = useQuery({
    queryKey: ['fiscal-projects-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      return data || [];
    },
    enabled: open,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      return data || [];
    },
    enabled: open,
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      is_recurring: false,
      category: 'task',
    },
  });

  const watchedProjectId = form.watch('project_id');

  // Fetch categories based on the selected project's area
  const { data: categorias = [] } = useQuery({
    queryKey: ['fiscal-task-categorias', watchedProjectId],
    queryFn: async () => {
      if (!watchedProjectId) return [];
      // Get project's area_id
      const { data: proj } = await supabase
        .from('tax_projects')
        .select('area_id')
        .eq('id', watchedProjectId)
        .single();
      if (!proj?.area_id) return [];
      // Get categories linked to that area
      const { data } = await supabase
        .from('tax_area_categorias')
        .select('categoria_id, categoria:tax_categorias(id, nome)')
        .eq('area_id', proj.area_id);
      return (data || [])
        .map((r: any) => r.categoria)
        .filter(Boolean) as { id: string; nome: string }[];
    },
    enabled: open && !!watchedProjectId,
  });

  // Clear categoria when project changes
  useEffect(() => {
    form.setValue('categoria_id', undefined);
  }, [watchedProjectId, form]);

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || undefined,
        assigned_to_name: task.assigned_to_name || undefined,
        due_date: task.due_date ? new Date(task.due_date) : undefined,
        due_time: task.due_time || undefined,
        is_recurring: task.is_recurring,
        recurrence_type: task.recurrence_type || undefined,
        category: task.category,
        parent_task_id: task.parent_task_id || undefined,
        project_id: task.project_id || undefined,
        client_id: task.client_id || undefined,
        categoria_id: task.categoria_id || undefined,
      });
    } else {
      const parentTask = defaultParentId ? parentTasks.find(t => t.id === defaultParentId) : null;
      form.reset({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        is_recurring: false,
        category: 'task',
        parent_task_id: defaultParentId || undefined,
        project_id: parentTask?.project_id || undefined,
        client_id: parentTask?.client_id || undefined,
        categoria_id: undefined,
      });
    }
  }, [task, form, defaultParentId, parentTasks]);

  const handleAssigneeChange = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    form.setValue('assigned_to', userId);
    form.setValue('assigned_to_name', member?.name || '');
  };

  const onSubmit = async (values: TaskFormValues) => {
    const input: CreateFiscalTaskInput = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assigned_to: values.assigned_to,
      assigned_to_name: values.assigned_to_name,
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      due_time: values.due_time,
      is_recurring: values.is_recurring,
      recurrence_type: values.recurrence_type,
      category: values.category,
      parent_task_id: values.parent_task_id,
      project_id: values.project_id || undefined,
      client_id: values.client_id || undefined,
      categoria_id: values.categoria_id || undefined,
    };

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({ id: task.id, ...input });
      } else {
        await createTask.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const isRecurring = form.watch('is_recurring');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 1. Projeto + Cliente */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)} 
                      value={field.value || '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)} 
                      value={field.value || '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 2. Categoria (condicional) */}
            {watchedProjectId && (
              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
                      value={field.value || '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhuma</SelectItem>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 3. Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da tarefa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4. Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva a tarefa..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 5. Status + Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">A Fazer</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="review">Revisão</SelectItem>
                        <SelectItem value="done">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 6. Responsável */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select 
                    onValueChange={handleAssigneeChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 7. Data + Horário */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 8. Evento Fixo + Recorrente */}
            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-2">Evento Fixo</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value === 'fixed_event'}
                        onCheckedChange={(checked) => 
                          field.onChange(checked ? 'fixed_event' : 'task')
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-2">Recorrente</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* 9. Frequência (condicional) */}
            {isRecurring && (
              <FormField
                control={form.control}
                name="recurrence_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 10. Tarefa Pai */}
            <FormField
              control={form.control}
              name="parent_task_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarefa Pai (subtarefa de)</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)} 
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma (tarefa principal)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Nenhuma</SelectItem>
                      {parentTasks.map(pt => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createTask.isPending || updateTask.isPending}
              >
                {isEditing ? 'Salvar' : 'Criar Tarefa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
