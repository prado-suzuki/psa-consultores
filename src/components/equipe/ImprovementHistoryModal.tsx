 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent } from '@/components/ui/card';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { History, TrendingUp, Clock, DollarSign, Users, Calendar, Loader2, Monitor, ShoppingCart, Sparkles, ChevronDown } from 'lucide-react';
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
   system_savings_monthly: number | null;
   build_vs_buy_savings: number | null;
   other_savings_monthly: number | null;
 }
 
 interface SavingsDetail {
   id: string;
   savings_type: string;
   description: string;
   cost_before: number | null;
   cost_after: number | null;
   savings_value: number;
   is_monthly: boolean;
 }
 
 interface ImprovementHistoryModalProps {
   open: boolean;
   onClose: () => void;
   processId: string;
   processName: string;
 }
 
 export function ImprovementHistoryModal({ open, onClose, processId, processName }: ImprovementHistoryModalProps) {
   const [improvements, setImprovements] = useState<ProcessImprovement[]>([]);
   const [savingsDetails, setSavingsDetails] = useState<Record<string, SavingsDetail[]>>({});
   const [loading, setLoading] = useState(false);
   const [expandedSavings, setExpandedSavings] = useState<Record<string, boolean>>({});
 
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
       
       // Buscar detalhes das economias para cada melhoria
       if (data && data.length > 0) {
         const improvementIds = data.map(i => i.id);
         const { data: details, error: detailsError } = await supabase
           .from('improvement_savings_details')
           .select('*')
           .in('improvement_id', improvementIds);
         
         if (!detailsError && details) {
           // Agrupar por improvement_id
           const grouped: Record<string, SavingsDetail[]> = {};
           details.forEach(detail => {
             if (!grouped[detail.improvement_id]) {
               grouped[detail.improvement_id] = [];
             }
             grouped[detail.improvement_id].push(detail);
           });
           setSavingsDetails(grouped);
         }
       }
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
 
   const getSavingsTypeIcon = (type: string) => {
     switch (type) {
       case 'system': return <Monitor className="h-3 w-3 text-blue-600" />;
       case 'build_vs_buy': return <ShoppingCart className="h-3 w-3 text-purple-600" />;
       case 'other': return <Sparkles className="h-3 w-3 text-amber-600" />;
       default: return null;
     }
   };
 
   const getSavingsTypeLabel = (type: string) => {
     switch (type) {
       case 'system': return 'Sistemas';
       case 'build_vs_buy': return 'Build vs Buy';
       case 'other': return 'Outras';
       default: return type;
     }
   };
 
   const hasAdditionalSavings = (improvement: ProcessImprovement) => {
     return (improvement.system_savings_monthly || 0) > 0 || 
            (improvement.build_vs_buy_savings || 0) > 0 || 
            (improvement.other_savings_monthly || 0) > 0;
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
                     
                     {/* Economias Adicionais */}
                     {hasAdditionalSavings(improvement) && (
                       <Collapsible 
                         open={expandedSavings[improvement.id]} 
                         onOpenChange={(open) => setExpandedSavings({...expandedSavings, [improvement.id]: open})}
                       >
                         <CollapsibleTrigger asChild>
                           <div className="flex items-center justify-between p-2 mt-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                             <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                               <ChevronDown className={`h-4 w-4 transition-transform ${expandedSavings[improvement.id] ? 'rotate-180' : ''}`} />
                               Economias Adicionais
                             </div>
                             <div className="flex gap-2">
                               {(improvement.system_savings_monthly || 0) > 0 && (
                                 <Badge variant="outline" className="text-xs">
                                   <Monitor className="h-3 w-3 mr-1" />
                                   {formatCurrency(improvement.system_savings_monthly)}/mês
                                 </Badge>
                               )}
                               {(improvement.build_vs_buy_savings || 0) > 0 && (
                                 <Badge variant="outline" className="text-xs">
                                   <ShoppingCart className="h-3 w-3 mr-1" />
                                   {formatCurrency(improvement.build_vs_buy_savings)}
                                 </Badge>
                               )}
                               {(improvement.other_savings_monthly || 0) > 0 && (
                                 <Badge variant="outline" className="text-xs">
                                   <Sparkles className="h-3 w-3 mr-1" />
                                   {formatCurrency(improvement.other_savings_monthly)}/mês
                                 </Badge>
                               )}
                             </div>
                           </div>
                         </CollapsibleTrigger>
                         <CollapsibleContent>
                           <div className="mt-2 p-3 bg-muted/30 rounded space-y-2">
                             {savingsDetails[improvement.id]?.length > 0 ? (
                               <div className="space-y-2">
                                 {savingsDetails[improvement.id].map((detail) => (
                                   <div key={detail.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                     <div className="flex items-center gap-2">
                                       {getSavingsTypeIcon(detail.savings_type)}
                                       <span className="text-muted-foreground text-xs">
                                         [{getSavingsTypeLabel(detail.savings_type)}]
                                       </span>
                                       <span>{detail.description}</span>
                                     </div>
                                     <div className="flex items-center gap-4 text-xs">
                                       {(detail.cost_before || detail.cost_after) ? (
                                         <span className="text-muted-foreground">
                                           {formatCurrency(detail.cost_before)} → {formatCurrency(detail.cost_after)}
                                         </span>
                                       ) : null}
                                       <span className="font-medium text-green-600">
                                         {formatCurrency(detail.savings_value)}{detail.is_monthly ? '/mês' : ''}
                                       </span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-xs text-muted-foreground italic">
                                 Detalhamento não disponível para esta melhoria
                               </p>
                             )}
                           </div>
                         </CollapsibleContent>
                       </Collapsible>
                     )}
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