import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, LayoutGrid, List, X } from 'lucide-react';
import { toast } from 'sonner';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { KanbanBoard } from '@/components/equipe/kanban/KanbanBoard';
import { KanbanDeliverableDialog } from '@/components/equipe/kanban/KanbanDeliverableDialog';
import { KanbanFilters } from '@/components/equipe/kanban/KanbanFilters';
import { KanbanTable } from '@/components/equipe/kanban/KanbanTable';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';
import { OpenSubtasksWarningDialog } from '@/components/equipe/OpenSubtasksWarningDialog';
import { Button } from '@/components/ui/button';
import { useEquipeKanbanDeliverableMutations } from '@/hooks/useDomainEquipeKanbanDeliverableMutations';
import { useEquipeKanbanInitialQuery } from '@/hooks/useDomainEquipeKanbanQueries';
import { useDeliverableBlockers } from '@/hooks/useDeliverableBlockers';
import { usePersistedState } from '@/hooks/usePersistedState';
import { getBlockingOpenSubtasks } from '@/lib/deliverableCompletion';
import {
  buildDeliverableUpdatePayload,
  buildEquipeKanbanHierarchy,
  countOpenSubtasksOutsideTodoColumn,
  filterEquipeKanbanDeliverables,
  getEquipeKanbanColumnDeliverables,
  getEquipeKanbanErrorMessage,
  getEquipeKanbanSubtasks,
  hidesOpenSubtasksOutsideItsColumn,
  normalizeEquipeKanbanStatus,
  selectEquipeKanbanVisibleDeliverables,
  type EquipeKanbanDeliverable as Deliverable,
  type EquipeKanbanProcess as Process,
  type EquipeKanbanProfile as Profile,
  type EquipeKanbanProject as Project,
  type EquipeKanbanSprint as Sprint,
} from '@/lib/equipeKanban';

const EquipeKanban = () => {
  // Quadro de três colunas ocupando a largura toda: a barra recolhe sozinha.
  useTelaDeTrabalhoLargo();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [initialDataApplied, setInitialDataApplied] = useState(false);
  const initialQuery = useEquipeKanbanInitialQuery();
  const deliverableMutations = useEquipeKanbanDeliverableMutations();
  const { data: blockers = {} } = useDeliverableBlockers();
  // Selo de bloqueio só faz sentido em tarefa aberta (concluída = destravado na prática).
  const getBlocker = (deliverable: Deliverable) =>
    deliverable.status === 'completed' ? undefined : blockers[deliverable.id];

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  // Aviso pendente de "concluir mãe com subtarefa aberta" — guarda a ação a executar se confirmar.
  const [completionWarning, setCompletionWarning] = useState<{
    taskTitle: string;
    openSubtasks: Deliverable[];
    confirm: () => Promise<void>;
  } | null>(null);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: '',
    start_date: '',
    due_date: '',
    estimated_hours: '',
    actual_hours: '',
  });
  const [filterSprint, setFilterSprint] = usePersistedState<string>('rotina.kanban.sprint', 'all');
  const [filterResponsible, setFilterResponsible] = usePersistedState<string>(
    'rotina.kanban.responsavel',
    'all',
  );
  const [filterProject, setFilterProject] = usePersistedState<string>(
    'rotina.kanban.projeto',
    'all',
  );
  const [filterProcess, setFilterProcess] = usePersistedState<string>(
    'rotina.kanban.processo',
    'all',
  );
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [sortByDueDate, setSortByDueDate] = usePersistedState<'asc' | 'desc' | null>(
    'rotina.kanban.ordenacao',
    null,
  );

  useEffect(() => {
    if (!initialQuery.data) return;
    setSprints(initialQuery.data.sprints);
    setProfiles(initialQuery.data.profiles);
    setProjects(initialQuery.data.projects);
    setProcesses(initialQuery.data.processes);
    setDeliverables(initialQuery.data.deliverables);
    setInitialDataApplied(true);
  }, [initialQuery.data]);

  useEffect(() => {
    if (initialQuery.error) console.error('Error fetching data:', initialQuery.error);
  }, [initialQuery.error]);

  // O filtro de responsável fica salvo no navegador, e a lista deixou de trazer quem não é da
  // equipe. Quem tivesse selecionado alguém que saiu (representante de cliente, por exemplo)
  // abriria o quadro vazio, sem nome no seletor e sem pista do motivo.
  useEffect(() => {
    if (!initialQuery.data || filterResponsible === 'all') return;
    const aindaExiste = initialQuery.data.profiles.some(
      (profile) => profile.id === filterResponsible,
    );
    if (!aindaExiste) setFilterResponsible('all');
  }, [initialQuery.data, filterResponsible, setFilterResponsible]);

  const toggleTaskExpanded = (taskId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setExpandedTasks((previous) => {
      const next = new Set(previous);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const directMatchIds = useMemo(
    () =>
      new Set(
        filterEquipeKanbanDeliverables(deliverables, sprints, processes, {
          sprint: filterSprint,
          responsible: filterResponsible,
          project: filterProject,
          process: filterProcess,
          startDate: filterStartDate,
          endDate: filterEndDate,
        }).map((deliverable) => deliverable.id),
      ),
    [
      deliverables,
      sprints,
      processes,
      filterSprint,
      filterResponsible,
      filterProject,
      filterProcess,
      filterStartDate,
      filterEndDate,
    ],
  );

  // Filtro por pessoa = lista pessoal: a tarefa aparece na coluna do PRÓPRIO status, mesmo que a
  // mãe seja de outra pessoa (a mãe é só agrupador, e some da visão — vira etiqueta no card).
  // Sem filtro de pessoa o quadro segue aninhado, com a subtarefa dentro do card da mãe.
  const personView = filterResponsible !== 'all';

  const filteredDeliverables = useMemo(
    () =>
      selectEquipeKanbanVisibleDeliverables(deliverables, directMatchIds, {
        keepAncestors: !personView,
      }),
    [deliverables, directMatchIds, personView],
  );

  // Nome da mãe pra dar contexto no card promovido (a mãe não está na visão).
  const getGroupLabel = (deliverable: Deliverable) => {
    if (!deliverable.parent_id) return null;
    const parent = deliverables.find((item) => item.id === deliverable.parent_id);
    if (!parent) return null;
    return parent.task_code ? `${parent.task_code} ${parent.title}` : parent.title;
  };

  const hierarchicalDeliverables = useMemo(
    () => buildEquipeKanbanHierarchy(filteredDeliverables),
    [filteredDeliverables],
  );

  // Com filtro de pessoa/data ativo, quem olha o quadro quer ver as tarefas em si — e elas podem
  // estar dentro de um agrupador. Abrimos todas as mães com subtarefa pra nada ficar escondido
  // atrás de uma setinha fechada.
  useEffect(() => {
    if (filterResponsible === 'all' && !filterStartDate && !filterEndDate) return;
    setExpandedTasks((previous) => {
      const next = new Set(previous);
      let changed = false;
      hierarchicalDeliverables.forEach((parent) => {
        if (parent.subtaskCount > 0 && !next.has(parent.id)) {
          next.add(parent.id);
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [filterResponsible, filterStartDate, filterEndDate, hierarchicalDeliverables]);

  // Mãe fora de "A Fazer" (em progresso ou concluída) com subtarefa aberta: o card dela fica na
  // coluna da MÃE e o aninhamento vem fechado, então a tarefa aberta não aparecia em lugar nenhum
  // do quadro. Abrimos essas mães automaticamente — uma vez só, para não reabrir o que a pessoa
  // fechou na mão.
  const autoExpandedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const toExpand = hierarchicalDeliverables
      .filter(hidesOpenSubtasksOutsideItsColumn)
      .map((parent) => parent.id)
      .filter((id) => !autoExpandedRef.current.has(id));
    if (toExpand.length === 0) return;
    toExpand.forEach((id) => autoExpandedRef.current.add(id));
    setExpandedTasks((previous) => new Set([...previous, ...toExpand]));
  }, [hierarchicalDeliverables]);

  const hiddenCount = useMemo(() => {
    const renderedIds = new Set<string>();
    hierarchicalDeliverables.forEach((parent) => {
      renderedIds.add(parent.id);
      parent.subtasks.forEach((subtask) => renderedIds.add(subtask.id));
    });
    return filteredDeliverables.filter((deliverable) => !renderedIds.has(deliverable.id)).length;
  }, [hierarchicalDeliverables, filteredDeliverables]);

  // Tarefas abertas que a sprint lista como "a fazer" mas que aqui vivem aninhadas em mães de
  // outras colunas — a diferença de contagem entre a sprint e a coluna "A Fazer" vem daqui.
  const nestedOpenCount = useMemo(
    () => countOpenSubtasksOutsideTodoColumn(hierarchicalDeliverables),
    [hierarchicalDeliverables],
  );

  const getColumnDeliverables = (columnId: string) =>
    getEquipeKanbanColumnDeliverables(hierarchicalDeliverables, columnId, sortByDueDate);

  const hasActiveFilters = filterSprint !== 'all' || filterResponsible !== 'all' || filterProject !== 'all' || filterProcess !== 'all' || filterStartDate || filterEndDate;

  const clearFilters = () => {
    setFilterSprint('all');
    setFilterResponsible('all');
    setFilterProject('all');
    setFilterProcess('all');
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
  };

  const applyDeliverableStatus = async (
    id: string,
    newStatus: 'pending' | 'in_progress' | 'completed',
  ) => {
    try {
      await deliverableMutations.updateStatus.mutateAsync({ deliverableId: id, status: newStatus });
      setDeliverables(
        deliverables.map((deliverable) =>
          deliverable.id === id ? { ...deliverable, status: newStatus } : deliverable,
        ),
      );
    } catch (error) {
      console.error('Error updating deliverable:', error);
    }
  };

  const updateDeliverableStatus = async (
    id: string,
    newStatus: 'pending' | 'in_progress' | 'completed',
  ) => {
    const target = deliverables.find((deliverable) => deliverable.id === id);
    const blocking = getBlockingOpenSubtasks(deliverables, id, newStatus, target?.status);
    if (blocking.length > 0) {
      setCompletionWarning({
        taskTitle: target?.title ?? '',
        openSubtasks: blocking,
        confirm: () => applyDeliverableStatus(id, newStatus),
      });
      return;
    }
    await applyDeliverableStatus(id, newStatus);
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

  const toggleSubtaskComplete = async (subtask: Deliverable, event: React.MouseEvent) => {
    event.stopPropagation();
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    await updateDeliverableStatus(subtask.id, newStatus);
  };

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return 'Não atribuído';
    const profile = profiles.find((item) => item.id === profileId);
    return profile ? `${profile.first_name} ${profile.last_name}` : 'Desconhecido';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'A Fazer',
      in_progress: 'Em Progresso',
      completed: 'Concluído',
    };
    return labels[normalizeEquipeKanbanStatus(status)];
  };

  const openDeliverableDetail = async (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setEditForm({
      title: deliverable.title,
      description: deliverable.description || '',
      assigned_to: deliverable.assigned_to || '',
      // Normaliza para o Select não abrir em branco quando o status do banco está fora das três
      // colunas (ou nulo) — salvando, a linha fica consistente.
      status: normalizeEquipeKanbanStatus(deliverable.status),
      start_date: deliverable.start_date || '',
      due_date: deliverable.due_date || '',
      estimated_hours: deliverable.estimated_hours?.toString() || '',
      actual_hours: deliverable.actual_hours?.toString() || '',
    });
  };

  const saveDeliverable = async () => {
    if (!selectedDeliverable) return;
    const blocking = getBlockingOpenSubtasks(
      deliverables,
      selectedDeliverable.id,
      editForm.status,
      selectedDeliverable.status,
    );
    if (blocking.length > 0) {
      setCompletionWarning({
        taskTitle: selectedDeliverable.title,
        openSubtasks: blocking,
        confirm: persistDeliverable,
      });
      return;
    }
    await persistDeliverable();
  };

  const persistDeliverable = async () => {
    if (!selectedDeliverable) return;
    try {
      const updateData = buildDeliverableUpdatePayload(editForm, selectedDeliverable.status);
      await deliverableMutations.saveDeliverable.mutateAsync({
        deliverableId: selectedDeliverable.id,
        payload: updateData,
      });
      setDeliverables(
        deliverables.map((deliverable) =>
          deliverable.id === selectedDeliverable.id
            ? ({ ...deliverable, ...updateData } as Deliverable)
            : deliverable,
        ),
      );
      toast.success('Entregável atualizado');
      setSelectedDeliverable(null);
    } catch (error) {
      console.error('Error saving deliverable:', error);
      toast.error('Erro ao salvar');
    }
  };

  const deleteDeliverable = async () => {
    if (!selectedDeliverable) return;
    try {
      setDeleting(true);
      await deliverableMutations.deleteDeliverable.mutateAsync(selectedDeliverable.id);
      setDeliverables(
        deliverables.filter((deliverable) => deliverable.id !== selectedDeliverable.id),
      );
      setSelectedDeliverable(null);
      setDeleteDialogOpen(false);
      toast.success('Entregável excluído');
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast.error('Erro ao excluir entregável');
    } finally {
      setDeleting(false);
    }
  };

  const selectedSubtasks =
    selectedDeliverable && !selectedDeliverable.parent_id
      ? getEquipeKanbanSubtasks(deliverables, selectedDeliverable.id)
      : [];

  return (
    <EquipeLayout
      title="Quadro Kanban"
      subtitle="Visualize e gerencie os entregáveis das sprints"
      fullWidth={true}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      <KanbanFilters
        sprints={sprints}
        profiles={profiles}
        projects={projects}
        processes={processes}
        filterSprint={filterSprint}
        filterResponsible={filterResponsible}
        filterProject={filterProject}
        filterProcess={filterProcess}
        filterStartDate={filterStartDate}
        filterEndDate={filterEndDate}
        hasActiveFilters={!!hasActiveFilters}
        mainTaskCount={hierarchicalDeliverables.length}
        totalTaskCount={filteredDeliverables.length}
        hiddenCount={hiddenCount}
        nestedOpenCount={nestedOpenCount}
        onSprintChange={setFilterSprint}
        onResponsibleChange={setFilterResponsible}
        onProjectChange={setFilterProject}
        onProcessChange={setFilterProcess}
        onStartDateChange={setFilterStartDate}
        onEndDateChange={setFilterEndDate}
        onClear={clearFilters}
      />

      {hasActiveFilters && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Filter className="h-4 w-4 flex-shrink-0" />
          <span>Há filtros ativos — algumas tarefas da sprint podem estar ocultas.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto h-7 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar filtros
          </Button>
        </div>
      )}

      {initialQuery.isLoading || (initialQuery.isSuccess && !initialDataApplied) ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          expandedTasks={expandedTasks}
          sortByDueDate={sortByDueDate}
          getColumnDeliverables={getColumnDeliverables}
          getProfileName={getProfileName}
          getBlocker={getBlocker}
          getGroupLabel={getGroupLabel}
          onSortToggle={() => {
            setSortByDueDate((current) =>
              current === null ? 'asc' : current === 'asc' ? 'desc' : null,
            );
          }}
          onStatusChange={updateDeliverableStatus}
          onToggleExpanded={toggleTaskExpanded}
          onToggleSubtask={toggleSubtaskComplete}
          onOpenDeliverable={openDeliverableDetail}
        />
      ) : (
        <KanbanTable
          deliverables={hierarchicalDeliverables}
          expandedTasks={expandedTasks}
          getProfileName={getProfileName}
          getBlocker={getBlocker}
          getGroupLabel={getGroupLabel}
          getStatusBadgeColor={getStatusBadgeColor}
          getStatusLabel={getStatusLabel}
          onToggleExpanded={toggleTaskExpanded}
          onToggleSubtask={toggleSubtaskComplete}
          onOpenDeliverable={openDeliverableDetail}
        />
      )}

      <KanbanDeliverableDialog
        selectedDeliverable={selectedDeliverable}
        editForm={editForm}
        profiles={profiles}
        subtasks={selectedSubtasks}
        deleting={deleting}
        deleteDialogOpen={deleteDialogOpen}
        setEditForm={setEditForm}
        onClose={() => setSelectedDeliverable(null)}
        onDeleteDialogOpenChange={setDeleteDialogOpen}
        onSave={saveDeliverable}
        onDeleteDeliverable={deleteDeliverable}
        onSubtaskStatusChange={async (subtask) => {
          const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
          await updateDeliverableStatus(subtask.id, newStatus);
        }}
        onOpenSubtask={openDeliverableDetail}
      />

      <OpenSubtasksWarningDialog
        taskTitle={completionWarning?.taskTitle ?? null}
        openSubtasks={completionWarning?.openSubtasks ?? []}
        confirming={confirmingCompletion}
        getProfileName={getProfileName}
        onCancel={() => setCompletionWarning(null)}
        onConfirm={confirmCompletionWarning}
      />
    </EquipeLayout>
  );
};

export default EquipeKanban;
