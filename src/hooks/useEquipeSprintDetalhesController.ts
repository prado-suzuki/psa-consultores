import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  useDomainEquipeSprintDetalhes,
  type SprintDetalhesDeliverable as Deliverable,
} from '@/hooks/useDomainEquipeSprintDetalhes';
import { parseExcelFile, processExcelData, type ImportPreview } from '@/lib/excelImporter';
import {
  buildExportRows,
  buildGanttData,
  buildTaskHierarchy,
  calculateSprintRisks,
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
  const { toast } = useToast();
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<DeliverableForm>(blankForm());
  const [createForm, setCreateForm] = useState<DeliverableForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
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

  const openEditModal = (item: Deliverable) => {
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
  };
  const openCreateModal = () => {
    setCreateForm(blankForm(sprint?.start_date, sprint?.end_date));
    setCreateModalOpen(true);
  };
  const updateStatus = async (deliverableId: string, newStatus: string) => {
    try {
      await data.updateDeliverableStatus.mutateAsync({ deliverableId, newStatus });
      toast({ title: 'Status atualizado' });
    } catch (error) {
      toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
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
          (item.description ?? '').toLowerCase().includes(word),
      ),
    );
  };

  return {
    ...data,
    navigate,
    sprintRisks,
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
    updateStatus,
    updateMetric,
    openEditModal,
    openCreateModal,
    editModalOpen,
    setEditModalOpen,
    editingDeliverable,
    editForm,
    setEditForm,
    saveDeliverable,
    saving,
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
