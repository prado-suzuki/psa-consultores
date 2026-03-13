import { useState, useMemo } from 'react';
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

const FREQUENCY_OPTIONS = [
  { value: 'diaria', label: 'Diária', multiplier: 22 },
  { value: 'semanal', label: 'Semanal', multiplier: 4 },
  { value: 'quinzenal', label: 'Quinzenal', multiplier: 2 },
  { value: 'mensal', label: 'Mensal', multiplier: 1 },
  { value: 'trimestral', label: 'Trimestral', multiplier: 0.33 },
  { value: 'anual', label: 'Anual', multiplier: 0.083 },
];

function calcVolume(timeCurrent: string, frequency: string): string {
  const hours = parseFloat(timeCurrent);
  const mult = FREQUENCY_OPTIONS.find(f => f.value === frequency)?.multiplier || 0;
  if (!hours || !mult) return '';
  const vol = hours * mult;
  return `${vol % 1 === 0 ? vol : vol.toFixed(1)}h/mês`;
}

export function NewStageForm({ processId, nextOrder, jobRoles, onCreated, onCancel }: NewStageFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    time_current: '',
    time_target: '',
    frequency: '',
    automation_level: 'none',
    job_role_id: ''
  });

  const calculatedVolume = useMemo(() => calcVolume(form.time_current, form.frequency), [form.time_current, form.frequency]);

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
        .insert({
          process_id: processId,
          stage_order: nextOrder,
          name: form.name.trim(),
          description: form.description.trim() || null,
          time_current: form.time_current || null,
          time_target: form.time_target || null,
          frequency: form.frequency || null,
          volume: volume || null,
          automation_level: form.automation_level === 'none' ? null : form.automation_level,
          job_role_id: form.job_role_id || null,
          inputs: [],
          outputs: [],
          systems: []
        });

      if (error) throw error;

      toast({ title: "Etapa criada", description: "A nova etapa foi adicionada com sucesso." });
      onCreated();
    } catch (error: any) {
      console.error('Error creating stage:', error);
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
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
            <Label htmlFor="new-stage-time-current">Tempo Atual (h)</Label>
            <div className="relative">
              <Input
                id="new-stage-time-current"
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
            <Label htmlFor="new-stage-time-target">Tempo Alvo (h)</Label>
            <div className="relative">
              <Input
                id="new-stage-time-target"
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
            <Label htmlFor="new-stage-frequency">Frequência</Label>
            <Select
              value={form.frequency || 'none'}
              onValueChange={(v) => setForm({ ...form, frequency: v === 'none' ? '' : v })}
            >
              <SelectTrigger id="new-stage-frequency">
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
