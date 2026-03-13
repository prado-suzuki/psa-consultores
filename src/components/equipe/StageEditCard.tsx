import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Edit2, Trash2, Save, X, Zap, Clock, Loader2, Briefcase, BarChart3 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Json } from '@/integrations/supabase/types';

interface JobRole {
  id: string;
  name: string;
  level: string;
  category: string | null;
  hourly_rate: number;
}

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
  job_role_id: string | null;
}

interface StageEditCardProps {
  stage: ProcessStage;
  index: number;
  totalStages: number;
  jobRoles: JobRole[];
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

const FREQUENCY_OPTIONS = [
  { value: 'diaria', label: 'Diária', multiplier: 22 },
  { value: 'semanal', label: 'Semanal', multiplier: 4 },
  { value: 'quinzenal', label: 'Quinzenal', multiplier: 2 },
  { value: 'mensal', label: 'Mensal', multiplier: 1 },
  { value: 'trimestral', label: 'Trimestral', multiplier: 0.33 },
  { value: 'anual', label: 'Anual', multiplier: 0.083 },
];

function getFrequencyMultiplier(freq: string): number {
  return FREQUENCY_OPTIONS.find(f => f.value === freq)?.multiplier || 0;
}

function getFrequencyLabel(freq: string): string {
  return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
}

function calcVolume(timeCurrent: string, frequency: string): string {
  const hours = parseFloat(timeCurrent);
  const mult = getFrequencyMultiplier(frequency);
  if (!hours || !mult) return '';
  const vol = hours * mult;
  return `${vol % 1 === 0 ? vol : vol.toFixed(1)}h/mês`;
}

export function StageEditCard({ stage, index, totalStages, jobRoles, onUpdate, onDelete }: StageEditCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: stage.name,
    description: stage.description || '',
    time_current: stage.time_current || '',
    time_target: stage.time_target || '',
    frequency: stage.frequency || '',
    automation_level: stage.automation_level || 'none',
    job_role_id: stage.job_role_id || ''
  });

  const calculatedVolume = useMemo(() => calcVolume(form.time_current, form.frequency), [form.time_current, form.frequency]);

  const getAutomationInfo = (level: string | null) => {
    return AUTOMATION_LEVELS.find(a => a.value === level) || AUTOMATION_LEVELS[0];
  };

  const roleName = useMemo(() => {
    if (!stage.job_role_id) return null;
    const role = jobRoles.find(r => r.id === stage.job_role_id);
    return role ? `${role.name} (R$ ${role.hourly_rate}/h)` : null;
  }, [stage.job_role_id, jobRoles]);

  const readOnlyVolume = useMemo(() => {
    return calcVolume(stage.time_current || '', stage.frequency || '');
  }, [stage.time_current, stage.frequency]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Erro", description: "O nome da etapa é obrigatório.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const volume = calcVolume(form.time_current, form.frequency);
      const { error } = await supabase
        .from('process_stages')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          time_current: form.time_current || null,
          time_target: form.time_target || null,
          frequency: form.frequency || null,
          volume: volume || null,
          automation_level: form.automation_level === 'none' ? null : form.automation_level,
          job_role_id: form.job_role_id || null
        })
        .eq('id', stage.id);

      if (error) throw error;

      toast({ title: "Etapa atualizada", description: "As alterações foram salvas com sucesso." });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving stage:', error);
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('process_stages').delete().eq('id', stage.id);
      if (error) throw error;
      toast({ title: "Etapa excluída", description: "A etapa foi removida com sucesso." });
      onDelete();
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      name: stage.name,
      description: stage.description || '',
      time_current: stage.time_current || '',
      time_target: stage.time_target || '',
      frequency: stage.frequency || '',
      automation_level: stage.automation_level || 'none',
      job_role_id: stage.job_role_id || ''
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
              <Label htmlFor={`stage-job-role-${stage.id}`}>Cargo/Função</Label>
              <Select
                value={form.job_role_id || 'none'}
                onValueChange={(v) => setForm({ ...form, job_role_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger id={`stage-job-role-${stage.id}`}>
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
              <Label htmlFor={`stage-time-current-${stage.id}`}>Tempo Atual (h)</Label>
              <div className="relative">
                <Input
                  id={`stage-time-current-${stage.id}`}
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.time_current}
                  onChange={(e) => setForm({ ...form, time_current: e.target.value })}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">h</span>
              </div>
            </div>

            <div>
              <Label htmlFor={`stage-time-target-${stage.id}`}>Tempo Alvo (h)</Label>
              <div className="relative">
                <Input
                  id={`stage-time-target-${stage.id}`}
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.time_target}
                  onChange={(e) => setForm({ ...form, time_target: e.target.value })}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">h</span>
              </div>
            </div>

            <div>
              <Label htmlFor={`stage-frequency-${stage.id}`}>Frequência</Label>
              <Select
                value={form.frequency || 'none'}
                onValueChange={(v) => setForm({ ...form, frequency: v === 'none' ? '' : v })}
              >
                <SelectTrigger id={`stage-frequency-${stage.id}`}>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Volume (auto)</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                {calculatedVolume || <span className="text-muted-foreground">—</span>}
              </div>
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
            {roleName && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Cargo
                </span>
                <p className="font-medium">{roleName}</p>
              </div>
            )}
            {(stage.time_current || stage.time_target) && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Tempo
                </span>
                <p className="font-medium">
                  {stage.time_current ? `${stage.time_current}h` : '-'} → {stage.time_target ? `${stage.time_target}h` : '-'}
                </p>
              </div>
            )}
            {stage.frequency && (
              <div>
                <span className="text-muted-foreground">Frequência</span>
                <p className="font-medium">{getFrequencyLabel(stage.frequency)}</p>
              </div>
            )}
            {readOnlyVolume && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Volume
                </span>
                <p className="font-medium">{readOnlyVolume}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
