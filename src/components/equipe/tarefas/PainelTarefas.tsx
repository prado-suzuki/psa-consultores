import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, Table2, Trello, Sun, CalendarRange, GanttChart, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembersForTasks, useTaxProjectsForFilter, useClusterIdByPageCategory } from '@/hooks/useTaxReferenceData';
import {
  useOrgTasks,
  useDeleteOrgTask,
  OrgTask,
  TaskFilters as TaskFiltersType
} from '@/hooks/useOrgTasks';
import { AreaKey } from '@/config/areaCategories';
import { useDashboardProjectIds } from '@/hooks/useDashboardProjectIds';
import { useProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { useOrgProjectOrders } from '@/hooks/useOrgProjectOrders';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetoDeleteDialog } from '@/components/equipe/projetos-cadastro/ProjetoDeleteDialog';
import { ProjetosTarefasList } from '@/components/equipe/tarefas/ProjetosTarefasList';
import { extractProductAcronyms, type ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';
import { TaskFilters } from '@/components/equipe/fiscal/tasks/TaskFilters';
import { TaskKPICards } from '@/components/equipe/fiscal/tasks/TaskKPICards';
import { TaskCalendar } from '@/components/equipe/fiscal/tasks/TaskCalendar';
import { TaskTable } from '@/components/equipe/fiscal/tasks/TaskTable';
import { TaskKanban } from '@/components/equipe/fiscal/tasks/TaskKanban';
import { TaskGantt } from '@/components/equipe/fiscal/tasks/TaskGantt';
import { TaskTodayView } from '@/components/equipe/fiscal/tasks/TaskTodayView';
import { TaskFutureView } from '@/components/equipe/fiscal/tasks/TaskFutureView';
import { TaskModal } from '@/components/equipe/fiscal/tasks/TaskModal';
import { ReassignModal } from '@/components/equipe/fiscal/tasks/ReassignModal';
import { MoveTaskModal } from '@/components/equipe/fiscal/tasks/MoveTaskModal';
import { MoveTasksModal } from '@/components/equipe/fiscal/tasks/MoveTasksModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Painel de Tarefas COMPARTILHADO — fonte única de verdade da ferramenta de tarefas.
//
// É renderizado por duas páginas (Tax e OSG), cada uma envolvendo este componente
// no seu próprio layout (FiscalLayout / OsgLayout). Assim, qualquer alteração de
// comportamento/visual feita aqui vale automaticamente para as duas áreas — sem
// código duplicado. A única coisa que difere entre as áreas é a moldura externa.
//
// Quando, no futuro, for preciso estilizar/escopar dados por área, parametrizar
// este componente via props (ex.: tema, categoria de cluster) em vez de copiá-lo.
const PainelTarefas = ({ area }: { area: AreaKey }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkTaskId = searchParams.get('taskId');
  const { user, isAdmin, isLider, isSublider } = useAuth();
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [activeView, setActiveView] = useState('list');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OrgTask | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<OrgTask | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<OrgTask | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [openedDeepLinkId, setOpenedDeepLinkId] = useState<string | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const projectController = useProjetosCadastroController(area);
  const listProjects = useMemo(() => {
    const profilesById = new Map(projectController.teamMembers.map(profile => [profile.id, profile]));
    return projectController.projects.map(project => {
      if (project.responsible || !project.responsible_id) return project;
      const responsible = profilesById.get(project.responsible_id);
      return responsible ? { ...project, responsible } : project;
    });
  }, [projectController.projects, projectController.teamMembers]);
  const projectOsIds = useMemo(() => listProjects
    .map(project => project.ordem_servico_id)
    .filter((id): id is string => Boolean(id)), [listProjects]);
  const { data: projectOrders = [] } = useOrgProjectOrders(projectOsIds);
  // As OS saem só das ordens dos projetos listados. Antes vinham do
  // useDashboardClientesOs, que baixa 11 tabelas inteiras (clientes, OS,
  // projetos, tarefas, clusters, perfis…) para preencher este mesmo cabeçalho —
  // a hierarquia só consulta as OS que têm projeto na tela (osById.get).
  const osRows = useMemo<ProjetosTarefasOs[]>(() => projectOrders.map(order => {
    const osProjects = listProjects.filter(item => item.ordem_servico_id === order.id);
    const project = osProjects[0];
    const produtos = [...new Set(osProjects.flatMap(item => extractProductAcronyms(item.servico_contratado)))]
      .join(', ') || null;
    return {
      os_id: order.id,
      numero_os: order.numero_os,
      cliente_id: order.id_cliente,
      cliente_nome: project?.external_client?.nome || 'Cliente não informado',
      servico_nome: project?.servico_nome || null,
      data_fim: order.data_fim,
      produtos,
    };
  }), [projectOrders, listProjects]);
  // Deep-link via ?taskId=...: ignora filtros para garantir que a tarefa apareça em `tasks`.
  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: activeView === 'list' ? undefined : filters.search,
      clientId: undefined,
    }),
    [activeView, filters],
  );
  const { data: allTasks = [] } = useOrgTasks(deepLinkTaskId ? {} : queryFilters);
  const deleteTask = useDeleteOrgTask(area);

  const { data: clusterId } = useClusterIdByPageCategory(area);
  const { data: teamMembers = [] } = useTeamMembersForTasks(clusterId ?? undefined);
  const { data: projects = [] } = useTaxProjectsForFilter();

  // Escopo de VISUALIZAÇÃO por cluster: só tarefas de projetos do cluster atual.
  // Tarefas sem projeto (sem cluster) permanecem. Deep-link ignora o escopo para
  // garantir que a tarefa-alvo apareça. Escrita/atribuição não é afetada.
  const { ids: visibleProjectIds } = useDashboardProjectIds(clusterId, area === 'tax');
  const tasks = useMemo(() => {
    if (deepLinkTaskId) return allTasks;
    // Sem cluster resolvido (clusterId nulo/carregando) → NÃO escopar: degrada para o
    // comportamento atual em vez de esconder tarefas indevidamente.
    const clusterTasks = !visibleProjectIds ? allTasks : allTasks.filter(t =>
      !t.project_id ||
      visibleProjectIds.has(t.project_id) ||
      (!!user?.id && t.reviewer_id === user.id && t.status === 'review')
    );
    if (!filters.clientId) return clusterTasks;
    const projectsById = new Map(listProjects.map(project => [project.id, project]));
    return clusterTasks.filter(task =>
      task.client_id === filters.clientId ||
      (!!task.project_id && projectsById.get(task.project_id)?.external_client_id === filters.clientId)
    );
  }, [allTasks, visibleProjectIds, deepLinkTaskId, user?.id, filters.clientId, listProjects]);
  const visibleListProjects = useMemo(
    () => filters.clientId
      ? listProjects.filter(project => project.external_client_id === filters.clientId)
      : listProjects,
    [filters.clientId, listProjects],
  );
  // Com qualquer filtro ativo, a lista esconde clientes/OS/projetos que ficaram sem
  // tarefas depois da filtragem. Sem filtros, projetos vazios continuam visíveis.
  const hasActiveFilters = useMemo(() => Boolean(
    filters.search?.trim() ||
    (filters.assignedTo && filters.assignedTo !== 'all') ||
    filters.status?.length ||
    filters.priority?.length ||
    filters.projectId ||
    filters.clientId ||
    filters.contribuinteId ||
    filters.startDate ||
    filters.endDate,
  ), [filters]);

  // Ensina o comportamento novo no momento exato: quando um filtro deixa algum
  // cliente/OS/projeto sem tarefas (portanto oculto), avisa uma vez por sessão de
  // filtragem. Reseta ao limpar os filtros, para reaparecer numa próxima filtragem.
  const hintShownRef = useRef(false);
  useEffect(() => {
    if (activeView !== 'list' || !hasActiveFilters) {
      hintShownRef.current = false;
      return;
    }
    if (hintShownRef.current) return;
    const projectsWithTasks = new Set(tasks.map(task => task.project_id).filter(Boolean));
    const hidSomething = visibleListProjects.some(project => !projectsWithTasks.has(project.id));
    if (hidSomething) {
      hintShownRef.current = true;
      toast.info('Filtro aplicado', {
        description: 'Clientes, OS e projetos sem tarefas correspondentes ficam ocultos.',
      });
    }
  }, [activeView, hasActiveFilters, tasks, visibleListProjects]);

  const handleEditTask = (task: OrgTask) => {
    setSelectedTask(task);
    setDefaultParentId(null);
    setDefaultProjectId(null);
    setIsTaskModalOpen(true);
  };

  // Abre o modal automaticamente quando a página é aberta com ?taskId=<id>.
  // Why: linhas da tabela "Tarefas Atrasadas" do FiscalDashboard fazem deep-link para cá.
  useEffect(() => {
    if (!deepLinkTaskId || openedDeepLinkId === deepLinkTaskId) return;
    const task = tasks.find(t => t.id === deepLinkTaskId);
    if (task) {
      setSelectedTask(task);
      setDefaultParentId(null);
      setIsTaskModalOpen(true);
      setOpenedDeepLinkId(deepLinkTaskId);
    }
  }, [deepLinkTaskId, tasks, openedDeepLinkId]);

  // Ao fechar o modal, remove o ?taskId= da URL para não reabrir em navegação posterior.
  const handleTaskModalOpenChange = (open: boolean) => {
    setIsTaskModalOpen(open);
    if (!open && deepLinkTaskId) {
      const next = new URLSearchParams(searchParams);
      next.delete('taskId');
      setSearchParams(next, { replace: true });
      setOpenedDeepLinkId(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    // Espelha a RLS rls_org_tasks_delete: somente líder (ou superior) ou o criador podem excluir.
    const task = tasks.find(t => t.id === taskId);
    const canDelete = isAdmin || isLider || (!!task && !!user && task.created_by === user.id);
    if (!canDelete) {
      toast.error('Você não tem permissão para excluir esta tarefa.', {
        description: 'Apenas o criador da tarefa ou um líder pode excluí-la. Contate um líder da equipe para solicitar a exclusão.',
      });
      return;
    }
    const activeChildren = tasks.filter(t => t.parent_task_id === taskId && t.status !== 'done');
    if (activeChildren.length > 0) {
      toast.error('Não é possível excluir esta tarefa.', {
        description: `Existe(m) ${activeChildren.length} subtarefa(s) ativa(s). Conclua ou exclua as subtarefas primeiro.`,
      });
      return;
    }
    setTaskToDelete(taskId);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask.mutate(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const handleReassignTask = (task: OrgTask) => {
    setTaskToReassign(task);
    setIsReassignModalOpen(true);
  };

  // Espelha o trigger org_tasks_team_member_status_only: trocar o projeto é
  // mudança fora do trio status/horas/revisor, então só líder (ou superior) e o
  // criador da tarefa conseguem. Avisa antes em vez de deixar o banco recusar.
  const canMoveTask = (task: OrgTask) => isAdmin || isLider || isSublider
    || (!!user && task.created_by === user.id);

  const handleMoveTask = (task: OrgTask) => {
    if (!canMoveTask(task)) {
      toast.error('Você não tem permissão para mover esta tarefa.', {
        description: 'Apenas o criador da tarefa ou um líder pode trocá-la de projeto. Contate um líder da equipe.',
      });
      return;
    }
    setTaskToMove(task);
    setIsMoveModalOpen(true);
  };

  const toggleTaskSelection = (taskIds: string[], selected: boolean) => setSelectedTaskIds(previous => {
    const next = new Set(previous);
    taskIds.forEach(id => (selected ? next.add(id) : next.delete(id)));
    return next;
  });

  // A seleção só existe para as tarefas visíveis: ao trocar de filtro, ids que
  // saíram da lista não podem continuar contando no lote.
  useEffect(() => {
    setSelectedTaskIds(previous => {
      if (previous.size === 0) return previous;
      const visible = new Set(tasks.map(task => task.id));
      const next = new Set([...previous].filter(id => visible.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [tasks]);

  const selectedTasks = useMemo(
    () => tasks.filter(task => selectedTaskIds.has(task.id)),
    [tasks, selectedTaskIds],
  );

  const handleMoveSelected = () => {
    const blocked = selectedTasks.filter(task => !canMoveTask(task));
    if (blocked.length > 0) {
      toast.error(`Você não tem permissão para mover ${blocked.length} das tarefas selecionadas.`, {
        description: 'Apenas o criador da tarefa ou um líder pode trocá-la de projeto. Desmarque essas tarefas ou contate um líder.',
      });
      return;
    }
    if (selectedTasks.length === 0) return;
    setIsBulkMoveOpen(true);
  };

  const handleNewTask = (projectId?: string) => {
    setSelectedTask(null);
    setDefaultParentId(null);
    setDefaultProjectId(projectId || null);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentTask: OrgTask) => {
    setSelectedTask(null);
    setDefaultParentId(parentTask.id);
    setDefaultProjectId(parentTask.project_id);
    setIsTaskModalOpen(true);
  };

  const parentTasks = tasks.filter(t => !t.parent_task_id);

  return (
    <ProjetosCadastroContext.Provider value={projectController}>
      <div className="space-y-4">
        <TaskKPICards tasks={tasks} />

        <Tabs value={activeView} onValueChange={setActiveView} className="min-w-0">
          <div className="space-y-2 rounded-xl border bg-card p-2 shadow-sm">
            <div className="overflow-x-auto">
              <TabsList className="w-max min-w-full justify-start">
                <TabsTrigger value="list" className="gap-2"><ListTree className="h-4 w-4" />Lista</TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" />Calendário</TabsTrigger>
                <TabsTrigger value="table" className="gap-2"><Table2 className="h-4 w-4" />Tabela</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2"><Trello className="h-4 w-4" />Kanban</TabsTrigger>
                <TabsTrigger value="gantt" className="gap-2"><GanttChart className="h-4 w-4" />Gantt</TabsTrigger>
                <TabsTrigger value="today" className="gap-2"><Sun className="h-4 w-4" />Hoje</TabsTrigger>
                <TabsTrigger value="future" className="gap-2"><CalendarRange className="h-4 w-4" />Futuras</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TaskFilters
                filters={filters}
                onFiltersChange={setFilters}
                teamMembers={teamMembers}
                projects={projects}
              />
              <Button size="sm" className="ml-auto h-9 shrink-0" onClick={() => handleNewTask()}>
                <Plus className="mr-2 h-4 w-4" />Nova tarefa
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <TabsContent value="list" className="m-0">
              <ProjetosTarefasList
                area={area}
                projects={visibleListProjects}
                tasks={tasks}
                osRows={osRows}
                search={filters.search || ''}
                hideEmpty={hasActiveFilters}
                onClearFilters={() => setFilters({})}
                onEditProject={projectController.handleOpenModal}
                onDeleteProject={projectController.setDeleteProjectId}
                onNewTask={handleNewTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onReassignTask={handleReassignTask}
                onMoveTask={handleMoveTask}
                onAddSubtask={handleAddSubtask}
                selectedTaskIds={selectedTaskIds}
                onToggleSelection={toggleTaskSelection}
                onMoveSelected={handleMoveSelected}
                currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="calendar" className="m-0">
              <TaskCalendar
                tasks={tasks}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onReassign={handleReassignTask}
              />
            </TabsContent>

            <TabsContent value="table" className="m-0">
              <TaskTable
                tasks={tasks}
                area={area}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                 onReassign={handleReassignTask}
                 onMove={handleMoveTask}
                 onAddSubtask={handleAddSubtask}
                 currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="kanban" className="m-0">
              <TaskKanban
                tasks={tasks}
                area={area}
                onEdit={handleEditTask}
                 onDelete={handleDeleteTask}
                 onReassign={handleReassignTask}
                 currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="gantt" className="m-0">
              <TaskGantt
                tasks={tasks}
                onEdit={handleEditTask}
              />
            </TabsContent>

            <TabsContent value="today" className="m-0">
              <TaskTodayView
                tasks={tasks}
                 area={area}
                 onEdit={handleEditTask}
                 currentUserId={user?.id}
              />
            </TabsContent>

            <TabsContent value="future" className="m-0">
              <TaskFutureView
                tasks={tasks}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onReassign={handleReassignTask}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Task Modal */}
      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={handleTaskModalOpenChange}
        task={selectedTask}
        area={area}
        teamMembers={teamMembers}
        parentTasks={parentTasks}
        defaultParentId={defaultParentId}
        defaultProjectId={defaultProjectId}
      />

      <ProjetoDialog />
      <ProjetoDeleteDialog />

      {/* Move Modal */}
      <MoveTaskModal
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        task={taskToMove}
        area={area}
        projects={listProjects}
        tasks={tasks}
        osRows={osRows}
      />

      {/* Bulk Move Modal */}
      <MoveTasksModal
        open={isBulkMoveOpen}
        onOpenChange={setIsBulkMoveOpen}
        selectedTasks={selectedTasks}
        area={area}
        projects={listProjects}
        tasks={tasks}
        osRows={osRows}
        onMoved={() => setSelectedTaskIds(new Set())}
      />

      {/* Reassign Modal */}
      <ReassignModal
        open={isReassignModalOpen}
        onOpenChange={setIsReassignModalOpen}
        task={taskToReassign}
        area={area}
        teamMembers={teamMembers}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProjetosCadastroContext.Provider>
  );
};

export default PainelTarefas;
