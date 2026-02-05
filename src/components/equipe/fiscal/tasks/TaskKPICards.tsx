 import { Card, CardContent } from '@/components/ui/card';
 import { useTaskStatusCounts } from '@/hooks/useFiscalTasks';
 import { cn } from '@/lib/utils';
 
 const statusConfig = [
   { key: 'backlog' as const, label: 'Backlog', color: 'bg-slate-100 text-slate-700' },
   { key: 'todo' as const, label: 'A Fazer', color: 'bg-blue-100 text-blue-700' },
   { key: 'in_progress' as const, label: 'Em Progresso', color: 'bg-amber-100 text-amber-700' },
   { key: 'review' as const, label: 'Revisão', color: 'bg-purple-100 text-purple-700' },
   { key: 'done' as const, label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
 ];
 
 export const TaskKPICards = () => {
   const counts = useTaskStatusCounts();
 
   return (
     <div className="grid grid-cols-5 gap-3">
       {statusConfig.map(status => (
         <Card key={status.key} className="border-0 shadow-sm">
           <CardContent className="p-4">
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">{status.label}</span>
               <span className={cn(
                 "text-2xl font-bold rounded-lg px-3 py-1",
                 status.color
               )}>
                 {counts[status.key]}
               </span>
             </div>
           </CardContent>
         </Card>
       ))}
     </div>
   );
 };