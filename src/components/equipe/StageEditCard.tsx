 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { toast } from '@/hooks/use-toast';
 import { Edit2, Trash2, Save, X, Zap, User, Clock, Loader2 } from 'lucide-react';
 import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
 import { Json } from '@/integrations/supabase/types';
 
 interface ProcessStage {
   id: string;
   process_id: string | null;
   name: string;
   stage_order: number;
   description: string | null;
   responsible: string | null;
   time_current: string | null;
   time_target: string | null;
   frequency: string | null;
   volume: string | null;
   automation_level: string | null;
   inputs: Json;
   outputs: Json;
   systems: Json;
   related_projects: string[] | null;
 }
 
 interface StageEditCardProps {
   stage: ProcessStage;
   index: number;
   totalStages: number;
   onUpdate: () => void;
   onDelete: () => void;
 }
 
 const AUTOMATION_LEVELS = [
   { value: 'none', label: 'Nenhuma', color: 'bg-gray-100 text-gray-600' },
   { value: 'low', label: 'Baixa', color: 'bg-yellow-100 text-yellow-700' },
   { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-700' },
   { value: 'high', label: 'Alta', color: 'bg-green-100 text-green-700' },
   { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700' }
 ];
 
 export function StageEditCard({ stage, index, totalStages, onUpdate, onDelete }: StageEditCardProps) {
   const [isEditing, setIsEditing] = useState(false);
   const [saving, setSaving] = useState(false);
   const [deleting, setDeleting] = useState(false);
   const [form, setForm] = useState({
     name: stage.name,
     description: stage.description || '',
     responsible: stage.responsible || '',
     time_current: stage.time_current || '',
     time_target: stage.time_target || '',
     frequency: stage.frequency || '',
     volume: stage.volume || '',
     automation_level: stage.automation_level || 'none'
   });
 
   const getAutomationInfo = (level: string | null) => {
     return AUTOMATION_LEVELS.find(a => a.value === level) || AUTOMATION_LEVELS[0];
   };
 
   const handleSave = async () => {
     if (!form.name.trim()) {
       toast({
         title: "Erro",
         description: "O nome da etapa é obrigatório.",
         variant: "destructive"
       });
       return;
     }
 
     setSaving(true);
     try {
       const { error } = await supabase
         .from('process_stages')
         .update({
           name: form.name.trim(),
           description: form.description.trim() || null,
           responsible: form.responsible.trim() || null,
           time_current: form.time_current.trim() || null,
           time_target: form.time_target.trim() || null,
           frequency: form.frequency.trim() || null,
           volume: form.volume.trim() || null,
           automation_level: form.automation_level === 'none' ? null : form.automation_level
         })
         .eq('id', stage.id);
 
       if (error) throw error;
 
       toast({
         title: "Etapa atualizada",
         description: "As alterações foram salvas com sucesso."
       });
       setIsEditing(false);
       onUpdate();
     } catch (error: any) {
       console.error('Error saving stage:', error);
       toast({
         title: "Erro ao salvar",
         description: error.message,
         variant: "destructive"
       });
     } finally {
       setSaving(false);
     }
   };
 
   const handleDelete = async () => {
     setDeleting(true);
     try {
       const { error } = await supabase
         .from('process_stages')
         .delete()
         .eq('id', stage.id);
 
       if (error) throw error;
 
       toast({
         title: "Etapa excluída",
         description: "A etapa foi removida com sucesso."
       });
       onDelete();
     } catch (error: any) {
       console.error('Error deleting stage:', error);
       toast({
         title: "Erro ao excluir",
         description: error.message,
         variant: "destructive"
       });
     } finally {
       setDeleting(false);
     }
   };
 
   const cancelEdit = () => {
     setForm({
       name: stage.name,
       description: stage.description || '',
       responsible: stage.responsible || '',
       time_current: stage.time_current || '',
       time_target: stage.time_target || '',
       frequency: stage.frequency || '',
       volume: stage.volume || '',
       automation_level: stage.automation_level || 'none'
     });
     setIsEditing(false);
   };
 
   if (isEditing) {
     return (
       <Card className="border-l-4 border-l-amber-500">
         <CardHeader className="pb-2">
           <CardTitle className="text-base flex items-center gap-2">
             <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
               {stage.stage_order}
             </span>
             Editando Etapa
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
               <Label htmlFor={`stage-name-${stage.id}`}>Nome da Etapa *</Label>
               <Input
                 id={`stage-name-${stage.id}`}
                 value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })}
                 placeholder="Nome da etapa"
               />
             </div>
 
             <div className="col-span-2">
               <Label htmlFor={`stage-desc-${stage.id}`}>Descrição</Label>
               <Textarea
                 id={`stage-desc-${stage.id}`}
                 value={form.description}
                 onChange={(e) => setForm({ ...form, description: e.target.value })}
                 placeholder="Descreva a etapa..."
                 rows={2}
               />
             </div>
 
             <div>
               <Label htmlFor={`stage-responsible-${stage.id}`}>Responsável</Label>
               <Input
                 id={`stage-responsible-${stage.id}`}
                 value={form.responsible}
                 onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                 placeholder="Responsável"
               />
             </div>
 
             <div>
               <Label htmlFor={`stage-automation-${stage.id}`}>Nível de Automação</Label>
               <Select
                 value={form.automation_level}
                 onValueChange={(v) => setForm({ ...form, automation_level: v })}
               >
                 <SelectTrigger id={`stage-automation-${stage.id}`}>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {AUTOMATION_LEVELS.map(level => (
                     <SelectItem key={level.value} value={level.value}>
                       {level.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div>
               <Label htmlFor={`stage-time-current-${stage.id}`}>Tempo Atual</Label>
               <Input
                 id={`stage-time-current-${stage.id}`}
                 value={form.time_current}
                 onChange={(e) => setForm({ ...form, time_current: e.target.value })}
                 placeholder="Ex: 2h"
               />
             </div>
 
             <div>
               <Label htmlFor={`stage-time-target-${stage.id}`}>Tempo Alvo</Label>
               <Input
                 id={`stage-time-target-${stage.id}`}
                 value={form.time_target}
                 onChange={(e) => setForm({ ...form, time_target: e.target.value })}
                 placeholder="Ex: 30min"
               />
             </div>
 
             <div>
               <Label htmlFor={`stage-frequency-${stage.id}`}>Frequência</Label>
               <Input
                 id={`stage-frequency-${stage.id}`}
                 value={form.frequency}
                 onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                 placeholder="Ex: Diária"
               />
             </div>
 
             <div>
               <Label htmlFor={`stage-volume-${stage.id}`}>Volume</Label>
               <Input
                 id={`stage-volume-${stage.id}`}
                 value={form.volume}
                 onChange={(e) => setForm({ ...form, volume: e.target.value })}
                 placeholder="Ex: 100/mês"
               />
             </div>
           </div>
 
           <div className="flex justify-end gap-2 pt-2 border-t">
             <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
               <X className="h-4 w-4 mr-1" />
               Cancelar
             </Button>
             <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
               {saving ? (
                 <Loader2 className="h-4 w-4 mr-1 animate-spin" />
               ) : (
                 <Save className="h-4 w-4 mr-1" />
               )}
               Salvar
             </Button>
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="relative">
       {index < totalStages - 1 && (
         <div className="absolute left-6 top-full h-4 w-0.5 bg-border" />
       )}
 
       <Card className="border-l-4 border-l-primary">
         <CardHeader className="pb-2">
           <div className="flex items-center justify-between">
             <CardTitle className="text-base flex items-center gap-2">
               <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                 {stage.stage_order}
               </span>
               {stage.name}
             </CardTitle>
             <div className="flex items-center gap-2">
               {stage.automation_level && (
                 <Badge className={getAutomationInfo(stage.automation_level).color}>
                   <Zap className="h-3 w-3 mr-1" />
                   {getAutomationInfo(stage.automation_level).label}
                 </Badge>
               )}
               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                 <Edit2 className="h-4 w-4" />
               </Button>
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
                     <AlertDialogDescription>
                       Tem certeza que deseja excluir a etapa "{stage.name}"? Esta ação não pode ser desfeita.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                     <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                       {deleting ? 'Excluindo...' : 'Excluir'}
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
             </div>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {stage.description && (
             <p className="text-sm text-muted-foreground">{stage.description}</p>
           )}
 
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
             {stage.responsible && (
               <div>
                 <span className="text-muted-foreground flex items-center gap-1">
                   <User className="h-3 w-3" /> Responsável
                 </span>
                 <p className="font-medium">{stage.responsible}</p>
               </div>
             )}
             {(stage.time_current || stage.time_target) && (
               <div>
                 <span className="text-muted-foreground flex items-center gap-1">
                   <Clock className="h-3 w-3" /> Tempo
                 </span>
                 <p className="font-medium">
                   {stage.time_current || '-'} → {stage.time_target || '-'}
                 </p>
               </div>
             )}
             {stage.frequency && (
               <div>
                 <span className="text-muted-foreground">Frequência</span>
                 <p className="font-medium">{stage.frequency}</p>
               </div>
             )}
             {stage.volume && (
               <div>
                 <span className="text-muted-foreground">Volume</span>
                 <p className="font-medium">{stage.volume}</p>
               </div>
             )}
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }