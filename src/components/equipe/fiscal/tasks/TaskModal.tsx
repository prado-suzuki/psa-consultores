import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
import { CalendarIcon } from 'lucide-react';
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
import { useExternalClients, useContribuintes } from '@/hooks/useTaxReferenceData';

import { RequiredMark } from '@/components/ui/required-mark';
import { useOrgProjectsList } from '@/hooks/useOrgProjects';
import { useEstruturaArea } from '@/hooks/useEstruturaArea';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  status: z.enum(['backlog', 'waiting_client', 'todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().min(1, 'Responsável é obrigatório'),
  assigned_to_name: z.string().optional(),
  start_date: z.date({ required_error: 'Data de Início é obrigatória' }),
  due_date: z.date({ required_error: 'Data de Vencimento é obrigatória' }),
  parent_task_id: z.string().optional(),
  project_id: z.string().min(1, 'Projeto é obrigatório'),
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  contribuinte_id: z.string().min(1, 'Contribuinte é obrigatório'),
  estimated_hours: z.coerce.number().positive('Deve ser maior que 0'),
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
  const createTask = useCreateFiscalTask();
  const updateTask = useUpdateFiscalTask();
  const isEditing = !!task;
  const isResettingRef = useRef(false);
  const prevProjectIdRef = useRef<string | undefined>(undefined);

  const [showDraftNotice, setShowDraftNotice] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
    },
  });

  // ── Hooks centralizados ──────────────────────────────────────────────
  const { data: projects = [] } = useOrgProjectsList(true);

  const watchedProjectId = form.watch('project_id') as string | undefined;
  
  const selectedProjectAreaId = useMemo(() => {
    if (!watchedProjectId) return null;
    const proj = projects.find(p => p.id === watchedProjectId);
    return proj?.estrutura_area_id || null;
  }, [watchedProjectId, projects]);

  const { allMemberIds: areaMemberIds } = useEstruturaArea(selectedProjectAreaId);

  // ── Queries ────────────────────────────────────────────────────────

  const { data: externalClients = [] } = useExternalClients();
  const clients = externalClients.map(c => ({ id: c.id, nome: c.nome }));

  // Draft persistence – only active for new tasks (not editing)
  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'fiscal-task-draft',
    watchedValues,
    draftEnabled,
    user?.id,
  );

  const watchedClientId = form.watch('client_id');

  // Filtered team members for Responsável dropdown
  const filteredTeamMembers = useMemo(() => {
    if (!areaMemberIds.length) return teamMembers;
    return teamMembers.filter(m => areaMemberIds.includes(m.id));
  }, [teamMembers, areaMemberIds]);

  // Contribuintes filtered by selected client
  const { data: contribuintesTask = [] } = useContribuintes(watchedClientId || null);

  // Clear contribuinte and project when client changes (only on user action, not during reset)
  useEffect(() => {
    if (isResettingRef.current) return;
    const current = form.getValues('contribuinte_id');
    if (current !== undefined) {
      form.setValue('contribuinte_id', undefined);
    }
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

  // Effect A: When project changes by user action, clear dependent fields
  useEffect(() => {
    if (isResettingRef.current) {
      prevProjectIdRef.current = watchedProjectId;
      isResettingRef.current = false;
      return;
    }
    if (prevProjectIdRef.current === watchedProjectId) return;
    prevProjectIdRef.current = watchedProjectId;

    if (!defaultParentId && form.getValues('parent_task_id') !== undefined) {
      form.setValue('parent_task_id', undefined);
    }
    // Clear assignee if not in the new area's member list
    const currentAssignee = form.getValues('assigned_to');
    if (currentAssignee && areaMemberIds.length > 0 && !areaMemberIds.includes(currentAssignee)) {
      form.setValue('assigned_to', undefined);
      form.setValue('assigned_to_name', undefined);
    }
  }, [watchedProjectId, form, defaultParentId, areaMemberIds]);

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
        parent_task_id: task.parent_task_id || undefined,
        project_id: task.project_id || '',
        client_id: task.client_id || undefined,
        contribuinte_id: task.contribuinte_id || undefined,
        estimated_hours: (task as any).estimated_hours ?? '',
      });
    } else {
      isResettingRef.current = true;
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
          parent_task_id: defaultParentId || undefined,
          project_id: parentTask?.project_id || '',
          client_id: parentTask?.client_id || undefined,
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
      parent_task_id: values.parent_task_id,
      project_id: values.project_id || undefined,
      client_id: values.client_id || undefined,
      contribuinte_id: values.contribuinte_id || undefined,
      estimated_hours: values.estimated_hours,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── SEÇÃO 1: CONTEXTO ─────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contexto</h3>

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente <RequiredMark /></FormLabel>
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

              <FormField
                control={form.control}
                name="contribuinte_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contribuinte <RequiredMark /></FormLabel>
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

            </div>

            {/* ── SEÇÃO 2: TAREFA ───────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tarefa</h3>

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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva a tarefa..." 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            {/* ── SEÇÃO 3: EXECUÇÃO ─────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Execução</h3>

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
                        {filteredTeamMembers.map(member => (
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

              <FormField
                control={form.control}
                name="estimated_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas estimadas <RequiredMark /></FormLabel>
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
                            selected={field.value}
                            onSelect={field.onChange}
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
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
