import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
import { CalendarIcon, X } from 'lucide-react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
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
import { isProductionEnvironment } from '@/config/api';
import { RequiredMark } from '@/components/ui/required-mark';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['backlog', 'waiting_client', 'todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().optional(),
  assigned_to_name: z.string().optional(),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  is_recurring: z.boolean(),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  category: z.enum(['task', 'fixed_event']),
  parent_task_id: z.string().optional(),
  project_id: z.string().min(1, 'Projeto é obrigatório'),
  client_id: z.string().optional(),
  servico_id: z.string().optional(),
  contribuinte_id: z.string().optional(),
  estimated_hours: z.coerce.number().positive('Deve ser maior que 0').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
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
  const { user } = useAuth();
  const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
  const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';
  const createTask = useCreateFiscalTask();
  const updateTask = useUpdateFiscalTask();
  const isEditing = !!task;
  const isResettingRef = useRef(false);
  const prevProjectIdRef = useRef<string | undefined>(undefined);

  // Fetch projects for Tax area (include area_id for member filtering)
  const { data: projects = [] } = useQuery({
    queryKey: ['fiscal-projects-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_projects')
        .select('id, name, external_client_id, area_id')
        .eq('status', 'active')
        .order('name');
      return data || [];
    },
    enabled: open,
  });


  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-tasks', clienteTable],
    queryFn: async () => {
      const { data } = await supabase
        .from(clienteTable)
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      return data || [];
    },
    enabled: open,
  });


  const [tagInput, setTagInput] = useState('');
  const [showDraftNotice, setShowDraftNotice] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      is_recurring: false,
      category: 'task',
      tags: [],
    },
  });

  // Draft persistence – only active for new tasks (not editing)
  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'fiscal-task-draft',
    watchedValues,
    draftEnabled,
    user?.id,
  );

  const watchedProjectId = form.watch('project_id');
  const watchedClientId = form.watch('client_id');

  // Resolve estrutura_area_id from the selected project's tax_area
  const selectedProjectAreaId = useMemo(() => {
    if (!watchedProjectId) return null;
    const proj = projects.find(p => p.id === watchedProjectId);
    return proj?.area_id || null;
  }, [watchedProjectId, projects]);

  const { data: estruturaAreaId } = useQuery({
    queryKey: ['tax-area-estrutura', selectedProjectAreaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_areas')
        .select('estrutura_area_id')
        .eq('id', selectedProjectAreaId!)
        .single();
      return data?.estrutura_area_id || null;
    },
    enabled: open && !!selectedProjectAreaId,
  });

  // Fetch all members belonging to the estrutura area
  const { data: areaMemberIds = [] } = useQuery({
    queryKey: ['area-members-for-task', estruturaAreaId],
    queryFn: async () => {
      const ids = new Set<string>();

      const { data: leaders } = await supabase
        .from('estrutura_area_lideres')
        .select('user_id')
        .eq('area_id', estruturaAreaId!);
      leaders?.forEach(l => ids.add(l.user_id));

      const { data: equipes } = await supabase
        .from('estrutura_equipes')
        .select('id, sublider_id')
        .eq('area_id', estruturaAreaId!)
        .eq('is_active', true);
      equipes?.forEach(e => { if (e.sublider_id) ids.add(e.sublider_id); });

      const equipeIds = (equipes || []).map(e => e.id);
      if (equipeIds.length > 0) {
        const { data: membros } = await supabase
          .from('estrutura_equipe_membros')
          .select('user_id')
          .in('equipe_id', equipeIds);
        membros?.forEach(m => ids.add(m.user_id));
      }

      return Array.from(ids);
    },
    enabled: open && !!estruturaAreaId,
  });

  // Filtered team members for Responsável dropdown
  const filteredTeamMembers = useMemo(() => {
    if (!areaMemberIds.length) return teamMembers;
    return teamMembers.filter(m => areaMemberIds.includes(m.id));
  }, [teamMembers, areaMemberIds]);

  // Fetch contribuintes filtered by selected client
  const { data: contribuintesTask = [] } = useQuery({
    queryKey: ['contribuintes-for-task', contribuinteTable, watchedClientId],
    queryFn: async () => {
      if (!watchedClientId) return [];
      const { data } = await supabase
        .from(contribuinteTable)
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', watchedClientId)
        .order('nome_razao_social');
      return data || [];
    },
    enabled: open && !!watchedClientId,
  });

  // Clear contribuinte and project when client changes (only on user action, not during reset)
  useEffect(() => {
    if (isResettingRef.current) return;
    const current = form.getValues('contribuinte_id');
    if (current !== undefined) {
      form.setValue('contribuinte_id', undefined);
    }
    // Clear project if it doesn't belong to the new client
    const currentProject = form.getValues('project_id');
    if (currentProject && watchedClientId) {
      const proj = projects.find(p => p.id === currentProject);
      if (proj && proj.external_client_id !== watchedClientId) {
        form.setValue('project_id', '');
      }
    }
  }, [watchedClientId, form, projects]);

  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return projects;
    return projects.filter(p => p.external_client_id === watchedClientId);
  }, [projects, watchedClientId]);

  const filteredParentTasks = watchedProjectId
    ? parentTasks.filter(t => t.project_id === watchedProjectId)
    : parentTasks;

  // Fetch servicos linked to the selected project
  const { data: categorias = [] } = useQuery({
    queryKey: ['fiscal-task-servicos', watchedProjectId],
    queryFn: async () => {
      if (!watchedProjectId) return [];
      const { data } = await (supabase.from('project_servicos' as any) as any)
        .select('servico_id, servico:servicos_prestados(id, nome)')
        .eq('project_id', watchedProjectId);
      return (data || [])
        .map((r: any) => r.servico)
        .filter(Boolean) as { id: string; nome: string }[];
    },
    enabled: open && !!watchedProjectId,
  });

  // Effect A: When project changes by user action, clear dependent fields
  useEffect(() => {
    if (isResettingRef.current) {
      prevProjectIdRef.current = watchedProjectId;
      isResettingRef.current = false;
      return;
    }
    if (prevProjectIdRef.current === watchedProjectId) return;
    prevProjectIdRef.current = watchedProjectId;

    if (form.getValues('servico_id') !== undefined) {
      form.setValue('servico_id', undefined);
    }
    if (!defaultParentId && form.getValues('parent_task_id') !== undefined) {
      form.setValue('parent_task_id', undefined);
    }
  }, [watchedProjectId, form, defaultParentId]);

  // Effect B: Auto-fill client from project (runs when projects load or project changes)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (!watchedProjectId || projects.length === 0) return;
    const selectedProject = projects.find(p => p.id === watchedProjectId);
    if (selectedProject?.external_client_id) {
      const currentClient = form.getValues('client_id');
      if (currentClient !== selectedProject.external_client_id) {
        form.setValue('client_id', selectedProject.external_client_id);
      }
    }
  }, [watchedProjectId, projects, form]);

  useEffect(() => {
    if (task) {
      isResettingRef.current = true;
      form.reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to || undefined,
        assigned_to_name: task.assigned_to_name || undefined,
        start_date: (task as any).start_date ? parseDate((task as any).start_date) : undefined,
        due_date: task.due_date ? parseDate(task.due_date) : undefined,
        is_recurring: task.is_recurring,
        recurrence_type: task.recurrence_type || undefined,
        category: task.category,
        parent_task_id: task.parent_task_id || undefined,
        project_id: task.project_id || '',
        client_id: task.client_id || undefined,
        servico_id: task.servico_id || undefined,
        contribuinte_id: task.contribuinte_id || undefined,
        estimated_hours: (task as any).estimated_hours ?? '',
        tags: task.tags || [],
      });
    } else {
      isResettingRef.current = true;
      // Try to restore draft first
      const draft = restoreDraft();
      if (draft && draft.title) {
        form.reset(draft);
        setShowDraftNotice(true);
        setTimeout(() => setShowDraftNotice(false), 4000);
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
          project_id: parentTask?.project_id || '',
          client_id: parentTask?.client_id || undefined,
          servico_id: undefined,
          tags: [],
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, defaultParentId]);

  const handleAssigneeChange = (userId: string) => {
    if (userId === '_none') {
      form.setValue('assigned_to', undefined);
      form.setValue('assigned_to_name', undefined);
      return;
    }
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
      start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : undefined,
      is_recurring: values.is_recurring,
      recurrence_type: values.recurrence_type,
      category: values.category,
      parent_task_id: values.parent_task_id,
      project_id: values.project_id || undefined,
      client_id: values.client_id || undefined,
      servico_id: values.servico_id || undefined,
      contribuinte_id: values.contribuinte_id || undefined,
      estimated_hours: typeof values.estimated_hours === 'number' ? values.estimated_hours : undefined,
      tags: values.tags && values.tags.length > 0 ? values.tags : undefined,
    };

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({ id: task.id, ...input });
      } else {
        await createTask.mutateAsync(input);
      }
      clearDraft();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const isRecurring = form.watch('is_recurring');

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        clearDraft();
        prevProjectIdRef.current = undefined;
        setShowDraftNotice(false);
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription className="sr-only">Formulário de tarefa fiscal</DialogDescription>
          {showDraftNotice && (
            <p className="text-xs text-amber-600 mt-1 animate-pulse">
              Rascunho restaurado — clique em Salvar para confirmar.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 1. Cliente + Projeto */}
            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto <RequiredMark /></FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === '_none' ? '' : v)} 
                      value={field.value || '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {filteredProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contribuinte (filtered by client) */}
            <FormField
              control={form.control}
              name="contribuinte_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribuinte</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
                    value={field.value || '_none'}
                    disabled={!watchedClientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={watchedClientId ? "Selecione o contribuinte" : "Selecione um cliente primeiro"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
                      {contribuintesTask.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social} {c.cpf_cnpj && `(${c.cpf_cnpj})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Serviço (condicional) */}
            {watchedProjectId && (
              <FormField
                control={form.control}
                name="servico_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
                      value={field.value || '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
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
                  <FormLabel>Título <RequiredMark /></FormLabel>
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
                    <FormLabel>Status <RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="waiting_client">Pendente Cliente</SelectItem>
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
                    <FormLabel>Prioridade <RequiredMark /></FormLabel>
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

            {/* Horas estimadas */}
            <FormField
              control={form.control}
              name="estimated_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas estimadas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Ex: 4"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 6. Responsável */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select 
                    onValueChange={handleAssigneeChange} 
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
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

            {/* 7. Data de Início + Data de Vencimento */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
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
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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
                      {filteredParentTasks.map(pt => (
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

            {/* 11. Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const currentTags = field.value || [];
                const addTag = () => {
                  const trimmed = tagInput.trim();
                  if (trimmed && !currentTags.includes(trimmed)) {
                    field.onChange([...currentTags, trimmed]);
                  }
                  setTagInput('');
                };
                const removeTag = (tag: string) => {
                  field.onChange(currentTags.filter(t => t !== tag));
                };
                return (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite e pressione Enter..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addTag}>
                          Adicionar
                        </Button>
                      </div>
                      {currentTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {currentTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                              {tag}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeTag(tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
