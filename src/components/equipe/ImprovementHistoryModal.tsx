 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent } from '@/components/ui/card';
 import { History, TrendingUp, Clock, DollarSign, Users, Calendar, Loader2 } from 'lucide-react';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 
 interface ProcessImprovement {
   id: string;
   created_at: string;
   evaluation_status: string | null;
   improvement_description: string | null;
   baseline_time_hours: number | null;
   improved_time_hours: number | null;
   baseline_cost_monthly: number | null;
   improved_cost_monthly: number | null;
   baseline_people_involved: number | null;
   improved_people_involved: number | null;
   time_saved_hours: number | null;
   time_saved_percent: number | null;
   cost_saved_monthly: number | null;
   cost_saved_percent: number | null;
   roi_percentage: number | null;
   evaluation_period_days: number | null;
   evaluated_by: string | null;
 }
 
 interface ImprovementHistoryModalProps {
   open: boolean;
   onClose: () => void;
   processId: string;
   processName: string;
 }
 
 export function ImprovementHistoryModal({ open, onClose, processId, processName }: ImprovementHistoryModalProps) {
   const [improvements, setImprovements] = useState<ProcessImprovement[]>([]);
   const [loading, setLoading] = useState(false);
 
   useEffect(() => {
     if (open && processId) {
       fetchImprovements();
     }
   }, [open, processId]);
 
   const fetchImprovements = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from('process_improvements')
         .select('*')
         .eq('process_id', processId)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       setImprovements(data || []);
     } catch (error) {
       console.error('Error fetching improvements:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const getStatusBadge = (status: string | null) => {
     switch (status) {
       case 'completed':
         return <Badge className="bg-green-100 text-green-700">Concluída</Badge>;
       case 'in_evaluation':
         return <Badge className="bg-amber-100 text-amber-700">Em Avaliação</Badge>;
       case 'cancelled':
         return <Badge className="bg-red-100 text-red-700">Cancelada</Badge>;
       default:
         return <Badge variant="outline">Pendente</Badge>;
     }
   };
 
   const formatCurrency = (value: number | null) => {
     if (value === null) return '-';
     return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
   };
 
   const formatPercent = (value: number | null) => {
     if (value === null) return '-';
     return `${value.toFixed(1)}%`;
   };
 
   return (
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent className="max-w-3xl max-h-[85vh]">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <History className="h-5 w-5 text-primary" />
             Histórico de Melhorias
           </DialogTitle>
           <p className="text-sm text-muted-foreground">{processName}</p>
         </DialogHeader>
 
         <ScrollArea className="h-[60vh] pr-4">
           {loading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           ) : improvements.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p className="font-medium">Nenhuma melhoria registrada</p>
               <p className="text-sm">Use o botão "Avaliar Melhoria" para registrar uma versão otimizada.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {improvements.map((improvement, index) => (
                 <Card key={improvement.id} className="border-l-4 border-l-primary">
                   <CardContent className="pt-4">
                     <div className="flex items-start justify-between mb-3">
                       <div className="flex items-center gap-2">
                         <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                           {improvements.length - index}
                         </span>
                         <div>
                           <p className="text-sm text-muted-foreground flex items-center gap-1">
                             <Calendar className="h-3 w-3" />
                             {format(new Date(improvement.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                           </p>
                         </div>
                       </div>
                       {getStatusBadge(improvement.evaluation_status)}
                     </div>
 
                     {improvement.improvement_description && (
                       <p className="text-sm text-foreground mb-4 bg-muted/50 p-3 rounded">
                         {improvement.improvement_description}
                       </p>
                     )}
 
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                       <div className="bg-background p-3 rounded border">
                         <div className="flex items-center gap-1 text-muted-foreground mb-1">
                           <Clock className="h-3 w-3" />
                           <span>Tempo Economizado</span>
                         </div>
                         <p className="font-semibold text-green-600">
                           {improvement.time_saved_hours ? `${improvement.time_saved_hours}h` : '-'}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {formatPercent(improvement.time_saved_percent)}
                         </p>
                       </div>
 
                       <div className="bg-background p-3 rounded border">
                         <div className="flex items-center gap-1 text-muted-foreground mb-1">
                           <DollarSign className="h-3 w-3" />
                           <span>Economia Mensal</span>
                         </div>
                         <p className="font-semibold text-green-600">
                           {formatCurrency(improvement.cost_saved_monthly)}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {formatPercent(improvement.cost_saved_percent)}
                         </p>
                       </div>
 
                       <div className="bg-background p-3 rounded border">
                         <div className="flex items-center gap-1 text-muted-foreground mb-1">
                           <TrendingUp className="h-3 w-3" />
                           <span>ROI</span>
                         </div>
                         <p className="font-semibold text-primary">
                           {formatPercent(improvement.roi_percentage)}
                         </p>
                       </div>
 
                       <div className="bg-background p-3 rounded border">
                         <div className="flex items-center gap-1 text-muted-foreground mb-1">
                           <Users className="h-3 w-3" />
                           <span>Pessoas</span>
                         </div>
                         <p className="font-semibold">
                           {improvement.baseline_people_involved || '-'} → {improvement.improved_people_involved || '-'}
                         </p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }