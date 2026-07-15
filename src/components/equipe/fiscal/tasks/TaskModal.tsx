import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { parseDate } from '@/lib/dateUtils';
import { AlertCircle, CalendarIcon, CheckCircle2, RotateCcw, Send, UserCheck } from 'lucide-react';
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
  OrgTask, 
  CreateOrgTaskInput,
  useCreateOrgTask,
  useUpdateOrgTask,
  useCreateOrgTaskComment,
} from '@/hooks/useOrgTasks';
import { useExternalClients, useContribuintes, useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import { AreaKey } from '@/config/areaCategories';

import { RequiredMark } from '@/components/ui/required-mark';
import { useOrgProjectClusterIds, useOrgProjectsList, useProjectMembers } from '@/hooks/useOrgProjects';
import { useReviewerCandidates } from '@/hooks/useReviewerCandidates';
import { statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  status: z.enum(['backlog', 'waiting_client', 'todo', 'in_progress', 'review', 'em_ajuste', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().min(1, 'Responsável é obrigatório'),
  assigned_to_name: z.string().optional(),
  reviewer_id: z.string().optional().nullable(),
  review_comment: z.string().optional(),
  start_date: z.date({ required_error: 'Data de Início é obrigatória' }),
  due_date: z.date({ required_error: 'Data de Vencimento é obrigatória' }),
  parent_task_id: z.string().optional(),
  project_id: z.string().min(1, 'Projeto é obrigatório'),
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  contribuinte_id: z.string().min(1, 'Contribuinte é obrigatório'),
  estimated_hours: z.coerce.number().positive('Deve ser maior que 0'),
  actual_hours: z.union([z.coerce.number(), z.literal('')]).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.status === 'done') {
    const n = typeof data.actual_hours === 'number' ? data.actual_hours : Number(data.actual_hours);
    if (!n || isNaN(n) || n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actual_hours'],
        message: 'Informe as horas realizadas',
      });
    }
  }
});

type TaskFormValues = z.infer<typeof taskSchema>;
type ReviewOutcome = 'approved' | 'adjustments';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: OrgTask | null;
  area: AreaKey;
  teamMembers: { id: string; name: string }[];
  parentTasks?: OrgTask[];
  defaultParentId?: string | null;
}

export const TaskModal = ({
  open,
  onOpenChange,
  task,
  area,
  teamMembers,
  parentTasks = [],
  defaultParentId
}: TaskModalProps) => {
  const { user } = useAuth();
  const createTask = useCreateOrgTask(area, { showToasts: false });
  const updateTask = useUpdateOrgTask(area, { showToasts: false });
  const createComment = useCreateOrgTaskComment({ showToasts: false });
  const isEditing = !!task;
  const isResettingRef = useRef(false);
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  const partiallySavedTaskIdRef = useRef<string | null>(null);

  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      reviewer_id: null,
      review_comment: '',
    },
  });

  // ── Hooks centralizados ──────────────────────────────────────────────
  const { data: projects = [] } = useOrgProjectsList(true);

  const watchedProjectId = form.watch('project_id') as string | undefined;
  const watchedClientId = form.watch('client_id') as string | undefined;
  const watchedStatus = form.watch('status');
  const watchedAssignedTo = form.watch('assigned_to');
  const watchedReviewerId = form.watch('reviewer_id');

  // Membros vinculados ao projeto selecionado (executor + líderes + membros
  // escolhidos no cadastro do projeto). É a fonte do dropdown "Responsável".
  const { data: projectMembers = [] } = useProjectMembers(watchedProjectId || undefined);
  const projectMemberIds = useMemo(
    () => projectMembers.map(m => m.user_id),
    [projectMembers],
  );

  // Perfis de todos os usuários — usado para resolver o nome de membros do
  // projeto que não pertencem ao cluster Tax (ex.: projetos multidisciplinares),
  // pois esses não vêm em `teamMembers`.
  const { data: allProfiles = [] } = useTeamProfilesSafe();
  const { data: projectClusterIds = [] } = useOrgProjectClusterIds(watchedProjectId);
  const {
    data: reviewerCandidates = [],
    isLoading: reviewerCandidatesLoading,
  } = useReviewerCandidates(projectClusterIds);
  const reviewerOptions = useMemo(
    () => reviewerCandidates.filter(candidate => candidate.id !== watchedAssignedTo),
    [reviewerCandidates, watchedAssignedTo],
  );

  const currentUserIsReviewer = !!task && isDelegatedOrgTaskReviewer(task, user?.id);
  const isReviewDelegation = watchedStatus === 'review' &&
    !!watchedReviewerId &&
    (task?.status !== 'review' || watchedReviewerId !== (task?.reviewer_id ?? null));
  const isReturnForAdjustment = watchedStatus === 'em_ajuste' && task?.status !== 'em_ajuste';
  const needsReviewComment = isReviewDelegation || isReturnForAdjustment;

  // ── Queries ────────────────────────────────────────────────────────

  // editingClientId considera tanto o client_id da tarefa quanto o atualmente
  // no form (pode ser preenchido via Effect B a partir do projeto) — garante
  // que o item apareça na lista mesmo se inativo/outro ambiente.
  const { data: externalClients = [] } = useExternalClients(
    watchedClientId || task?.client_id || null,
  );

  const clients = useMemo(() => {
    const list = externalClients.map(c => ({ id: c.id, nome: c.nome }));
    // Mescla o cliente do join da tarefa, se ainda não estiver na lista
    // (cobre o caso de cliente inativo/excluído/outro ambiente).
    if (task?.client && !list.some(c => c.id === task.client!.id)) {
      list.push({ id: task.client.id, nome: task.client.nome });
    }
    return list;
  }, [externalClients, task?.client?.id, task?.client?.nome]);

  // Draft persistence – only active for new tasks (not editing)
  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'fiscal-task-draft',
    watchedValues,
    draftEnabled,
    user?.id,
  );

  // Filtered team members for Responsável dropdown.
  // Restringe aos membros do projeto (executor + líderes + membros). Resolve o
  // nome via `teamMembers` e, para membros fora do cluster Tax (multidisciplinar),
  // recorre a `allProfiles`. Sem projeto selecionado (ou projeto legado sem
  // membros gravados) cai de volta para a lista completa.
  const filteredTeamMembers = useMemo(() => {
    if (!watchedProjectId || !projectMemberIds.length) return teamMembers;
    const teamMap = new Map(teamMembers.map(m => [m.id, m]));
    const profileMap = new Map(
      allProfiles.map(p => [p.id, `${p.first_name} ${p.last_name}`.trim()]),
    );
    return projectMemberIds
      .map(id => {
        const existing = teamMap.get(id);
        if (existing) return existing;
        const name = profileMap.get(id);
        return name ? { id, name } : null;
      })
      .filter((m): m is { id: string; name: string } => m !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [teamMembers, projectMemberIds, watchedProjectId, allProfiles]);

  // Contribuintes filtered by selected client
  const { data: contribuintesTask = [] } = useContribuintes(watchedClientId || null, task?.contribuinte_id ?? null);

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
    if (form.getValues('reviewer_id')) {
      form.setValue('reviewer_id', null);
    }
    // Clear assignee if not among the project's members
    const currentAssignee = form.getValues('assigned_to');
    if (currentAssignee && projectMemberIds.length > 0 && !projectMemberIds.includes(currentAssignee)) {
      form.setValue('assigned_to', undefined);
      form.setValue('assigned_to_name', undefined);
    }
  }, [watchedProjectId, form, defaultParentId, projectMemberIds]);

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
        reviewer_id: task.reviewer_id,
        review_comment: '',
        start_date: (task as any).start_date ? parseDate((task as any).start_date) : undefined,
        due_date: task.due_date ? parseDate(task.due_date) : undefined,
        parent_task_id: task.parent_task_id || undefined,
        project_id: task.project_id || '',
        client_id: task.client_id || undefined,
        contribuinte_id: task.contribuinte_id || undefined,
        estimated_hours: (task as any).estimated_hours ?? '',
        actual_hours: (task as any).actual_hours ?? '',
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
          reviewer_id: null,
          review_comment: '',
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
    const member = filteredTeamMembers.find(m => m.id === userId);
    form.setValue('assigned_to', userId);
    form.setValue('assigned_to_name', member?.name || '');
    if (form.getValues('reviewer_id') === userId) {
      form.setValue('reviewer_id', null);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearDraft();
      prevProjectIdRef.current = undefined;
      partiallySavedTaskIdRef.current = null;
      setShowDraftNotice(false);
      setReviewOutcome(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: TaskFormValues, outcome?: ReviewOutcome) => {
    const nextStatus = outcome ? 'em_ajuste' : values.status;
    if (currentUserIsReviewer && nextStatus === 'done') {
      form.setError('status', {
        type: 'manual',
        message: 'O revisor não pode concluir a tarefa. Devolva-a para ajustes.',
      });
      return;
    }

    const reviewComment = outcome === 'approved'
      ? 'Tarefa aprovada'
      : values.review_comment?.trim() ?? '';
    const submittingReviewDelegation = nextStatus === 'review' &&
      !!values.reviewer_id &&
      (task?.status !== 'review' || values.reviewer_id !== (task?.reviewer_id ?? null));
    const submittingReviewReturn = nextStatus === 'em_ajuste' && task?.status !== 'em_ajuste';
    const requiresTransitionComment = submittingReviewDelegation || submittingReviewReturn;

    if (requiresTransitionComment && !reviewComment) {
      form.setError('review_comment', {
        type: 'manual',
        message: submittingReviewDelegation
          ? 'Informe o que precisa ser revisado'
          : 'Informe o que precisa ser ajustado',
      });
      return;
    }

    const input: CreateOrgTaskInput = {
      title: values.title,
      description: values.description,
      status: nextStatus,
      priority: values.priority,
      assigned_to: values.assigned_to,
      assigned_to_name: values.assigned_to_name,
      reviewer_id: values.reviewer_id || null,
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : undefined,
      parent_task_id: values.parent_task_id,
      project_id: values.project_id || undefined,
      client_id: values.client_id || undefined,
      contribuinte_id: values.contribuinte_id || undefined,
      estimated_hours: values.estimated_hours,
      // Preserva actual_hours independente do status: horas realizadas são
      // histórico e não devem ser apagadas ao mover uma tarefa done para
      // outro status. Sem isso, o diff em useUpdateOrgTask incluía
      // actual_hours (8 → null) e o trigger org_tasks_team_member_status_only
      // (RLS-06) bloqueava team_member ao mudar apenas o status.
      actual_hours: (values.actual_hours === '' || values.actual_hours == null)
        ? null
        : Number(values.actual_hours),
    };

    try {
      let taskId = partiallySavedTaskIdRef.current;
      if (!taskId) {
        if (isEditing && task) {
          await updateTask.mutateAsync({
            id: task.id,
            ...input,
            reviewTransitionValidated: requiresTransitionComment,
          });
          taskId = task.id;
        } else {
          const createdTask = await createTask.mutateAsync(input);
          taskId = createdTask.id;
        }
        if (requiresTransitionComment) partiallySavedTaskIdRef.current = taskId;
      }

      if (requiresTransitionComment && taskId) {
        const reviewerName = reviewerCandidates.find(candidate => candidate.id === values.reviewer_id)?.name ||
          allProfiles
            .filter(profile => profile.id === values.reviewer_id)
            .map(profile => [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim())[0] ||
          'revisor';
        const systemComment = outcome === 'approved'
          ? 'Tarefa aprovada'
          : submittingReviewDelegation
          ? `Enviado para revisão de ${reviewerName}: ${reviewComment}`
          : `Devolvido para ajustes: ${reviewComment}`;
        const currentUserProfile = allProfiles.find(profile => profile.id === user?.id);
        const currentUserName = currentUserProfile
          ? [currentUserProfile.first_name, currentUserProfile.last_name].filter(Boolean).join(' ')
          : user?.user_metadata?.first_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
            : user?.email || 'Usuário';

        try {
          await createComment.mutateAsync({
            taskId,
            comment: systemComment,
            userName: currentUserName,
            isSystem: true,
          });
        } catch (commentError) {
          toast.error('A tarefa foi salva, mas o comentário obrigatório não foi registrado. Tente salvar novamente.');
          console.error('Error saving review comment:', commentError);
          return;
        }
      }

      partiallySavedTaskIdRef.current = null;
      setReviewOutcome(null);
      clearDraft();
      handleOpenChange(false);
      toast.success(isEditing ? 'Tarefa atualizada' : 'Tarefa criada com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tarefa');
      console.error('Error saving task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription className="sr-only">Formulário de tarefa fiscal</DialogDescription>
          {showDraftNotice && (
            <p className="text-xs text-warning mt-1 animate-pulse">
              Rascunho restaurado — clique em Salvar para confirmar.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(values => onSubmit(values))} className="space-y-6">

            {currentUserIsReviewer && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-100 p-2 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-purple-950 dark:text-purple-100">Revisão delegada a você</p>
                    <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-200/80">
                      Revise a tarefa de {task?.assigned_to_name || 'responsável'} e escolha uma ação ao final.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <fieldset disabled={currentUserIsReviewer} className="space-y-6">

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
                    <FormLabel>Descrição <RequiredMark /></FormLabel>
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
                          {statusList
                            .filter(status => !(currentUserIsReviewer && status.key === 'done'))
                            .map(status => (
                              <SelectItem key={status.key} value={status.key}>
                                {status.label}
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
                    <FormLabel>Responsável <RequiredMark /></FormLabel>
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

              {!currentUserIsReviewer && watchedStatus !== 'review' && watchedAssignedTo && (
                <button
                  type="button"
                  onClick={() => form.setValue('status', 'review', { shouldDirty: true })}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 p-4 text-left transition-colors hover:border-purple-500 hover:bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20 dark:hover:bg-purple-950/40"
                >
                  <span className="rounded-full bg-purple-100 p-2 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                    <Send className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-purple-950 dark:text-purple-100">Enviar para revisão</span>
                    <span className="block text-sm text-purple-800/70 dark:text-purple-200/70">
                      Escolha quem revisará e descreva os pontos de atenção.
                    </span>
                  </span>
                </button>
              )}

              {!currentUserIsReviewer && watchedStatus === 'review' && (
                <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900 dark:bg-purple-950/20">
                  <div className="flex items-center gap-2 text-purple-950 dark:text-purple-100">
                    <Send className="h-4 w-4" />
                    <p className="font-semibold">Preparar envio para revisão</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="reviewer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revisor</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === '_none' ? null : value)}
                          value={field.value || '_none'}
                          disabled={reviewerCandidatesLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={reviewerCandidatesLoading ? 'Carregando...' : 'Selecione'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">Sem revisor delegado</SelectItem>
                            {reviewerOptions.map(candidate => (
                              <SelectItem key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {needsReviewComment && (
                    <FormField
                      control={form.control}
                      name="review_comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>O que precisa ser revisado? <RequiredMark /></FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ''}
                              placeholder="Descreva de forma objetiva"
                              rows={3}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {!currentUserIsReviewer && watchedStatus === 'em_ajuste' && isReturnForAdjustment && (
                <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                  <div className="flex items-center gap-2 text-rose-950 dark:text-rose-100">
                    <RotateCcw className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">Devolver para ajustes</p>
                      <p className="text-sm font-normal text-rose-800/70 dark:text-rose-200/70">
                        Responsável: {form.getValues('assigned_to_name') || 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="review_comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O que precisa ser ajustado? <RequiredMark /></FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            placeholder="Descreva as correções necessárias"
                            rows={3}
                            className="bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {(() => {
                const isDone = form.watch('status') === 'done';
                const actualHoursValue = form.watch('actual_hours');
                const actualHoursError = form.formState.errors.actual_hours;
                const needsAttention = isDone && (!actualHoursValue || actualHoursError);

                return (
                  <div
                    className={cn(
                      'rounded-md transition-all',
                      needsAttention && 'border-2 border-warning bg-warning/5 p-3 dark:bg-warning/20 dark:border-warning',
                    )}
                  >
                    {isDone && (
                      <div className="flex items-start gap-2 mb-3 text-sm text-warning dark:text-warning/20">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          Tarefa concluída — informe as <strong>horas realizadas</strong> para conseguir salvar.
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
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

                      <FormField
                        control={form.control}
                        name="actual_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(needsAttention && 'text-warning dark:text-warning/10 font-semibold')}>
                              Horas realizadas {isDone && <RequiredMark />}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder={isDone ? 'Ex: 4' : 'Disponível ao concluir'}
                                disabled={!isDone}
                                autoFocus={isDone && !actualHoursValue}
                                className={cn(
                                  needsAttention && 'border-warning ring-2 ring-warning focus-visible:ring-warning bg-card dark:bg-background',
                                )}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })()}


              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início <RequiredMark /></FormLabel>
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
                      <FormLabel>Data de Vencimento <RequiredMark /></FormLabel>
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
            </fieldset>

            {currentUserIsReviewer && (
              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <div>
                  <p className="font-semibold">Resultado da revisão</p>
                  <p className="text-sm text-muted-foreground">A tarefa será devolvida ao responsável.</p>
                </div>

                {reviewOutcome === 'adjustments' && (
                  <FormField
                    control={form.control}
                    name="review_comment"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
                        <FormLabel>O que precisa ser ajustado? <RequiredMark /></FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            placeholder="Descreva as correções necessárias"
                            rows={3}
                            autoFocus
                            className="bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    disabled={createTask.isPending || updateTask.isPending || createComment.isPending}
                    onClick={form.handleSubmit(values => onSubmit(values, 'approved'))}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovar revisão
                  </Button>
                  <Button
                    type="button"
                    variant={reviewOutcome === 'adjustments' ? 'default' : 'outline'}
                    className={cn('gap-2', reviewOutcome === 'adjustments' && 'bg-rose-600 hover:bg-rose-700')}
                    onClick={() => setReviewOutcome('adjustments')}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Solicitar ajustes
                  </Button>
                </div>

                {reviewOutcome === 'adjustments' && (
                  <Button
                    type="button"
                    className="w-full bg-rose-600 hover:bg-rose-700"
                    disabled={createTask.isPending || updateTask.isPending || createComment.isPending}
                    onClick={form.handleSubmit(values => onSubmit(values, 'adjustments'))}
                  >
                    Confirmar devolução para ajustes
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              {!currentUserIsReviewer && (
                <Button
                  type="submit"
                  disabled={createTask.isPending || updateTask.isPending || createComment.isPending}
                >
                  {isEditing ? 'Salvar' : 'Criar'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
