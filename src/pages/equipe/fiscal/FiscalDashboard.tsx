import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderKanban, Clock, CheckCircle, AlertTriangle, ListChecks, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { useTaxAreas } from '@/hooks/useTaxAreas';

const PIE_COLORS: Record<string, string> = {
  backlog: '#94a3b8',
  waiting_client: '#f97316',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  review: '#a855f7',
  done: '#10b981',
};

const today = startOfDay(new Date());

const FiscalDashboard = () => {
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['fiscal-dash-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('tax_projects').select('id, name, status, estrutura_area_id').order('name');
      return data || [];
    },
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['fiscal-dash-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_tasks')
        .select('id, title, status, project_id, client_id, assigned_to, assigned_to_name, estimated_hours, due_date')
        .is('parent_task_id', null);
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['fiscal-dash-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('cliente_dev').select('id, nome');
      return data || [];
    },
  });

  const { data: areas = [] } = useTaxAreas();

  const { data: members = [] } = useQuery({
    queryKey: ['fiscal-dash-members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles_safe').select('id, first_name, last_name');
      return data || [];
    },
  });

  const isLoading = loadingProjects || loadingTasks;

  // Lookup maps
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nome]));
  const areaMap = Object.fromEntries(areas.map(a => [a.id, a.nome]));
  const memberMap = Object.fromEntries(members.map(m => [m.id, `${m.first_name} ${m.last_name}`.trim()]));

  // KPIs — Projects
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const onHoldProjects = projects.filter(p => p.status === 'on_hold').length;

  // KPIs — Tasks
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date + 'T00:00:00') < today);

  // --- Chart data ---

  // Pie: tasks by status
  const statusCounts = statusList.map(s => ({
    name: s.label,
    key: s.key,
    value: tasks.filter(t => t.status === s.key).length,
  })).filter(s => s.value > 0);

  // Bar: hours by project
  const hoursByProject: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.project_id && t.estimated_hours) {
      hoursByProject[t.project_id] = (hoursByProject[t.project_id] || 0) + t.estimated_hours;
    }
  });
  const hoursProjectData = Object.entries(hoursByProject)
    .map(([pid, hours]) => ({ name: truncate(projectMap[pid]?.name || 'Sem projeto', 20), hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Bar: hours by client
  const hoursByClient: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.client_id && t.estimated_hours) {
      hoursByClient[t.client_id] = (hoursByClient[t.client_id] || 0) + t.estimated_hours;
    }
  });
  const hoursClientData = Object.entries(hoursByClient)
    .map(([cid, hours]) => ({ name: truncate(clientMap[cid] || 'Sem cliente', 20), hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Table: overdue tasks
  const overdueRows = overdueTasks
    .map(t => ({
      title: t.title,
      project: projectMap[t.project_id || '']?.name || '-',
      responsible: t.assigned_to_name || (t.assigned_to ? memberMap[t.assigned_to] : null) || '-',
      dueDate: t.due_date!,
      daysOverdue: differenceInDays(today, new Date(t.due_date + 'T00:00:00')),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Table: workload by member
  const memberStats: Record<string, { active: number; hours: number; overdue: number }> = {};
  tasks.forEach(t => {
    const uid = t.assigned_to;
    if (!uid) return;
    if (!memberStats[uid]) memberStats[uid] = { active: 0, hours: 0, overdue: 0 };
    if (t.status !== 'done') {
      memberStats[uid].active++;
      memberStats[uid].hours += t.estimated_hours || 0;
      if (t.due_date && new Date(t.due_date + 'T00:00:00') < today) {
        memberStats[uid].overdue++;
      }
    }
  });
  const memberRows = Object.entries(memberStats)
    .map(([uid, s]) => ({ name: memberMap[uid] || uid.slice(0, 8), ...s }))
    .sort((a, b) => b.active - a.active);

  // Bar: tasks by area
  const tasksByArea: Record<string, number> = {};
  tasks.forEach(t => {
    const proj = projectMap[t.project_id || ''];
    const areaName = proj?.area_id ? (areaMap[proj.area_id] || 'Sem área') : 'Sem área';
    tasksByArea[areaName] = (tasksByArea[areaName] || 0) + 1;
  });
  const areaChartData = Object.entries(tasksByArea)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área fiscal">
      <div className="space-y-6">
        {/* LINE 1 — KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total de Projetos" value={totalProjects} icon={<FolderKanban className="h-4 w-4 text-emerald-600" />} loading={isLoading} sub="projetos cadastrados" />
          <KPICard title="Em Andamento" value={activeProjects} icon={<Clock className="h-4 w-4 text-blue-600" />} loading={isLoading} sub={totalProjects > 0 ? `${Math.round((activeProjects / totalProjects) * 100)}% do total` : '0%'} />
          <KPICard title="Concluídos" value={completedProjects} icon={<CheckCircle className="h-4 w-4 text-green-600" />} loading={isLoading} sub="projetos finalizados" />
          <KPICard title="Pausados" value={onHoldProjects} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} loading={isLoading} sub="Requer atenção" />
          <KPICard title="Total de Tarefas" value={totalTasks} icon={<ListChecks className="h-4 w-4 text-indigo-600" />} loading={isLoading} sub="tarefas top-level" />
          <KPICard
            title="Tarefas Atrasadas"
            value={overdueTasks.length}
            icon={<AlertCircle className="h-4 w-4 text-red-600" />}
            loading={isLoading}
            sub="vencidas e não concluídas"
            className={overdueTasks.length > 0 ? 'border-red-300 bg-red-50/40' : ''}
          />
        </div>

        {/* LINE 2 — 3 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200/60">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Tarefas por Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {isLoading ? <LoadingSpinner /> : statusCounts.length === 0 ? <EmptyMsg msg="Nenhuma tarefa cadastrada" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {statusCounts.map(s => <Cell key={s.key} fill={PIE_COLORS[s.key] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Tarefas']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Horas Est. por Projeto</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {isLoading ? <LoadingSpinner /> : hoursProjectData.length === 0 ? <EmptyMsg msg="Sem dados de horas — preencha as horas estimadas nas tarefas" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursProjectData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(v: number) => [`${v}h`, 'Horas']} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="hours" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Horas Est. por Cliente</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {isLoading ? <LoadingSpinner /> : hoursClientData.length === 0 ? <EmptyMsg msg="Sem dados de horas — preencha as horas estimadas nas tarefas" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursClientData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(v: number) => [`${v}h`, 'Horas']} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LINE 3 — 2 Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Tarefas Atrasadas</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <LoadingSpinner /> : overdueRows.length === 0 ? <EmptyMsg msg="Nenhuma tarefa atrasada 🎉" /> : (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarefa</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueRows.slice(0, 15).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium max-w-[180px] truncate">{r.title}</TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-[120px] truncate">{r.project}</TableCell>
                          <TableCell className="text-sm text-slate-600">{r.responsible}</TableCell>
                          <TableCell className="text-sm text-slate-600">{format(new Date(r.dueDate + 'T00:00:00'), 'dd/MM')}</TableCell>
                          <TableCell className="text-sm font-semibold text-red-600 text-right">{r.daysOverdue}d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60">
            <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Carga por Membro</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <LoadingSpinner /> : memberRows.length === 0 ? <EmptyMsg msg="Sem dados de atribuição" /> : (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead className="text-right">Ativas</TableHead>
                        <TableHead className="text-right">Horas Est.</TableHead>
                        <TableHead className="text-right">Atrasadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{r.name}</TableCell>
                          <TableCell className="text-sm text-slate-600 text-right">{r.active}</TableCell>
                          <TableCell className="text-sm text-slate-600 text-right">{r.hours > 0 ? `${r.hours}h` : '-'}</TableCell>
                          <TableCell className={`text-sm font-semibold text-right ${r.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>{r.overdue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LINE 4 — Tasks by Area */}
        <Card className="border-slate-200/60">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-900">Tarefas por Área Fiscal</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? <LoadingSpinner /> : areaChartData.length === 0 ? <EmptyMsg msg="Sem dados de área" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaChartData} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, 'Tarefas']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </FiscalLayout>
  );
};

// --- Helper components ---

function KPICard({ title, value, icon, loading, sub, className = '' }: {
  title: string; value: number; icon: React.ReactNode; loading: boolean; sub: string; className?: string;
}) {
  return (
    <Card className={`border-slate-200/60 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{loading ? '-' : value}</div>
        <p className="text-xs text-slate-500">{sub}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
}

function EmptyMsg({ msg }: { msg: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm text-slate-500">{msg}</p></div>;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.substring(0, max) + '…' : s;
}

export default FiscalDashboard;
