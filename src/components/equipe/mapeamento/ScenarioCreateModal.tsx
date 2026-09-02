import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Target, TrendingUp, Zap, DollarSign, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useProcessScenarios,
  type ScenarioKind,
  type ScenarioUnitBasis,
  type ScenarioParameters,
  type ScenarioComputedMetrics,
  type TeamMemberAlloc,
} from '@/hooks/useProcessScenarios';
import type { MappingProcess } from '@/hooks/useProcessMapping';
import { useDomainScenarioCreate } from '@/hooks/useDomainScenarioCreate';

interface ScenarioCreateModalProps {
  open: boolean;
  onClose: () => void;
  processes: MappingProcess[];
  initialProcessId?: string;
  onCreated?: () => void;
}

const KIND_INFO: Record<ScenarioKind, {
  label: string;
  icon: any;
  description: string;
  variedField: string;
  variedLabel: string;
  lockedDefault: string[];
  color: string;
}> = {
  scale: {
    label: 'Escala',
    icon: TrendingUp,
    description: 'Varia volume. Mede como o ROI muda quando o cliente cresce ou diminui.',
    variedField: 'volume',
    variedLabel: 'Volume mensal de execuções',
    lockedDefault: ['team_members', 'time_per_unit', 'systems'],
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  efficiency: {
    label: 'Eficiência',
    icon: Zap,
    description: 'Varia tempo total. Mede ganho de automação ou redução de etapas mantendo volume e equipe.',
    variedField: 'time',
    variedLabel: 'Tempo total alvo (horas/mês)',
    lockedDefault: ['volume', 'team_composition', 'systems'],
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  investment: {
    label: 'Investimento',
    icon: DollarSign,
    description: 'Varia custos de sistema / build vs buy. Mede payback de decisão de investment mantendo operacional.',
    variedField: 'savings',
    variedLabel: 'Economia recorrente (R$/mês)',
    lockedDefault: ['volume', 'team_members', 'time_total'],
    color: 'text-teal-600 bg-accent/5 border-primary/15',
  },
};

export function ScenarioCreateModal({ open, onClose, processes, initialProcessId, onCreated }: ScenarioCreateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [processId, setProcessId] = useState<string>(initialProcessId ?? '');
  const [kind, setKind] = useState<ScenarioKind>('efficiency');
  const [unitBasis, setUnitBasis] = useState<ScenarioUnitBasis>('per_month');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [baselineMembers, setBaselineMembers] = useState<TeamMemberAlloc[]>([]);
  const [improvedMembers, setImprovedMembers] = useState<TeamMemberAlloc[]>([]);

  const [params, setParams] = useState<ScenarioParameters>({
    baseline_time_hours: 0,
    baseline_volume: 0,
    baseline_people_involved: 1,
    improved_time_hours: 0,
    improved_volume: 0,
    improved_people_involved: 1,
    implementation_hours: 0,
    system_savings_monthly: 0,
    build_vs_buy_savings: 0,
    other_savings_monthly: 0,
  });

  const [preview, setPreview] = useState<ScenarioComputedMetrics | null>(null);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { jobRoles } = useDomainScenarioCreate(open);
  const { create, compute } = useProcessScenarios(processId);

  const selectedProcess = useMemo(
    () => processes.find(p => p.id === processId) ?? null,
    [processes, processId]
  );

  // Pré-popular baseline a partir do processo selecionado
  useEffect(() => {
    if (!selectedProcess) return;
    const baselineTime = selectedProcess.time_spent_hours ?? 0;
    const baselineVolume = selectedProcess.volume_executions ?? selectedProcess.volume_month ?? 0;
    const baselinePeople = selectedProcess.people_involved ?? 1;

    setParams(p => ({
      ...p,
      baseline_time_hours: baselineTime,
      baseline_volume: baselineVolume,
      baseline_people_involved: baselinePeople,
      improved_time_hours: baselineTime,
      improved_volume: baselineVolume,
      improved_people_involved: baselinePeople,
    }));
  }, [selectedProcess]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setStep(1);
      setProcessId(initialProcessId ?? '');
      setKind('efficiency');
      setUnitBasis('per_month');
      setName('');
      setDescription('');
      setBaselineMembers([]);
      setImprovedMembers([]);
      setPreview(null);
    }
  }, [open, initialProcessId]);

  const kindInfo = KIND_INFO[kind];

  // Recalcula preview sempre que params mudam
  useEffect(() => {
    if (step !== 3 || !processId) return;
    const handler = setTimeout(async () => {
      setComputing(true);
      try {
        const teamMembers: TeamMemberAlloc[] = [
          ...baselineMembers,
          ...improvedMembers,
        ];
        const result = await compute({
          ...params,
          team_members: teamMembers.length > 0 ? teamMembers : undefined,
          unit_basis: unitBasis,
        });
        setPreview(result);
      } catch (e: any) {
        console.error('[ScenarioCreateModal] compute:', e);
        toast({ title: 'Erro no cálculo', description: e.message, variant: 'destructive' });
      } finally {
        setComputing(false);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [step, processId, params, baselineMembers, improvedMembers, unitBasis, compute]);

  const canGoStep2 = !!processId;
  const canGoStep3 = !!kind && !!name.trim();

  const handleSave = async () => {
    if (!processId || !name.trim()) return;
    setSaving(true);
    try {
      const teamMembers: TeamMemberAlloc[] = [...baselineMembers, ...improvedMembers];
      await create({
        process_id: processId,
        name: name.trim(),
        description: description.trim() || undefined,
        scenario_kind: kind,
        unit_basis: unitBasis,
        varied_field: kindInfo.variedField,
        locked_fields: kindInfo.lockedDefault,
        parameters: {
          ...params,
          team_members: teamMembers.length > 0 ? teamMembers : undefined,
        },
        computed_metrics: preview,
      });
      toast({ title: 'Cenário criado!', description: name });
      onCreated?.();
      onClose();
    } catch (e: any) {
      console.error('[ScenarioCreateModal] save:', e);
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addMember = (group: 'baseline' | 'improved') => {
    const newMember: TeamMemberAlloc = {
      hours_allocated: 0,
      hourly_rate: jobRoles[0]?.hourly_rate ?? 50,
      is_baseline: group === 'baseline',
    };
    if (group === 'baseline') setBaselineMembers([...baselineMembers, newMember]);
    else setImprovedMembers([...improvedMembers, newMember]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cenário · Passo {step} de 3</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Escolha o processo base e o tipo de cenário'}
            {step === 2 && 'Defina o nome, base de cálculo e variáveis travadas'}
            {step === 3 && 'Ajuste a variável de teste e veja o resultado em tempo real'}
          </DialogDescription>
        </DialogHeader>

        {/* PASSO 1 — processo + kind */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Processo base</Label>
              <Select value={processId} onValueChange={setProcessId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um processo..." />
                </SelectTrigger>
                <SelectContent>
                  {processes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} · ` : ''}{p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProcess && (
                <p className="text-xs text-muted-foreground">
                  Baseline atual: {selectedProcess.time_spent_hours ?? 0}h · volume{' '}
                  {selectedProcess.volume_executions ?? selectedProcess.volume_month ?? 0}/mês ·{' '}
                  {selectedProcess.people_involved ?? 1} pessoa(s)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de cenário</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(KIND_INFO) as ScenarioKind[]).map(k => {
                  const info = KIND_INFO[k];
                  const Icon = info.icon;
                  const isSelected = kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected ? info.color : 'border-border hover:border-border'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-2" />
                      <p className="font-medium text-sm">{info.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2 — name, descrição, locked fields */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do cenário <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Ex: "Automatizar SPED — reduzir 40h para 5h"'
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qual hipótese você está testando?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base de cálculo</Label>
                <Select value={unitBasis} onValueChange={(v: ScenarioUnitBasis) => setUnitBasis(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_unit">Por unidade processada</SelectItem>
                    <SelectItem value="per_month">Mensal</SelectItem>
                    <SelectItem value="per_year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variável testada</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-warning/10 border-warning/40">
                  <Target className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">{kindInfo.variedLabel}</span>
                </div>
              </div>
            </div>

            <Card className="bg-muted">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Variáveis travadas neste cenário
                </p>
                <div className="flex flex-wrap gap-2">
                  {kindInfo.lockedDefault.map(field => (
                    <Badge key={field} variant="secondary" className="text-xs">{field}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Só a variável testada muda. As travadas mantêm o valor do baseline para garantir comparação válida.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PASSO 3 — params + preview */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Baseline (travado)</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Tempo total (h/mês)" value={params.baseline_time_hours} onChange={(v) => setParams({ ...params, baseline_time_hours: v })} disabled={kind === 'investment'} />
                    <Field label="Volume" value={params.baseline_volume} onChange={(v) => setParams({ ...params, baseline_volume: v })} disabled={kind !== 'scale' && kind !== 'investment'} />
                    <Field label="Pessoas" value={params.baseline_people_involved} onChange={(v) => setParams({ ...params, baseline_people_involved: v })} disabled />
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-2 ${kindInfo.color.split(' ')[2]}`}>
                <CardContent className="p-4 space-y-3">
                  <p className={`text-xs font-medium uppercase ${kindInfo.color.split(' ')[0]}`}>
                    Variante — {kindInfo.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Tempo total (h/mês)" value={params.improved_time_hours} onChange={(v) => setParams({ ...params, improved_time_hours: v })} highlight={kind === 'efficiency'} disabled={kind === 'investment'} />
                    <Field label="Volume" value={params.improved_volume} onChange={(v) => setParams({ ...params, improved_volume: v })} highlight={kind === 'scale'} disabled={kind === 'efficiency'} />
                    <Field label="Horas implementação" value={params.implementation_hours} onChange={(v) => setParams({ ...params, implementation_hours: v })} />
                    {kind === 'investment' && (
                      <>
                        <Field label="Economia sistema (R$/mês)" value={params.system_savings_monthly ?? 0} onChange={(v) => setParams({ ...params, system_savings_monthly: v })} highlight />
                        <Field label="Build vs Buy (R$ único)" value={params.build_vs_buy_savings ?? 0} onChange={(v) => setParams({ ...params, build_vs_buy_savings: v })} highlight />
                        <Field label="Outras (R$/mês)" value={params.other_savings_monthly ?? 0} onChange={(v) => setParams({ ...params, other_savings_monthly: v })} highlight />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Card className="bg-gradient-to-br from-accent/5 to-emerald-50 border-primary/15">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-teal-700 uppercase">Resultado projetado</p>
                    {computing && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
                  </div>
                  {preview ? (
                    <div className="space-y-3">
                      <Metric label="ROI anual" value={`${preview.roi_percentage.toFixed(0)}%`} accent />
                      <Metric label="Economia mensal" value={`R$ ${preview.cost_saved_monthly.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
                      <Metric label="Economia anual" value={`R$ ${preview.annual_savings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
                      <Metric label="Payback" value={preview.payback_months > 0 ? `${preview.payback_months.toFixed(1)} meses` : '—'} />
                      <Metric label="Tempo economizado/mês" value={`${preview.time_saved_hours.toFixed(1)}h (${preview.time_saved_percent.toFixed(0)}%)`} />
                      <Metric label="FTE liberado" value={preview.fte_saved.toFixed(2)} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ajuste os parâmetros para ver o resultado.</p>
                  )}
                </CardContent>
              </Card>

              {preview && unitBasis !== 'per_month' && (
                <Card>
                  <CardContent className="p-3 text-xs space-y-1">
                    <p className="text-muted-foreground font-medium">Visões alternativas</p>
                    <div className="flex justify-between">
                      <span>Por unidade:</span>
                      <span>R$ {preview.views.per_unit?.cost_saved.toFixed(2) ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Por mês:</span>
                      <span>R$ {preview.views.per_month.cost_saved.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Por ano:</span>
                      <span>R$ {preview.views.per_year.cost_saved.toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {step < 3 && (
            <Button
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
            >
              Avançar
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSave} disabled={saving || computing}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar cenário
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  highlight?: boolean;
}

function Field({ label, value, onChange, disabled, highlight }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label className={`text-xs ${disabled ? 'text-muted-foreground' : ''}`}>
        {label}
        {disabled && <Lock className="h-3 w-3 inline ml-1" />}
      </Label>
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className={`h-8 text-sm ${highlight ? 'border-warning/50 font-semibold' : ''}`}
      />
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  accent?: boolean;
}

function Metric({ label, value, accent }: MetricProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-teal-700 text-lg' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
