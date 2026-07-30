import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { parseDate } from '@/lib/dateUtils';
import {
  AlertCircle,
  CalendarIcon,
  CheckCircle2,
  History,
  RotateCcw,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';

import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  OrgTask,
  CreateOrgTaskInput,
  useCreateOrgTask,
  useOrgTaskComments,
  useUpdateOrgTask,
  useCreateOrgTaskComment,
} from '@/hooks/useOrgTasks';
import {
  useExternalClients,
  useContribuintes,
  useTeamProfilesSafe,
} from '@/hooks/useTaxReferenceData';
import { AreaKey } from '@/config/areaCategories';

import { RequiredMark } from '@/components/ui/required-mark';
import {
  useOrgProjectClusterIds,
  useOrgProjectsList,
  useProjectMembers,
} from '@/hooks/useOrgProjects';
import { useReviewerCandidates } from '@/hooks/useReviewerCandidates';
import { statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import {
  ReviewRichTextContent,
  ReviewRichTextEditor,
} from '@/components/equipe/fiscal/tasks/ReviewRichText';
import {
  isReviewRichTextEmpty,
  serializeReviewRichText,
} from '@/components/equipe/fiscal/tasks/reviewRichTextFormat';

const taskSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    status: z.enum([
      'backlog',
      'waiting_client',
      'todo',
      'in_progress',
      'review',
      'em_ajuste',
      'done',
    ]),
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
    actual_hours: z
      .union([z.coerce.number(), z.literal('')])
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'done') {
      const n =
        typeof data.actual_hours === 'number' ? data.actual_hours : Number(data.actual_hours);
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
type ReviewOutcome = 'approved' | 'adjustments' | 'send';
type ReviewAction = 'send' | 'adjustments';

const reviewFeedbackConfig = {
  send: {
    label: 'Enviado para revisão!',
    icon: Send,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
    dot: 'bg-purple-400',
  },
  approved: {
    label: 'Revisão aprovada!',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
    dot: 'bg-emerald-400',
  },
  adjustments: {
    label: 'Ajustes solicitados!',
    icon: RotateCcw,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
    dot: 'bg-rose-400',
  },
} satisfies Record<ReviewOutcome, { label: string; icon: typeof Send; color: string; dot: string }>;

function ReviewActionFeedback({ action }: { action: ReviewOutcome }) {
  const config = reviewFeedbackConfig[action];
  const Icon = config.icon;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex flex-col items-center rounded-2xl border bg-background px-8 py-6 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        <div className="relative">
          {[0, 1, 2, 3].map((index) => (
            <motion.span
              key={index}
              className={cn('absolute h-2 w-2 rounded-full', config.dot)}
              initial={{ opacity: 0, x: 20, y: 20 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos((index * Math.PI) / 2) * 42 + 20,
                y: Math.sin((index * Math.PI) / 2) * 42 + 20,
              }}
              transition={{ duration: 0.55, delay: 0.08 }}
            />
          ))}
          <motion.div
            initial={{ scale: 0.4, rotate: -18 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.04 }}
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full',
              config.color,
            )}
          >
            <Icon className="h-7 w-7" />
            <Sparkles className="absolute -right-2 -top-2 h-4 w-4" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.16 }}
          className="mt-4 whitespace-nowrap text-sm font-semibold"
        >
          {config.label}
        </motion.p>
      </motion.div>
    </div>
  );
}

const getReviewEventType = (comment: string) => {
  if (comment.startsWith('Enviado para revisão')) return 'submitted';
  if (comment.startsWith('Devolvido para ajustes')) return 'adjustments';
  if (comment === 'Tarefa aprovada') return 'approved';
  return null;
};

const getReviewEventContent = (comment: string, type: string) => {
  if (type === 'submitted') {
    return comment.replace(/^Enviado para revisão(?: de [^:]+)?:\s*/, '');
  }
  if (type === 'adjustments') {
    return comment.replace(/^Devolvido para ajustes:\s*/, '');
  }
  return '';
};

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: OrgTask | null;
  area: AreaKey;
  teamMembers: { id: string; name: string }[];
  parentTasks?: OrgTask[];
  defaultParentId?: string | null;
  defaultProjectId?: string | null;
}

export const TaskModal = ({
  open,
  onOpenChange,
  task,
  area,
  teamMembers,
  parentTasks = [],
  defaultParentId,
  defaultProjectId,
}: TaskModalProps) => {
  const { user } = useAuth();
  const createTask = useCreateOrgTask(area, { showToasts: false });
  const updateTask = useUpdateOrgTask(area, { showToasts: false });
  const createComment = useCreateOrgTaskComment({ showToasts: false });
  const { data: taskComments = [] } = useOrgTaskComments(task?.id || '');
  const isEditing = !!task;
  const isResettingRef = useRef(false);
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  const partiallySavedTaskIdRef = useRef<string | null>(null);

  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<ReviewOutcome | null>(null);

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

  // Membros vinculados ao projeto selecionado (executor + líderes + membros
  // escolhidos no cadastro do projeto). É a fonte do dropdown "Responsável".
  const { data: projectMembers = [] } = useProjectMembers(watchedProjectId || undefined);
  const projectMemberIds = useMemo(() => projectMembers.map((m) => m.user_id), [projectMembers]);

  // Perfis de todos os usuários — usado para resolver o nome de membros do
  // projeto que não pertencem ao cluster Tax (ex.: projetos multidisciplinares),
  // pois esses não vêm em `teamMembers`.
  const { data: allProfiles = [] } = useTeamProfilesSafe();
  const { data: projectClusterIds = [] } = useOrgProjectClusterIds(watchedProjectId);
  const { data: reviewerCandidates = [], isLoading: reviewerCandidatesLoading } =
    useReviewerCandidates(projectClusterIds);
  const reviewerOptions = useMemo(
    () => reviewerCandidates.filter((candidate) => candidate.id !== watchedAssignedTo),
    [reviewerCandidates, watchedAssignedTo],
  );

  const currentUserIsReviewer =
    task?.status === 'review' && isDelegatedOrgTaskReviewer(task, user?.id);
  const reviewHistory = useMemo(
    () =>
      taskComments.flatMap((comment) => {
        const type = comment.is_system ? getReviewEventType(comment.comment) : null;
        return type ? [{ ...comment, type }] : [];
      }),
    [taskComments],
  );

  // ── Queries ────────────────────────────────────────────────────────

  // editingClientId considera tanto o client_id da tarefa quanto o atualmente
  // no form (pode ser preenchido via Effect B a partir do projeto) — garante
  // que o item apareça na lista mesmo se inativo/outro ambiente.
  const { data: externalClients = [] } = useExternalClients(
    watchedClientId || task?.client_id || null,
  );

  const clients = useMemo(() => {
    const list = externalClients.map((c) => ({ id: c.id, nome: c.nome }));
    // Mescla o cliente do join da tarefa, se ainda não estiver na lista
    // (cobre o caso de cliente inativo/excluído/outro ambiente).
    if (task?.client && !list.some((c) => c.id === task.client!.id)) {
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
    const teamMap = new Map(teamMembers.map((m) => [m.id, m]));
    const profileMap = new Map(
      allProfiles.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]),
    );
    return projectMemberIds
      .map((id) => {
        const existing = teamMap.get(id);
        if (existing) return existing;
        const name = profileMap.get(id);
        return name ? { id, name } : null;
      })
      .filter((m): m is { id: string; name: string } => m !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [teamMembers, projectMemberIds, watchedProjectId, allProfiles]);

  // Contribuintes filtered by selected client
  const { data: contribuintesTask = [] } = useContribuintes(
    watchedClientId || null,
    task?.contribuinte_id ?? null,
  );

  // Clear contribuinte and project when client changes (only on user action, not during reset)
  useEffect(() => {
    if (isResettingRef.current) return;
    const current = form.getValues('contribuinte_id');
    if (current !== undefined) {
      form.setValue('contribuinte_id', undefined);
    }
    const currentProject = form.getValues('project_id');
    if (currentProject && watchedClientId) {
      const proj = projects.find((p) => p.id === currentProject);
      if (proj && proj.external_client_id !== watchedClientId) {
        form.setValue('project_id', '');
      }
    }
  }, [watchedClientId, form, projects]);

  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return projects;
    return projects.filter((p) => p.external_client_id === watchedClientId);
  }, [projects, watchedClientId]);

  const filteredParentTasks = watchedProjectId
    ? parentTasks.filter((t) => t.project_id === watchedProjectId)
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
    if (
      currentAssignee &&
      projectMemberIds.length > 0 &&
      !projectMemberIds.includes(currentAssignee)
    ) {
      form.setValue('assigned_to', undefined);
      form.setValue('assigned_to_name', undefined);
    }
  }, [watchedProjectId, form, defaultParentId, projectMemberIds]);

  // Effect B: Auto-fill client from project (runs when projects load or project changes)
  useEffect(() => {
    if (isResettingRef.current) return;
    if (!watchedProjectId || projects.length === 0) return;
    const selectedProject = projects.find((p) => p.id === watchedProjectId);
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
        const parentTask = defaultParentId
          ? parentTasks.find((t) => t.id === defaultParentId)
          : null;
        form.reset({
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          reviewer_id: null,
          review_comment: '',
          parent_task_id: defaultParentId || undefined,
          project_id: parentTask?.project_id || defaultProjectId || '',
          client_id: parentTask?.client_id || undefined,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, defaultParentId, defaultProjectId]);

  const handleAssigneeChange = (userId: string) => {
    if (userId === '_none') {
      form.setValue('assigned_to', undefined);
      form.setValue('assigned_to_name', undefined);
      return;
    }
    const member = filteredTeamMembers.find((m) => m.id === userId);
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
      setReviewAction(null);
      setReviewFeedback(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: TaskFormValues, outcome?: ReviewOutcome) => {
    const nextStatus = outcome === 'send' ? 'review' : outcome ? 'em_ajuste' : values.status;
    if (currentUserIsReviewer && nextStatus === 'done') {
      form.setError('status', {
        type: 'manual',
        message: 'O revisor não pode concluir a tarefa. Devolva-a para ajustes.',
      });
      return;
    }

    const reviewComment =
      outcome === 'approved' ? 'Tarefa aprovada' : (values.review_comment?.trim() ?? '');
    const submittingReviewDelegation =
      nextStatus === 'review' &&
      !!values.reviewer_id &&
      (task?.status !== 'review' || values.reviewer_id !== (task?.reviewer_id ?? null));
    const submittingReviewReturn = nextStatus === 'em_ajuste' && task?.status !== 'em_ajuste';
    const requiresTransitionComment = submittingReviewDelegation || submittingReviewReturn;

    if (requiresTransitionComment && isReviewRichTextEmpty(reviewComment)) {
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
      actual_hours:
        values.actual_hours === '' || values.actual_hours == null
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
        const reviewerName =
          reviewerCandidates.find((candidate) => candidate.id === values.reviewer_id)?.name ||
          allProfiles
            .filter((profile) => profile.id === values.reviewer_id)
            .map((profile) =>
              [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
            )[0] ||
          'revisor';
        const systemComment =
          outcome === 'approved'
            ? 'Tarefa aprovada'
            : submittingReviewDelegation
              ? `Enviado para revisão de ${reviewerName}: ${serializeReviewRichText(reviewComment)}`
              : `Devolvido para ajustes: ${serializeReviewRichText(reviewComment)}`;
        const currentUserProfile = allProfiles.find((profile) => profile.id === user?.id);
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
          toast.error(
            'A tarefa foi salva, mas o comentário obrigatório não foi registrado. Tente salvar novamente.',
          );
          console.error('Error saving review comment:', commentError);
          return;
        }
      }

      partiallySavedTaskIdRef.current = null;
      setReviewAction(null);
      if (outcome) {
        setReviewFeedback(outcome);
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        setReviewFeedback(null);
      }
      clearDraft();
      handleOpenChange(false);
      toast.success(isEditing ? 'Tarefa atualizada' : 'Tarefa criada com sucesso');
    } catch (error) {
      toast.error(taskSaveErrorMessage(error));
      console.error('Error saving task:', error);
    }
  };

  const openReviewAction = (action: ReviewAction) => {
    form.clearErrors(['reviewer_id', 'review_comment']);
    form.setValue('review_comment', '');
    setReviewAction(action);
  };

  const closeReviewAction = () => {
    form.clearErrors(['reviewer_id', 'review_comment']);
    form.setValue('review_comment', '');
    setReviewAction(null);
  };

  const confirmReviewAction = async () => {
    const reviewComment = form.getValues('review_comment')?.trim() || '';
    const reviewerId = form.getValues('reviewer_id');

    if (reviewAction === 'send' && !reviewerId) {
      form.setError('reviewer_id', { type: 'manual', message: 'Selecione quem fará a revisão' });
      return;
    }
    if (isReviewRichTextEmpty(reviewComment)) {
      form.setError('review_comment', {
        type: 'manual',
        message:
          reviewAction === 'send'
            ? 'Informe o que precisa ser revisado'
            : 'Informe o que precisa ser ajustado',
      });
      return;
    }

    form.clearErrors(['reviewer_id', 'review_comment']);
    if (reviewAction === 'send') {
      await form.handleSubmit((values) => onSubmit(values, 'send'))();
      return;
    }
    await form.handleSubmit((values) => onSubmit(values, 'adjustments'))();
  };

  const isSaving = createTask.isPending || updateTask.isPending || createComment.isPending;

  return (
    <>
      <AnimatePresence>
        {reviewFeedback && <ReviewActionFeedback action={reviewFeedback} />}
      </AnimatePresence>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none',
            isEditing && reviewHistory.length > 0
              ? 'w-[calc(100vw-2rem)] max-w-2xl xl:max-w-[65rem] xl:grid xl:grid-cols-[minmax(0,42rem)_22rem] xl:items-start xl:gap-4 xl:overflow-visible xl:[&>button]:right-[24rem]'
              : 'max-w-2xl',
          )}
        >
          <div className="rounded-lg border bg-background p-6 shadow-lg xl:max-h-[90vh] xl:overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
              <DialogDescription className="sr-only">Formulário de tarefa fiscal</DialogDescription>
              {showDraftNotice && (
                <p className="text-xs text-warning mt-1 animate-pulse">
                  Rascunho restaurado — clique em Salvar para confirmar.
                </p>
              )}
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => onSubmit(values))}
                className="space-y-6"
              >
                {currentUserIsReviewer && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-purple-100 p-2 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-purple-950 dark:text-purple-100">
                          Revisão delegada a você
                        </p>
                        <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-200/80">
                          Revise a tarefa de {task?.assigned_to_name || 'responsável'} e escolha uma
                          ação ao final.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <fieldset disabled={currentUserIsReviewer} className="space-y-6">
                  {/* ── SEÇÃO 1: CONTEXTO ─────────────────────────────────── */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Contexto
                    </h3>

                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Cliente <RequiredMark />
                          </FormLabel>
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
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome}
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
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Projeto <RequiredMark />
                          </FormLabel>
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
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
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
                      name="contribuinte_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Contribuinte <RequiredMark />
                          </FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
                            value={field.value || '_none'}
                            disabled={!watchedClientId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    watchedClientId
                                      ? 'Selecione o contribuinte'
                                      : 'Selecione um cliente primeiro'
                                  }
                                />
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
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Tarefa
                    </h3>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Título <RequiredMark />
                          </FormLabel>
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
                          <FormLabel>
                            Descrição <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descreva a tarefa..." rows={2} {...field} />
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
                              {filteredParentTasks.map((pt) => (
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
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Execução
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Status <RequiredMark />
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusList
                                  .filter((status) => {
                                    if (currentUserIsReviewer && status.key === 'done')
                                      return false;
                                    if (status.key === 'review' || status.key === 'em_ajuste') {
                                      return status.key === task?.status;
                                    }
                                    return true;
                                  })
                                  .map((status) => (
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
                            <FormLabel>
                              Prioridade <RequiredMark />
                            </FormLabel>
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
                          <FormLabel>
                            Responsável <RequiredMark />
                          </FormLabel>
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
                              {filteredTeamMembers.map((member) => (
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

                    {(() => {
                      const isDone = form.watch('status') === 'done';
                      const actualHoursValue = form.watch('actual_hours');
                      const actualHoursError = form.formState.errors.actual_hours;
                      const needsAttention = isDone && (!actualHoursValue || actualHoursError);

                      return (
                        <div
                          className={cn(
                            'rounded-md transition-all',
                            needsAttention &&
                              'border-2 border-warning bg-warning/5 p-3 dark:bg-warning/20 dark:border-warning',
                          )}
                        >
                          {isDone && (
                            <div className="flex items-start gap-2 mb-3 text-sm text-warning dark:text-warning/20">
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>
                                Tarefa concluída — informe as <strong>horas realizadas</strong> para
                                conseguir salvar.
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="estimated_hours"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Horas estimadas <RequiredMark />
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      placeholder="Ex: 4"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === '' ? '' : Number(e.target.value),
                                        )
                                      }
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
                                  <FormLabel
                                    className={cn(
                                      needsAttention &&
                                        'text-warning dark:text-warning/10 font-semibold',
                                    )}
                                  >
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
                                        needsAttention &&
                                          'border-warning ring-2 ring-warning focus-visible:ring-warning bg-card dark:bg-background',
                                      )}
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === '' ? '' : Number(e.target.value),
                                        )
                                      }
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
                            <FormLabel>
                              Data de Início <RequiredMark />
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                      <span>Selecione</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar selected={field.value} onSelect={field.onChange} />
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
                            <FormLabel>
                              Data de Vencimento <RequiredMark />
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                      <span>Selecione</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar selected={field.value} onSelect={field.onChange} />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="sticky -bottom-6 z-20 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  {currentUserIsReviewer && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                      onClick={() => openReviewAction('adjustments')}
                      disabled={isSaving}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Solicitar ajustes
                    </Button>
                  )}
                  {isEditing &&
                    !currentUserIsReviewer &&
                    watchedStatus !== 'review' &&
                    watchedAssignedTo === user?.id && (
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
                        onClick={() => openReviewAction('send')}
                        disabled={isSaving}
                      >
                        <Send className="h-4 w-4" />
                        Enviar para revisão
                      </Button>
                    )}
                  {!currentUserIsReviewer && (
                    <Button type="submit" disabled={isSaving}>
                      {isEditing ? 'Salvar' : 'Criar'}
                    </Button>
                  )}
                  {currentUserIsReviewer && (
                    <Button
                      type="button"
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isSaving}
                      onClick={form.handleSubmit((values) => onSubmit(values, 'approved'))}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {isEditing && reviewHistory.length > 0 && (
            <aside className="mt-4 overflow-hidden rounded-xl border bg-background shadow-lg xl:mt-0 xl:max-h-[90vh]">
              <div className="border-b bg-muted/40 px-5 py-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Histórico da revisão</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Envios, aprovações e pedidos de ajuste
                </p>
              </div>

              <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
                <ol className="space-y-0">
                  {reviewHistory.map((event, index) => {
                    const isSubmitted = event.type === 'submitted';
                    const isApproved = event.type === 'approved';
                    const title = isSubmitted
                      ? 'Enviado para revisão'
                      : isApproved
                        ? 'Revisão aprovada'
                        : 'Retornado para ajustes';
                    const Icon = isSubmitted ? Send : isApproved ? CheckCircle2 : RotateCcw;
                    const content = getReviewEventContent(event.comment, event.type);

                    return (
                      <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
                        {index < reviewHistory.length - 1 && (
                          <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />
                        )}
                        <span
                          className={cn(
                            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                            isSubmitted &&
                              'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950',
                            isApproved &&
                              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950',
                            !isSubmitted &&
                              !isApproved &&
                              'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm font-semibold leading-5">{title}</p>
                          {content && (
                            <div className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                              <ReviewRichTextContent value={content} />
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground/80">
                            <span>{event.user_name || 'Usuário'}</span>
                            <span aria-hidden="true"> · </span>
                            <time dateTime={event.created_at}>
                              {format(new Date(event.created_at), 'dd MMM, HH:mm', {
                                locale: ptBR,
                              })}
                            </time>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewAction !== null}
        onOpenChange={(nextOpen) => !nextOpen && closeReviewAction()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-full p-2',
                  reviewAction === 'send'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
                )}
              >
                {reviewAction === 'send' ? (
                  <Send className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {reviewAction === 'send' ? 'Enviar para revisão' : 'Solicitar ajustes'}
                </DialogTitle>
                <DialogDescription className="mt-1 line-clamp-2">{task?.title}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {reviewAction === 'send' ? (
              <div className="space-y-2">
                <Label>
                  Revisor <RequiredMark />
                </Label>
                <Select
                  value={form.watch('reviewer_id') || ''}
                  onValueChange={(value) => {
                    form.setValue('reviewer_id', value);
                    form.clearErrors('reviewer_id');
                  }}
                  disabled={reviewerCandidatesLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        reviewerCandidatesLoading ? 'Carregando...' : 'Selecione o revisor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewerOptions.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.reviewer_id && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.reviewer_id.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Responsável pelos ajustes</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  {task?.assigned_to_name || 'Responsável não definido'}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="review-action-comment">
                {reviewAction === 'send'
                  ? 'Orientações para revisão'
                  : 'O que precisa ser ajustado?'}{' '}
                <RequiredMark />
              </Label>
              <ReviewRichTextEditor
                value={form.watch('review_comment') || ''}
                onChange={(value) => {
                  form.setValue('review_comment', value);
                  form.clearErrors('review_comment');
                }}
                placeholder={
                  reviewAction === 'send'
                    ? 'Descreva os pontos que merecem atenção'
                    : 'Descreva objetivamente as correções necessárias'
                }
                autoFocus={reviewAction === 'adjustments'}
              />
              {form.formState.errors.review_comment && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.review_comment.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReviewAction} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmReviewAction}
              disabled={isSaving}
              className={
                reviewAction === 'send'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }
            >
              {reviewAction === 'send' ? 'Confirmar envio' : 'Devolver para ajustes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
