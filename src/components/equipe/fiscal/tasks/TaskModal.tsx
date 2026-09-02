import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { parseDate } from '@/lib/dateUtils';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  OrgTask,
  useCreateOrgTask,
  useUpdateOrgTask,
  useCreateOrgTaskComment,
} from '@/hooks/useOrgTasks';
import {
  useExternalClients,
  useContribuintes,
  useTeamProfilesSafe,
} from '@/hooks/useTaxReferenceData';
import { AreaKey } from '@/config/areaCategories';
import {
  useOrgProjectClusterIds,
  useOrgProjectsList,
  useProjectMembers,
} from '@/hooks/useOrgProjects';
import { useReviewerCandidates } from '@/hooks/useReviewerCandidates';
import { statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { resolveActiveReviewerName } from '@/lib/orgTaskReviewer';
import { taskSaveErrorMessage } from '@/lib/rlsMessages';
import {
  isReviewRichTextEmpty,
  serializeReviewRichText,
} from '@/components/equipe/fiscal/tasks/reviewRichTextFormat';
import {
  buildOrgTaskInput,
  buildReviewSystemComment,
  filterStatusOptions,
  filterTeamMembersByProject,
  mergeTaskClientOptions,
  resolveCommentAuthorName,
  resolveNextStatus,
  resolveReviewerName,
  taskSchema,
  type ReviewAction,
  type ReviewOutcome,
  type TaskFieldOptions,
  type TaskFormValues,
} from '@/lib/orgTaskForm';
import { OrgCommentsPanel } from '@/components/comentarios/OrgCommentsPanel';
import { ReviewActionDialog } from '@/components/equipe/fiscal/tasks/task-modal/ReviewActionDialog';
import { ReviewActionFeedback } from '@/components/equipe/fiscal/tasks/task-modal/ReviewActionFeedback';
import { TaskCreateFields } from '@/components/equipe/fiscal/tasks/task-modal/TaskCreateFields';
import { TaskEditActions } from '@/components/equipe/fiscal/tasks/task-modal/TaskEditActions';
import { TaskEditBody } from '@/components/equipe/fiscal/tasks/task-modal/TaskEditBody';
import { TaskEditHeader } from '@/components/equipe/fiscal/tasks/task-modal/TaskEditHeader';
import { TaskPropertyBar } from '@/components/equipe/fiscal/tasks/task-modal/TaskPropertyBar';

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
  const createComment = useCreateOrgTaskComment({ showToasts: false, area });
  const isEditing = !!task;
  const isResettingRef = useRef(false);
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  const partiallySavedTaskIdRef = useRef<string | null>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<ReviewOutcome | null>(null);
  // Incrementa a cada "Adicionar anexo": o painel de atividade observa o número
  // e leva o foco para o compositor, que é por onde o arquivo sobe.
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  // Escopo da busca pela primeira mensagem de erro em `handleInvalidSubmit`.
  const formRef = useRef<HTMLFormElement>(null);

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
  // Vem da tarefa salva, não do formulário: o `reviewer_id` do form é o que
  // está sendo escolhido no diálogo de revisão, e a faixa mostra quem já está
  // com ela. Os nomes saem de `profiles_safe` (`allProfiles`).
  const activeReviewerName = task ? resolveActiveReviewerName(task, allProfiles) : null;
  const statusOptions = useMemo(
    () =>
      filterStatusOptions(statusList, {
        isReviewer: currentUserIsReviewer,
        taskStatus: task?.status,
      }),
    [currentUserIsReviewer, task?.status],
  );

  // ── Queries ────────────────────────────────────────────────────────

  // editingClientId considera tanto o client_id da tarefa quanto o atualmente
  // no form (pode ser preenchido via Effect B a partir do projeto) — garante
  // que o item apareça na lista mesmo se inativo/outro ambiente.
  const { data: externalClients = [] } = useExternalClients(
    watchedClientId || task?.client_id || null,
  );

  const clients = useMemo(
    () => mergeTaskClientOptions(externalClients, task?.client),
    [externalClients, task?.client?.id, task?.client?.nome],
  );

  // Draft persistence – only active for new tasks (not editing)
  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'fiscal-task-draft',
    watchedValues,
    draftEnabled,
    user?.id,
  );

  const filteredTeamMembers = useMemo(
    () =>
      filterTeamMembersByProject({
        teamMembers,
        projectMemberIds,
        projectId: watchedProjectId,
        profiles: allProfiles,
      }),
    [teamMembers, projectMemberIds, watchedProjectId, allProfiles],
  );

  // Contribuintes filtered by selected client
  const { data: contribuintesTask = [] } = useContribuintes(
    watchedClientId || null,
    task?.contribuinte_id ?? null,
  );

  // Quem criou a tarefa, para o feed de Atividade abrir com esse marco. O nome
  // sai dos perfis que a tela já carrega — sem consulta nova — e cai para nulo
  // quando o criador não está entre eles (o painel exibe "outro usuário").
  const criadoPor = useMemo(() => {
    if (!task?.created_by || !task?.created_at) return undefined;
    const perfil = allProfiles.find((p) => p.id === task.created_by);
    const nomeDoPerfil = perfil
      ? [perfil.first_name, perfil.last_name].filter(Boolean).join(' ').trim()
      : '';
    const nome =
      nomeDoPerfil || teamMembers.find((m) => m.id === task.created_by)?.name || null;
    return { nome, em: task.created_at };
  }, [task?.created_by, task?.created_at, allProfiles, teamMembers]);

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

  // Resemeia o formulário a cada ABERTURA, não só quando o id muda. Sem `open`
  // aqui, reabrir a MESMA tarefa não disparava reset: o formulário ficava com
  // os valores de quando foi fechado e ignorava o que aconteceu no meio (status
  // trocado por arrasto no Kanban, pelo seletor da Lista/Tabela, horas
  // apontadas por outra pessoa). Além de mostrar dado velho, um Salvar ali
  // gravava o retrato antigo por cima do atual.
  useEffect(() => {
    if (!open) return;
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
  }, [open, task?.id, defaultParentId, defaultProjectId]);

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
      setComposerFocusSignal(0);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: TaskFormValues, outcome?: ReviewOutcome) => {
    const nextStatus = resolveNextStatus(outcome, values.status);
    if (currentUserIsReviewer && nextStatus === 'done') {
      form.setError('status', {
        type: 'manual',
        message: 'O revisor não pode concluir a tarefa. Devolva-a para ajustes.',
      });
      return;
    }

    const reviewComment =
      outcome === 'approved' ? 'Tarefa aprovada' : (values.review_comment?.trim() ?? '');
    // Sem revisor escolhido a delegação continua sendo delegação: é justamente o
    // caso a barrar. Antes o `!!values.reviewer_id` fazia a exigência sumir e a
    // tarefa ia para revisão sem revisor e sem uma linha do que revisar.
    const submittingReviewDelegation =
      nextStatus === 'review' &&
      (task?.status !== 'review' ||
        (values.reviewer_id ?? null) !== (task?.reviewer_id ?? null));
    const submittingReviewReturn = nextStatus === 'em_ajuste' && task?.status !== 'em_ajuste';
    const requiresTransitionComment = submittingReviewDelegation || submittingReviewReturn;

    // Salvamento que não veio dos botões de revisão (o status trocado na faixa
    // de propriedades, por exemplo) cede a vez ao diálogo: é lá que existem os
    // campos de revisor e de detalhamento.
    if (!outcome && requiresTransitionComment) {
      openReviewAction(submittingReviewDelegation ? 'send' : 'adjustments');
      return;
    }

    if (submittingReviewDelegation && !values.reviewer_id) {
      form.setError('reviewer_id', { type: 'manual', message: 'Selecione quem fará a revisão' });
      setReviewAction('send');
      return;
    }

    if (requiresTransitionComment && isReviewRichTextEmpty(reviewComment)) {
      form.setError('review_comment', {
        type: 'manual',
        message: submittingReviewDelegation
          ? 'Informe o que precisa ser revisado'
          : 'Informe o que precisa ser ajustado',
      });
      return;
    }

    const input = buildOrgTaskInput(values, nextStatus);

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
        const systemComment = buildReviewSystemComment({
          outcome,
          isDelegation: submittingReviewDelegation,
          reviewerName: resolveReviewerName(values.reviewer_id, reviewerCandidates, allProfiles),
          serializedComment: serializeReviewRichText(reviewComment),
        });

        try {
          await createComment.mutateAsync({
            taskId,
            comment: systemComment,
            userName: resolveCommentAuthorName(user, allProfiles),
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

  /**
   * Submit barrado por campo obrigatório vazio.
   *
   * Sem isto o Criar parecia inerte: o react-hook-form barra o envio, cada
   * mensagem nasce colada no próprio campo e nada mais acontece na tela. Quem
   * estava com o modal rolado no topo, e com o campo faltando lá embaixo, não
   * via aviso nenhum. O `shouldFocusError` também não socorre na Descrição,
   * porque o editor rich text é contenteditable e não registra ref focável.
   * Caso relatado em 31/08/2026 (Leonardo Alves, Descrição em branco).
   *
   * O toast diz que existe pendência e a rolagem leva até a primeira delas.
   * A busca é escopada ao formulário para não pegar mensagem de outro diálogo,
   * e roda no próximo tick porque as mensagens só existem no DOM depois do
   * render que o próprio handleSubmit dispara.
   */
  const handleInvalidSubmit = () => {
    toast.error('Preencha os campos obrigatórios destacados.');
    setTimeout(() => {
      const primeira = formRef.current?.querySelector<HTMLElement>(
        'p[id$="-form-item-message"]',
      );
      primeira?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 0);
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
      await form.handleSubmit((values) => onSubmit(values, 'send'), handleInvalidSubmit)();
      return;
    }
    await form.handleSubmit((values) => onSubmit(values, 'adjustments'), handleInvalidSubmit)();
  };

  const isSaving = createTask.isPending || updateTask.isPending || createComment.isPending;
  const fieldOptions: TaskFieldOptions = {
    clients,
    projects: filteredProjects,
    contribuintes: contribuintesTask,
    parentTasks: filteredParentTasks,
    teamMembers: filteredTeamMembers,
    statusOptions,
  };
  return (
    <>
      <AnimatePresence>
        {reviewFeedback && <ReviewActionFeedback action={reviewFeedback} />}
      </AnimatePresence>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          ref={dialogContentRef}
          // O primeiro elemento focável é um botão da barra do topo, e um Enter
          // logo após abrir salvaria ou fecharia o modal sem intenção. Na edição
          // o foco vai para o próprio diálogo (tabIndex -1 do Radix); na
          // criação, para o título, que é por onde o cadastro começa.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (isEditing) {
              dialogContentRef.current?.focus();
              return;
            }
            dialogContentRef.current
              ?.querySelector<HTMLInputElement>('input[name="title"]')
              ?.focus();
          }}
          className={cn(
            // `[&>button]:hidden` esconde o X padrão do DialogContent: nos dois
            // modos ele é renderizado dentro da barra do topo, junto das ações.
            'max-h-[94vh] gap-0 overflow-hidden p-0 [&>button]:hidden',
            isEditing
              ? 'h-[min(94vh,54rem)] w-[calc(100vw-1rem)] max-w-[78rem] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.9fr)]'
              : 'max-w-3xl',
          )}
        >
          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={form.handleSubmit((values) => onSubmit(values), handleInvalidSubmit)}
              className="flex min-h-0 flex-col bg-background"
            >
              {isEditing && task ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <TaskEditHeader
                    form={form}
                    options={fieldOptions}
                    disabled={currentUserIsReviewer}
                    actions={
                      <TaskEditActions
                        isSaving={isSaving}
                        isReviewer={currentUserIsReviewer}
                        canSendForReview={
                          watchedStatus !== 'review' && watchedAssignedTo === user?.id
                        }
                        onRequestAdjustments={() => openReviewAction('adjustments')}
                        onSendForReview={() => openReviewAction('send')}
                        onApprove={form.handleSubmit((values) => onSubmit(values, 'approved'), handleInvalidSubmit)}
                      />
                    }
                  />
                  <TaskPropertyBar
                    form={form}
                    options={fieldOptions}
                    onAssigneeChange={handleAssigneeChange}
                    reviewerName={activeReviewerName}
                    disabled={currentUserIsReviewer}
                  />
                  <TaskEditBody
                    form={form}
                    taskId={task.id}
                    projectId={task.project_id}
                    clientId={task.client_id}
                    area={area}
                    isReviewer={currentUserIsReviewer}
                    assignedToName={task.assigned_to_name}
                    teamMembers={filteredTeamMembers}
                    onAddAttachment={() => setComposerFocusSignal((signal) => signal + 1)}
                  />
                </div>
              ) : (
                <TaskCreateFields
                  form={form}
                  options={fieldOptions}
                  onAssigneeChange={handleAssigneeChange}
                  showDraftNotice={showDraftNotice}
                  isSaving={isSaving}
                  onCancel={() => handleOpenChange(false)}
                />
              )}
            </form>
          </Form>

          {isEditing && task && (
            <div className="min-h-[32rem] border-t lg:min-h-0 lg:border-l lg:border-t-0">
              <OrgCommentsPanel
                entityId={task.id}
                projectId={task.project_id}
                area={area}
                focusComposerSignal={composerFocusSignal}
                criadoPor={criadoPor}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReviewActionDialog
        action={reviewAction}
        form={form}
        taskTitle={task?.title}
        assignedToName={task?.assigned_to_name}
        reviewerOptions={reviewerOptions}
        reviewerOptionsLoading={reviewerCandidatesLoading}
        isSaving={isSaving}
        onClose={closeReviewAction}
        onConfirm={confirmReviewAction}
      />
    </>
  );
};
