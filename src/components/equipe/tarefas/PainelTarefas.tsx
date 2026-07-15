import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, Table2, Trello, Sun, CalendarRange, GanttChart } from 'lucide-react';
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
  const { user, isAdmin, isLider } = useAuth();
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [activeView, setActiveView] = useState('calendar');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OrgTask | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<OrgTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [openedDeepLinkId, setOpenedDeepLinkId] = useState<string | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  // Deep-link via ?taskId=...: ignora filtros para garantir que a tarefa apareça em `tasks`.
  const { data: allTasks = [], isLoading } = useOrgTasks(deepLinkTaskId ? {} : filters);
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
    if (!visibleProjectIds) return allTasks;
    return allTasks.filter(t =>
      !t.project_id ||
      visibleProjectIds.has(t.project_id) ||
      (!!user?.id && t.reviewer_id === user.id && t.status === 'review')
    );
  }, [allTasks, visibleProjectIds, deepLinkTaskId, user?.id]);

  const handleEditTask = (task: OrgTask) => {
    setSelectedTask(task);
    setDefaultParentId(null);
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

  const handleNewTask = () => {
    setSelectedTask(null);
    setDefaultParentId(null);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentTask: OrgTask) => {
    setSelectedTask(null);
    setDefaultParentId(parentTask.id);
    setIsTaskModalOpen(true);
  };

  const parentTasks = tasks.filter(t => !t.parent_task_id);

  return (
    <>
      <div className="space-y-6">
        {/* Header with filters and new button */}
        <div className="flex items-start justify-between gap-4">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            teamMembers={teamMembers}
            projects={projects}
          />
          <Button onClick={handleNewTask} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* KPI Cards */}
        <TaskKPICards tasks={tasks} />

        {/* Views */}
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Table2 className="h-4 w-4" />
              Tabela
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Trello className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <GanttChart className="h-4 w-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-2">
              <Sun className="h-4 w-4" />
              Hoje
            </TabsTrigger>
            <TabsTrigger value="future" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Futuras
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
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
    </>
  );
};

export default PainelTarefas;
