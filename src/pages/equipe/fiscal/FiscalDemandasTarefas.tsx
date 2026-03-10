 import { useState } from 'react';
 import { Plus, CalendarDays, Table2, Trello, Sun, CalendarRange, GanttChart } from 'lucide-react';
 import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { 
   useFiscalTasks, 
   useDeleteFiscalTask,
   FiscalTask,
   TaskFilters as TaskFiltersType
 } from '@/hooks/useFiscalTasks';
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
 
 const FiscalDemandasTarefas = () => {
   const [filters, setFilters] = useState<TaskFiltersType>({});
   const [activeView, setActiveView] = useState('calendar');
   const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
   const [selectedTask, setSelectedTask] = useState<FiscalTask | null>(null);
   const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
   const [taskToReassign, setTaskToReassign] = useState<FiscalTask | null>(null);
   const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
 
   const { data: tasks = [], isLoading } = useFiscalTasks(filters);
   const deleteTask = useDeleteFiscalTask();
 
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
      }));
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['tax-projects-for-filter', filters.clientId],
    queryFn: async () => {
      let query = supabase
        .from('tax_projects')
        .select('id, name')
        .order('name');
      if (filters.clientId) {
        query = query.eq('external_client_id', filters.clientId);
      }
      const { data } = await query;
      return data || [];
    },
  });
 
  const handleEditTask = (task: FiscalTask) => {
    setSelectedTask(task);
    setDefaultParentId(null);
    setIsTaskModalOpen(true);
  };
 
   const handleDeleteTask = (taskId: string) => {
     setTaskToDelete(taskId);
   };
 
   const confirmDelete = () => {
     if (taskToDelete) {
       deleteTask.mutate(taskToDelete);
       setTaskToDelete(null);
     }
   };
 
   const handleReassignTask = (task: FiscalTask) => {
     setTaskToReassign(task);
     setIsReassignModalOpen(true);
   };
 
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const handleNewTask = () => {
    setSelectedTask(null);
    setDefaultParentId(null);
    setIsTaskModalOpen(true);
  };

  const handleAddSubtask = (parentTask: FiscalTask) => {
    setSelectedTask(null);
    setDefaultParentId(parentTask.id);
    setIsTaskModalOpen(true);
  };
 
   const parentTasks = tasks.filter(t => !t.parent_task_id);
 
   return (
     <FiscalLayout title="Tarefas" subtitle="Gestão de tarefas e eventos">
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
         <TaskKPICards />
 
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
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onReassign={handleReassignTask}
                  onAddSubtask={handleAddSubtask}
                />
              </TabsContent>
 
             <TabsContent value="kanban" className="m-0">
               <TaskKanban
                 tasks={tasks}
                 onEdit={handleEditTask}
                 onDelete={handleDeleteTask}
                 onReassign={handleReassignTask}
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
                 onEdit={handleEditTask}
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
          onOpenChange={setIsTaskModalOpen}
          task={selectedTask}
          teamMembers={teamMembers}
          parentTasks={parentTasks}
          defaultParentId={defaultParentId}
        />
 
       {/* Reassign Modal */}
       <ReassignModal
         open={isReassignModalOpen}
         onOpenChange={setIsReassignModalOpen}
         task={taskToReassign}
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
             <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
               Excluir
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </FiscalLayout>
   );
 };
 
 export default FiscalDemandasTarefas;