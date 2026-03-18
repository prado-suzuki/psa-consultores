import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/administracao/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FolderKanban, ClipboardList, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const AdminPerformance = () => {
  // Fetch users count
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles_safe')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch projects count
  const { data: projectsData } = useQuery({
    queryKey: ['admin-projects-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status');
      
      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter(p => p.status === 'active').length || 0,
      };
    },
  });

  // Fetch sprints data
  const { data: sprintsData } = useQuery({
    queryKey: ['admin-sprints-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, status');
      
      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter(s => s.status === 'active').length || 0,
      };
    },
  });

  // Fetch tasks data
  const { data: tasksData } = useQuery({
    queryKey: ['admin-tasks-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status');
      
      if (error) throw error;
      return {
        total: data?.length || 0,
        done: data?.filter(t => t.status === 'done').length || 0,
        inProgress: data?.filter(t => t.status === 'in_progress').length || 0,
        backlog: data?.filter(t => t.status === 'backlog').length || 0,
      };
    },
  });

  // Fetch deliverables data
  const { data: deliverablesData } = useQuery({
    queryKey: ['admin-deliverables-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprint_deliverables')
        .select('id, status');
      
      if (error) throw error;
      return {
        total: data?.length || 0,
        completed: data?.filter(d => d.status === 'completed').length || 0,
        pending: data?.filter(d => d.status === 'pending').length || 0,
      };
    },
  });

  // Fetch tickets data
  const { data: ticketsData } = useQuery({
    queryKey: ['admin-tickets-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status');
      
      if (error) throw error;
      return {
        total: data?.length || 0,
        open: data?.filter(t => t.status === 'aberto').length || 0,
        closed: data?.filter(t => t.status === 'fechado').length || 0,
      };
    },
  });

  const taskCompletionRate = tasksData 
    ? Math.round((tasksData.done / tasksData.total) * 100) || 0
    : 0;

  const deliverableCompletionRate = deliverablesData 
    ? Math.round((deliverablesData.completed / deliverablesData.total) * 100) || 0
    : 0;

  return (
    <AdminLayout 
      title="Dashboard de Performance" 
      subtitle="Visão consolidada de todas as áreas"
    >
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Usuários</CardDescription>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{usersData || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Projetos</CardDescription>
              <FolderKanban className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{projectsData?.total || 0}</CardTitle>
            <p className="text-sm text-green-600">{projectsData?.active || 0} ativos</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Sprints</CardDescription>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{sprintsData?.total || 0}</CardTitle>
            <p className="text-sm text-blue-600">{sprintsData?.active || 0} em andamento</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Chamados</CardDescription>
              <AlertCircle className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{ticketsData?.total || 0}</CardTitle>
            <p className="text-sm text-orange-600">{ticketsData?.open || 0} em aberto</p>
          </CardHeader>
        </Card>
      </div>

      {/* Tasks and Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Tarefas
            </CardTitle>
            <CardDescription>Distribuição de tarefas por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de Tarefas</span>
                <span className="font-semibold">{tasksData?.total || 0}</span>
              </div>
              
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${taskCompletionRate}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-500">{tasksData?.backlog || 0}</p>
                  <p className="text-xs text-gray-500">Backlog</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{tasksData?.inProgress || 0}</p>
                  <p className="text-xs text-blue-600">Em Progresso</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{tasksData?.done || 0}</p>
                  <p className="text-xs text-green-600">Concluídas</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{taskCompletionRate}% concluído</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Entregáveis
            </CardTitle>
            <CardDescription>Status dos entregáveis das sprints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de Entregáveis</span>
                <span className="font-semibold">{deliverablesData?.total || 0}</span>
              </div>
              
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${deliverableCompletionRate}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{deliverablesData?.pending || 0}</p>
                  <p className="text-xs text-yellow-600">Pendentes</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{deliverablesData?.completed || 0}</p>
                  <p className="text-xs text-green-600">Concluídos</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{deliverableCompletionRate}% concluído</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Areas Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Áreas do Sistema</CardTitle>
          <CardDescription>Resumo de acesso por área</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {['Digital', 'Financeiro', 'Operacional', 'Comercial', 'Chamados'].map((area) => (
              <div key={area} className="p-4 border rounded-lg text-center hover:bg-gray-50 transition-colors">
                <Badge variant="outline" className="mb-2">{area}</Badge>
                <p className="text-xs text-gray-500">Área ativa</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminPerformance;