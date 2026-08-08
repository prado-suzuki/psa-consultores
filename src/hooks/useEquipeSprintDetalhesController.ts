import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSprints } from '@/hooks/useSprints';
import {
  useDomainEquipeSprintDetalhes,
  type SprintDetalhesDeliverable as Deliverable,
} from '@/hooks/useDomainEquipeSprintDetalhes';
import { getBlockingOpenSubtasks } from '@/lib/deliverableCompletion';
import { tarefaRichTextToPlain } from '@/lib/tarefaRichText';
import { parseExcelFile, processExcelData, type ImportPreview } from '@/lib/excelImporter';
import {
  buildExportRows,
  buildGanttData,
  buildTaskHierarchy,
  calculateSprintRisks,
  clampDatesToSprint,
  collectDeliverableSubtree,
  describeMoveEffect,
  filterDeliverables,
  groupGanttByPerson,
  siblingShifts,
  suggestNextTaskCode,
} from '@/lib/equipeSprintDetalhes';

export interface DeliverableForm {
  title: string;
  description: string;
  assigned_to: string;
  start_date: string;
  due_date: string;
  estimated_hours: string;
  actual_hours: string;
  status: string;
  parent_id: string;
  project_id: string;
  process_id: string;
  task_code: string;
}

const blankForm = (start = '', due = ''): DeliverableForm => ({
  title: '',
  description: '',
  assigned_to: '',
  start_date: start,
  due_date: due,
  estimated_hours: '',
  actual_hours: '',
  status: 'pending',
  parent_id: '',
  project_id: '',
  process_id: '',
  task_code: '',
});

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : String(error);

export function useEquipeSprintDetalhesController() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedTaskId = searchParams.get('taskId');
  const { toast } = useToast();
  // isLider no AuthContext é estrito e não engloba admin.
  const { isAdmin, isLider } = useAuth();
  const data = useDomainEquipeSprintDetalhes(id);
  const { sprint, deliverables, events, metrics, profiles, projects, processes, projectProcesses } =
    data;
  const handledError = useRef<unknown>(null);
  const handledNotFoundAt = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterYear, setFilterYear] = useState('__none__');
  const [filterMonth, setFilterMonth] = useState('__none__');
  const [filterMetricsPerson, setFilterMetricsPerson] = useState('__none__');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  // Aviso pendente de "concluir mãe com subtarefa aberta" — guarda a ação a executar se confirmar.
  const [completionWarning, setCompletionWarning] = useState<{
    taskTitle: string;
    openSubtasks: Deliverable[];
    confirm: () => Promise<void>;
  } | null>(null);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<DeliverableForm>(blankForm());
  const [createForm, setCreateForm] = useState<DeliverableForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingDeliverable, setMovingDeliverable] = useState<Deliverable | null>(null);
  const [moveTargetSprintId, setMoveTargetSprintId] = useState('');
  const [moving, setMoving] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [responsibleMapping, setResponsibleMapping] = useState<Record<string, string>>({});

  const showError = useCallback(
    (error: unknown) => {
      console.error('Error fetching sprint data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: errorMessage(error),
        variant: 'destructive',
      });
    },
    [toast],
  );
  const showNotFound = useCallback(() => {
    toast({ title: 'Sprint não encontrada', variant: 'destructive' });
    navigate('/equipe/sprints');
  }, [navigate, toast]);
  useEffect(() => {
    if (data.isLoading) return;
    if (data.error && handledError.current !== data.error) {
      handledError.current = data.error;
      showError(data.error);
      return;
    }
    if (data.isNotFound && handledNotFoundAt.current !== data.dataUpdatedAt) {
      handledNotFoundAt.current = data.dataUpdatedAt;
      showNotFound();
    }
  }, [data.dataUpdatedAt, data.error, data.isLoading, data.isNotFound, showError, showNotFound]);

  const getProfileName = useCallback(
    (userId: string | null) => {
      if (!userId) return 'Não atribuído';
      const profile = profiles.find((item) => item.id === userId);
      return profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Desconhecido';
    },
    [profiles],
  );
  const filteredDeliverables = useMemo(
    () =>
      filterDeliverables(deliverables, {
        responsible: filterResponsible,
        status: filterStatus,
        date: filterDate,
      }),
    [deliverables, filterDate, filterResponsible, filterStatus],
  );
  const hierarchicalTasks = useMemo(
    () => buildTaskHierarchy(filteredDeliverables),
    [filteredDeliverables],
  );
  const sprintRisks = useMemo(
    () => calculateSprintRisks(deliverables, metrics, sprint),
    [deliverables, metrics, sprint],
  );
  const ganttChartData = useMemo(
    () => buildGanttData(sprint, filteredDeliverables),
    [filteredDeliverables, sprint],
  );
  const ganttByPerson = useMemo(
    () => groupGanttByPerson(ganttChartData, sprint, getProfileName),
    [ganttChartData, getProfileName, sprint],
  );
  const parentTaskOptions = useMemo(
    () => deliverables.filter((item) => !item.parent_id),
    [deliverables],
  );
  const uniqueResponsibles = useMemo(
    () =>
      [...new Set(deliverables.map((item) => item.assigned_to).filter(Boolean))]
        .map((profileId) => profiles.find((profile) => profile.id === profileId))
        .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
        .map((profile) => ({
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
        })),
    [deliverables, profiles],
  );
  const deliverablesWithHours = useMemo(
    () =>
      deliverables.filter(
        (item) => item.estimated_hours && item.estimated_hours > 0 && item.due_date,
      ),
    [deliverables],
  );
  const availableYears = useMemo(
    () =>
      [
        ...new Set(
          deliverablesWithHours.map((item) => new Date(item.due_date).getFullYear().toString()),
        ),
      ].sort(),
    [deliverablesWithHours],
  );
  const availableMonths = useMemo(
    () =>
      [
        ...new Set(
          deliverablesWithHours
            .filter(
              (item) =>
                filterYear === '__none__' ||
                new Date(item.due_date).getFullYear().toString() === filterYear,
            )
            .map((item) => new Date(item.due_date).getMonth().toString()),
        ),
      ].sort((a, b) => Number(a) - Number(b)),
    [deliverablesWithHours, filterYear],
  );
  const availableMetricsPeople = useMemo(
    () =>
      [...new Set(deliverablesWithHours.map((item) => item.assigned_to).filter(Boolean))]
        .map((profileId) => ({ id: profileId as string, name: getProfileName(profileId) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [deliverablesWithHours, getProfileName],
  );
  const metricsFilteredDeliverables = useMemo(
    () =>
      filteredDeliverables.filter((item) => {
        if (!item.due_date) return true;
        const date = new Date(item.due_date);
        return (
          (filterYear === '__none__' || date.getFullYear().toString() === filterYear) &&
          (filterMonth === '__none__' || date.getMonth().toString() === filterMonth) &&
          (filterMetricsPerson === '__none__' || item.assigned_to === filterMetricsPerson)
        );
      }),
    [filterMetricsPerson, filterMonth, filterYear, filteredDeliverables],
  );
  const groupedEvents = useMemo(
    () =>
      events.reduce<Record<string, typeof events>>((grouped, event) => {
        (grouped[event.event_date] ??= []).push(event);
        return grouped;
      }, {}),
    [events],
  );
  const hasActiveFilters =
    filterResponsible !== 'all' ||
    filterStatus !== 'all' ||
    filterDate !== 'all' ||
    filterYear !== '__none__' ||
    filterMonth !== '__none__' ||
    filterMetricsPerson !== '__none__';

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const clearFilters = () => {
    setFilterResponsible('all');
    setFilterStatus('all');
    setFilterDate('all');
    setFilterYear('__none__');
    setFilterMonth('__none__');
    setFilterMetricsPerson('__none__');
  };
  const changeYear = (value: string) => {
    setFilterYear(value);
    setFilterMonth('__none__');
  };
  const closeImport = (open: boolean) => {
    setImportModalOpen(open);
    if (!open) resetImport();
  };
  const resetImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setResponsibleMapping({});
  };
  const selectParent = (form: DeliverableForm, parentId: string, preserveExisting = false) => {
    const parent = deliverables.find((item) => item.id === parentId);
    return {
      ...form,
      parent_id: parentId,
      task_code: parentId ? suggestNextTaskCode(deliverables, parentId) : '',
      project_id:
        preserveExisting && form.project_id
          ? form.project_id
          : parent?.project_id || form.project_id,
      process_id:
        preserveExisting && form.process_id
          ? form.process_id
          : parent?.process_id || form.process_id,
    };
  };
  const reorder = async (parentId: string, taskCode: string, excludeId?: string) => {
    const shifts = siblingShifts(deliverables, parentId, taskCode, excludeId);
    if (shifts.length) await data.reorderDeliverables.mutateAsync({ shifts });
  };

  const openEditModal = useCallback((item: Deliverable) => {
    setEditingDeliverable(item);
    setEditForm({
      title: item.title,
      description: item.description ?? '',
      assigned_to: item.assigned_to ?? '',
      start_date: item.start_date ?? sprint?.start_date ?? '',
      due_date: item.due_date,
      estimated_hours: item.estimated_hours?.toString() ?? '',
      actual_hours: item.actual_hours?.toString() ?? '',
      status: item.status || 'pending',
      parent_id: item.parent_id ?? '',
      project_id: item.project_id ?? '',
      process_id: item.process_id ?? '',
      task_code: item.task_code ?? '',
    });
    setEditModalOpen(true);
  }, [sprint?.start_date]);

  useEffect(() => {
    if (!deepLinkedTaskId || editModalOpen) return;
    const task = deliverables.find((item) => item.id === deepLinkedTaskId);
    if (task) openEditModal(task);
  }, [deepLinkedTaskId, deliverables, editModalOpen, openEditModal]);

  const changeEditModalOpen = (open: boolean) => {
    setEditModalOpen(open);
    if (!open && deepLinkedTaskId) {
      const next = new URLSearchParams(searchParams);
      next.delete('taskId');
      setSearchParams(next, { replace: true });
    }
  };
  const openCreateModal = () => {
    setCreateForm(blankForm(sprint?.start_date, sprint?.end_date));
    setCreateModalOpen(true);
  };
  const openCreateSubtaskModal = (parent: Deliverable) => {
    setCreateForm(selectParent(blankForm(sprint?.start_date, sprint?.end_date), parent.id));
    setCreateModalOpen(true);
  };

  // ---- Move de tarefa entre sprints -------------------------------------------------------------
  // A ação existe só para líder ou admin. É gate de tela: a RLS de UPDATE ainda aceita team_member,
  // então isto reduz uso acidental, não é barreira de banco.
  const canMoveDeliverable = isAdmin || isLider;
  const { data: allSprints } = useSprints();
  const moveSprintOptions = useMemo(
    () => (allSprints ?? []).filter((option) => option.id !== sprint?.id),
    [allSprints, sprint?.id],
  );
  const moveTargetSprint = useMemo(
    () => moveSprintOptions.find((option) => option.id === moveTargetSprintId) ?? null,
    [moveSprintOptions, moveTargetSprintId],
  );
  // Efeitos do move, calculados na mesma função que a gravação usa, para o texto não descrever uma
  // coisa e o banco fazer outra.
  const movePreview = useMemo(() => {
    if (!movingDeliverable || !moveTargetSprint) return null;
    const { descendantIds } = collectDeliverableSubtree(deliverables, movingDeliverable.id);
    const nextDates = clampDatesToSprint(movingDeliverable, moveTargetSprint);
    const adjustsSubtaskDates = deliverables
      .filter((item) => descendantIds.includes(item.id))
      .some((item) => {
        const childDates = clampDatesToSprint(item, moveTargetSprint);
        return (
          childDates.due_date !== item.due_date || childDates.start_date !== item.start_date
        );
      });
    const parent = movingDeliverable.parent_id
      ? deliverables.find((item) => item.id === movingDeliverable.parent_id)
      : undefined;
    return {
      descendantCount: descendantIds.length,
      lines: describeMoveEffect({
        targetSprintName: moveTargetSprint.name,
        // A mãe nunca vai junto: quem se move é esta tarefa, então o vínculo é desfeito.
        detachingFromParentTitle: movingDeliverable.parent_id
          ? (parent?.title ?? 'tarefa principal')
          : null,
        descendantCount: descendantIds.length,
        currentDates: {
          start_date: movingDeliverable.start_date,
          due_date: movingDeliverable.due_date,
        },
        nextDates,
        crossProject: Boolean(
          sprint?.project_id &&
            moveTargetSprint.project_id &&
            moveTargetSprint.project_id !== sprint.project_id,
        ),
        adjustsSubtaskDates,
      }),
    };
  }, [movingDeliverable, moveTargetSprint, deliverables, sprint?.project_id]);

  const openMoveModal = (item: Deliverable) => {
    setMovingDeliverable(item);
    setMoveTargetSprintId('');
    setMoveModalOpen(true);
  };
  const closeMoveModal = () => {
    setMoveModalOpen(false);
    setMovingDeliverable(null);
    setMoveTargetSprintId('');
  };
  const confirmMove = async () => {
    if (!movingDeliverable || !moveTargetSprint) return;
    setMoving(true);
    try {
      const result = await data.moveDeliverableToSprint.mutateAsync({
        deliverableId: movingDeliverable.id,
        targetSprint: moveTargetSprint,
      });
      toast({
        title: 'Tarefa movida',
        description: `Agora em "${moveTargetSprint.name}".`,
      });
      // Avisos que não são falha: a tarefa está na sprint certa, mas algo ficou para trás e precisa
      // ser visto por alguém.
      if (result.backlogWarning) {
        toast({ title: 'Atenção', description: result.backlogWarning, variant: 'destructive' });
      }
      if (result.crossSprintWarning) {
        toast({ title: 'Atenção', description: result.crossSprintWarning, variant: 'destructive' });
      }
      closeMoveModal();
    } catch (error) {
      // Sem onError na mutation de propósito: a mensagem de movimentação incompleta precisa chegar
      // ao usuário, senão ele não sabe que basta repetir. Não "padronizar" isso para silêncio.
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setMoving(false);
    }
  };
  const applyStatus = async (deliverableId: string, newStatus: string) => {
    try {
      await data.updateDeliverableStatus.mutateAsync({ deliverableId, newStatus });
      toast({ title: 'Status atualizado' });
    } catch (error) {
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    }
  };
  const updateStatus = async (deliverableId: string, newStatus: string) => {
    const target = deliverables.find((item) => item.id === deliverableId);
    const blocking = getBlockingOpenSubtasks(
      deliverables,
      deliverableId,
      newStatus,
      target?.status,
    );
    if (blocking.length > 0) {
      setCompletionWarning({
        taskTitle: target?.title ?? '',
        openSubtasks: blocking,
        confirm: () => applyStatus(deliverableId, newStatus),
      });
      return;
    }
    await applyStatus(deliverableId, newStatus);
  };
  const confirmCompletionWarning = async () => {
    if (!completionWarning) return;
    const { confirm } = completionWarning;
    try {
      setConfirmingCompletion(true);
      await confirm();
      setCompletionWarning(null);
    } finally {
      setConfirmingCompletion(false);
    }
  };
  const updateMetric = async (metricId: string, newValue: number) => {
    try {
      await data.updateMetric.mutateAsync({ metricId, newValue });
      toast({ title: 'Métrica atualizada' });
    } catch (error) {
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    }
  };
  const saveDeliverable = async () => {
    if (!editingDeliverable) return;
    const blocking = getBlockingOpenSubtasks(
      deliverables,
      editingDeliverable.id,
      editForm.status,
      editingDeliverable.status,
    );
    if (blocking.length > 0) {
      setCompletionWarning({
        taskTitle: editingDeliverable.title,
        openSubtasks: blocking,
        confirm: persistDeliverable,
      });
      return;
    }
    await persistDeliverable();
  };
  const persistDeliverable = async () => {
    if (!editingDeliverable) return;
    try {
      setSaving(true);
      const parentId = editForm.parent_id || null;
      if (
        parentId &&
        editForm.task_code &&
        (parentId !== editingDeliverable.parent_id ||
          editForm.task_code !== (editingDeliverable.task_code ?? ''))
      )
        await reorder(parentId, editForm.task_code, editingDeliverable.id);
      await data.updateDeliverable.mutateAsync({
        deliverableId: editingDeliverable.id,
        updates: {
          title: editForm.title,
          description: editForm.description || null,
          assigned_to: editForm.assigned_to || null,
          start_date: editForm.start_date || null,
          due_date: editForm.due_date,
          estimated_hours: editForm.estimated_hours
            ? Number.parseFloat(editForm.estimated_hours)
            : null,
          actual_hours: editForm.actual_hours
            ? Number.parseFloat(editForm.actual_hours)
            : null,
          status: editForm.status,
          completed_at: editForm.status === 'completed' ? new Date().toISOString() : null,
          project_id: editForm.project_id || null,
          process_id: editForm.process_id || null,
          parent_id: parentId,
          task_code: editForm.task_code || null,
        },
      });
      setEditModalOpen(false);
      setEditingDeliverable(null);
      toast({ title: 'Entregável atualizado' });
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };
  const createDeliverable = async () => {
    if (!sprint) return;
    try {
      setCreating(true);
      if (createForm.parent_id && createForm.task_code)
        await reorder(createForm.parent_id, createForm.task_code);
      await data.createDeliverable.mutateAsync({
        sprint_id: sprint.id,
        title: createForm.title,
        description: createForm.description || null,
        assigned_to: createForm.assigned_to || null,
        start_date: createForm.start_date || sprint.start_date,
        due_date: createForm.due_date || sprint.end_date,
        estimated_hours: createForm.estimated_hours
          ? Number.parseFloat(createForm.estimated_hours)
          : null,
        status: 'pending',
        parent_id: createForm.parent_id || null,
        project_id: createForm.project_id || null,
        process_id: createForm.process_id || null,
        task_code: createForm.task_code || null,
      });
      setCreateModalOpen(false);
      setCreateForm(blankForm());
      toast({ title: 'Tarefa criada com sucesso' });
    } catch (error) {
      toast({
        title: 'Erro ao criar tarefa',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };
  const deleteDeliverable = async () => {
    if (!editingDeliverable) return;
    try {
      setDeleting(true);
      await data.deleteDeliverable.mutateAsync(editingDeliverable.id);
      setEditModalOpen(false);
      setEditingDeliverable(null);
      setDeleteDialogOpen(false);
      toast({ title: 'Entregável excluído' });
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };
  const saveRetrospectiveReport = async (deliverable: Deliverable, report: string | null) => {
    try {
      await data.updateRetrospectiveReport.mutateAsync({
        deliverableId: deliverable.id,
        deliverableTitle: deliverable.title,
        entityType: deliverable.parent_id ? 'subtask' : 'task',
        previousReport: deliverable.retrospective_report ?? null,
        report,
      });
      toast({
        title: report ? 'Retrospectiva anexada' : 'Retrospectiva removida',
        description: report
          ? 'O texto markdown foi salvo na tarefa.'
          : 'O texto da retrospectiva foi removido da tarefa.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar retrospectiva',
        description: errorMessage(error),
        variant: 'destructive',
      });
      throw error;
    }
  };
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const preview = processExcelData(await parseExcelFile(file), profiles, [], []);
      setImportPreview(preview);
      setResponsibleMapping(
        Object.fromEntries(preview.unmappedResponsibles.map((name) => [name, ''])),
      );
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: errorMessage(error),
        variant: 'destructive',
      });
      resetImport();
    }
  };
  const fetchSprintData = async () => {
    const result = await data.refetch();
    if (result.error) {
      handledError.current = result.error;
      showError(result.error);
    } else if (result.data === null) {
      handledNotFoundAt.current = result.dataUpdatedAt;
      showNotFound();
    }
  };
  const handleImport = async () => {
    if (!sprint || !importPreview) return;
    try {
      setImporting(true);
      await data.importDeliverables.mutateAsync({
        sprint,
        taskGroups: importPreview.taskGroups,
        responsibleMapping,
        profiles,
      });
      await fetchSprintData();
      setImportModalOpen(false);
      resetImport();
      toast({
        title: 'Importação concluída',
        description: `${importPreview.totalTasks} tarefas e ${importPreview.totalSubtasks} subtarefas importadas`,
      });
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };
  const handleExportExcel = () => {
    if (!sprint || !deliverables.length) {
      toast({ title: 'Nenhum entregável para exportar', variant: 'destructive' });
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(
      buildExportRows(sprint, deliverables, profiles, projects, processes),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Entregáveis');
    const fileName = `${sprint.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(book, fileName);
    toast({ title: 'Exportação concluída', description: `Arquivo ${fileName} gerado` });
  };
  const relatedDeliverables = (name: string, category: string | null) => {
    const keywords = `${name} ${category ?? ''}`
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 3);
    return deliverables.filter((item) =>
      keywords.some(
        (word) =>
          item.title.toLowerCase().includes(word) ||
          tarefaRichTextToPlain(item.description).toLowerCase().includes(word),
      ),
    );
  };

  const startEditGoal = () => {
    setGoalDraft(data.sprint?.goal ?? '');
    setEditingGoal(true);
  };
  const cancelEditGoal = () => setEditingGoal(false);
  const saveGoal = async () => {
    try {
      setSavingGoal(true);
      await data.updateSprintGoal.mutateAsync(goalDraft);
      setEditingGoal(false);
      toast({ title: 'Descrição atualizada' });
    } catch (error) {
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSavingGoal(false);
    }
  };

  return {
    ...data,
    navigate,
    sprintRisks,
    editingGoal,
    goalDraft,
    setGoalDraft,
    savingGoal,
    startEditGoal,
    cancelEditGoal,
    saveGoal,
    filteredDeliverables,
    hierarchicalTasks,
    ganttChartData,
    ganttByPerson,
    groupedEvents,
    parentTaskOptions,
    uniqueResponsibles,
    availableYears,
    availableMonths,
    availableMetricsPeople,
    metricsFilteredDeliverables,
    filterResponsible,
    setFilterResponsible,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    filterYear,
    changeYear,
    filterMonth,
    setFilterMonth,
    filterMetricsPerson,
    setFilterMetricsPerson,
    hasActiveFilters,
    clearFilters,
    expandedTasks,
    expandedPersons,
    expandedMetrics,
    toggleTask: (id: string) => toggleSet(setExpandedTasks, id),
    togglePerson: (id: string) => toggleSet(setExpandedPersons, id),
    toggleMetric: (id: string) => toggleSet(setExpandedMetrics, id),
    getProfileName,
    relatedDeliverables,
    canMoveDeliverable,
    moveModalOpen,
    movingDeliverable,
    moveSprintOptions,
    moveTargetSprintId,
    setMoveTargetSprintId,
    moveTargetSprint,
    movePreview,
    moving,
    openMoveModal,
    closeMoveModal,
    confirmMove,
    updateStatus,
    updateMetric,
    openEditModal,
    openCreateModal,
    openCreateSubtaskModal,
    editModalOpen,
    setEditModalOpen: changeEditModalOpen,
    editingDeliverable,
    editForm,
    setEditForm,
    saveDeliverable,
    saving,
    completionWarning,
    confirmingCompletion,
    confirmCompletionWarning,
    cancelCompletionWarning: () => setCompletionWarning(null),
    createModalOpen,
    setCreateModalOpen,
    createForm,
    setCreateForm,
    createDeliverable,
    creating,
    selectParent,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteDeliverable,
    deleting,
    saveRetrospectiveReport,
    importModalOpen,
    closeImport,
    importFile,
    importPreview,
    responsibleMapping,
    setResponsibleMapping,
    importing,
    fileInputRef,
    handleFileSelect,
    handleImport,
    resetImport,
    handleExportExcel,
  };
}

export type EquipeSprintDetalhesController = ReturnType<typeof useEquipeSprintDetalhesController>;
