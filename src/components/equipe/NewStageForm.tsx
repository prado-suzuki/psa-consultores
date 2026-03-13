 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { toast } from '@/hooks/use-toast';
 import { Plus, Save, X, Loader2 } from 'lucide-react';
 import { RequiredMark } from '@/components/ui/required-mark';
 
interface JobRole {
  id: string;
  name: string;
  level: string;
  category: string | null;
  hourly_rate: number;
}

interface NewStageFormProps {
  processId: string;
  nextOrder: number;
  jobRoles: JobRole[];
  onCreated: () => void;
  onCancel: () => void;
}
 
 const AUTOMATION_LEVELS = [
   { value: 'none', label: 'Nenhuma' },
   { value: 'low', label: 'Baixa' },
   { value: 'medium', label: 'Média' },
   { value: 'high', label: 'Alta' },
   { value: 'critical', label: 'Crítica' }
 ];
 
export function NewStageForm({ processId, nextOrder, jobRoles, onCreated, onCancel }: NewStageFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    responsible: '',
    time_current: '',
    time_target: '',
    frequency: '',
    volume: '',
    automation_level: 'none',
    job_role_id: ''
  });
 
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
         .insert({
           process_id: processId,
           stage_order: nextOrder,
           name: form.name.trim(),
           description: form.description.trim() || null,
           responsible: form.responsible.trim() || null,
           time_current: form.time_current.trim() || null,
           time_target: form.time_target.trim() || null,
           frequency: form.frequency.trim() || null,
           volume: form.volume.trim() || null,
            automation_level: form.automation_level === 'none' ? null : form.automation_level,
            job_role_id: form.job_role_id || null,
            inputs: [],
           outputs: [],
           systems: []
         });
 
       if (error) throw error;
 
       toast({
         title: "Etapa criada",
         description: "A nova etapa foi adicionada com sucesso."
       });
       onCreated();
     } catch (error: any) {
       console.error('Error creating stage:', error);
       toast({
         title: "Erro ao criar",
         description: error.message,
         variant: "destructive"
       });
     } finally {
       setSaving(false);
     }
   };
 
   return (
     <Card className="border-l-4 border-l-green-500 border-dashed">
       <CardHeader className="pb-2">
         <CardTitle className="text-base flex items-center gap-2">
           <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
             <Plus className="h-4 w-4" />
           </span>
           Nova Etapa
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="grid grid-cols-2 gap-4">
           <div className="col-span-2">
             <Label htmlFor="new-stage-name">Nome da Etapa <RequiredMark /></Label>
             <Input
               id="new-stage-name"
               value={form.name}
               onChange={(e) => setForm({ ...form, name: e.target.value })}
               placeholder="Nome da etapa"
               autoFocus
             />
           </div>
 
           <div className="col-span-2">
             <Label htmlFor="new-stage-desc">Descrição</Label>
             <Textarea
               id="new-stage-desc"
               value={form.description}
               onChange={(e) => setForm({ ...form, description: e.target.value })}
               placeholder="Descreva a etapa..."
               rows={2}
             />
           </div>
 
           <div>
             <Label htmlFor="new-stage-responsible">Responsável</Label>
             <Input
               id="new-stage-responsible"
               value={form.responsible}
               onChange={(e) => setForm({ ...form, responsible: e.target.value })}
               placeholder="Responsável"
             />
           </div>
 
            <div>
              <Label htmlFor="new-stage-job-role">Cargo/Função</Label>
              <Select
                value={form.job_role_id || 'none'}
                onValueChange={(v) => setForm({ ...form, job_role_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger id="new-stage-job-role">
                  <SelectValue placeholder="Selecionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {jobRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} (R$ {role.hourly_rate}/h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-stage-automation">Nível de Automação</Label>
              <Select
                value={form.automation_level}
                onValueChange={(v) => setForm({ ...form, automation_level: v })}
              >
                <SelectTrigger id="new-stage-automation">
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
             <Label htmlFor="new-stage-time-current">Tempo Atual</Label>
             <Input
               id="new-stage-time-current"
               value={form.time_current}
               onChange={(e) => setForm({ ...form, time_current: e.target.value })}
               placeholder="Ex: 2h"
             />
           </div>
 
           <div>
             <Label htmlFor="new-stage-time-target">Tempo Alvo</Label>
             <Input
               id="new-stage-time-target"
               value={form.time_target}
               onChange={(e) => setForm({ ...form, time_target: e.target.value })}
               placeholder="Ex: 30min"
             />
           </div>
 
           <div>
             <Label htmlFor="new-stage-frequency">Frequência</Label>
             <Input
               id="new-stage-frequency"
               value={form.frequency}
               onChange={(e) => setForm({ ...form, frequency: e.target.value })}
               placeholder="Ex: Diária"
             />
           </div>
 
           <div>
             <Label htmlFor="new-stage-volume">Volume</Label>
             <Input
               id="new-stage-volume"
               value={form.volume}
               onChange={(e) => setForm({ ...form, volume: e.target.value })}
               placeholder="Ex: 100/mês"
             />
           </div>
         </div>
 
         <div className="flex justify-end gap-2 pt-2 border-t">
           <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
             <X className="h-4 w-4 mr-1" />
             Cancelar
           </Button>
           <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
             {saving ? (
               <Loader2 className="h-4 w-4 mr-1 animate-spin" />
             ) : (
               <Save className="h-4 w-4 mr-1" />
             )}
             Criar Etapa
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }