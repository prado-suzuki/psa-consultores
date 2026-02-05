import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FiscalDashboard = () => {
   // Fetch tax projects with hours data
   const { data: projectsData = [], isLoading } = useQuery({
     queryKey: ['fiscal-dashboard-projects'],
     queryFn: async () => {
       const { data: projects } = await supabase
          .from('tax_projects')
         .select(`
           id, 
            name,
            status
         `)
         .order('name');
       
       return (projects || []).map(p => ({
         id: p.id,
         name: p.name,
         status: p.status,
          estimatedHours: 0,
          spentHours: 0,
       }));
     },
   });

   const totalProjects = projectsData.length;
   const activeProjects = projectsData.filter(p => p.status === 'active').length;
   const completedProjects = projectsData.filter(p => p.status === 'completed').length;
   const onHoldProjects = projectsData.filter(p => p.status === 'on_hold').length;

   const hoursChartData = projectsData
     .filter(p => p.estimatedHours > 0 || p.spentHours > 0)
     .slice(0, 8)
     .map(p => ({
       name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
       estimado: p.estimatedHours,
       realizado: p.spentHours,
     }));

   const colors = ['#10b981', '#3b82f6'];

  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área fiscal">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-slate-600">Total de Projetos</CardTitle>
               <FolderKanban className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-slate-900">{isLoading ? '-' : totalProjects}</div>
               <p className="text-xs text-slate-500">projetos cadastrados</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-slate-900">{isLoading ? '-' : activeProjects}</div>
               <p className="text-xs text-slate-500">{totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0}% do total</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-slate-900">{isLoading ? '-' : completedProjects}</div>
               <p className="text-xs text-slate-500">projetos finalizados</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-slate-600">Pausados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-slate-900">{isLoading ? '-' : onHoldProjects}</div>
              <p className="text-xs text-slate-500">Requer atenção</p>
            </CardContent>
          </Card>
        </div>

         {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60">
            <CardHeader>
               <CardTitle className="text-sm font-medium text-slate-900">Projetos por Status</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-64 flex items-center justify-center">
                 {isLoading ? (
                   <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                 ) : totalProjects === 0 ? (
                   <p className="text-sm text-slate-500">Nenhum projeto cadastrado</p>
                 ) : (
                   <div className="w-full space-y-4">
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600">Ativos</span>
                       <div className="flex items-center gap-2">
                         <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-blue-500 rounded-full" 
                             style={{ width: `${(activeProjects / totalProjects) * 100}%` }}
                           />
                         </div>
                         <span className="text-sm font-medium text-slate-900 w-8 text-right">{activeProjects}</span>
                       </div>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600">Concluídos</span>
                       <div className="flex items-center gap-2">
                         <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-emerald-500 rounded-full" 
                             style={{ width: `${(completedProjects / totalProjects) * 100}%` }}
                           />
                         </div>
                         <span className="text-sm font-medium text-slate-900 w-8 text-right">{completedProjects}</span>
                       </div>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600">Pausados</span>
                       <div className="flex items-center gap-2">
                         <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-amber-500 rounded-full" 
                             style={{ width: `${(onHoldProjects / totalProjects) * 100}%` }}
                           />
                         </div>
                         <span className="text-sm font-medium text-slate-900 w-8 text-right">{onHoldProjects}</span>
                       </div>
                     </div>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader>
               <CardTitle className="text-sm font-medium text-slate-900">Horas por Projeto</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-64">
                 {isLoading ? (
                   <div className="h-full flex items-center justify-center">
                     <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                   </div>
                 ) : hoursChartData.length === 0 ? (
                   <div className="h-full flex items-center justify-center">
                     <p className="text-sm text-slate-500">Sem dados de horas</p>
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={hoursChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                       <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={80} />
                       <Tooltip 
                         formatter={(value: number) => [`${value}h`]}
                         contentStyle={{ fontSize: 12 }}
                       />
                       <Bar dataKey="estimado" name="Estimado" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                       <Bar dataKey="realizado" name="Realizado" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                     </BarChart>
                   </ResponsiveContainer>
                 )}
              </div>
               {hoursChartData.length > 0 && (
                 <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded bg-emerald-500" />
                     <span className="text-xs text-slate-600">Estimado</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded bg-blue-500" />
                     <span className="text-xs text-slate-600">Realizado</span>
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FiscalLayout>
  );
};

export default FiscalDashboard;
