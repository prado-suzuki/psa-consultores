import { useEffect, useMemo, useState } from 'react';
import {
  useDomainProcessImprovement,
  type DomainProcessImprovementJobRole,
  type DomainProcessRoiResults,
} from '@/hooks/useDomainProcessImprovement';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TeamComparison } from '@/components/equipe/process-improvement/TeamComparison';
import { SavingsSections } from '@/components/equipe/process-improvement/SavingsSections';
import { PreviewCard, RoiResultCard } from '@/components/equipe/process-improvement/ResultCards';
import {
  buildImprovementPayload,
  buildProcessUpdatePayload,
  buildSavingsDetailsPayload,
  buildTeamMembersPayload,
  calculateSavingsTotal,
  calculateTeamCost,
  calculateTeamHours,
  createSavingsItem,
  getErrorMessage,
  type ProcessImprovementForm,
  type SavingsItem,
  type SavingsType,
  type TeamMember,
} from '@/lib/processImprovement';
import { toast } from '@/hooks/use-toast';
import { Loader2, TrendingUp } from 'lucide-react';

interface ProcessImprovementModalProps {
  open: boolean;
  onClose: () => void;
  processId: string;
  processName: string;
  deliverableId?: string;
  projectId?: string;
  baselineData?: {
    time_spent_hours?: number;
    cost_monthly?: number;
    volume_executions?: number;
    people_involved?: number;
    evaluation_period_days?: number;
  };
  onSaved?: () => void;
}

export function ProcessImprovementModal({
  open,
  onClose,
  processId,
  processName,
  deliverableId,
  projectId,
  baselineData,
  onSaved,
}: ProcessImprovementModalProps) {
  const { user } = useAuth();
  const {
    jobRolesQuery,
    createImprovementMutation,
    createSavingsDetailsMutation,
    createTeamMembersMutation,
    calculateRoiMutation,
    updateProcessMutation,
  } = useDomainProcessImprovement(open);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [jobRoles, setJobRoles] = useState<DomainProcessImprovementJobRole[]>([]);
  const [baselineMembers, setBaselineMembers] = useState<TeamMember[]>([]);
  const [improvedMembers, setImprovedMembers] = useState<TeamMember[]>([]);
  const [results, setResults] = useState<DomainProcessRoiResults | null>(null);
  const [systemSavings, setSystemSavings] = useState<SavingsItem[]>([]);
  const [buildVsBuySavings, setBuildVsBuySavings] = useState<SavingsItem[]>([]);
  const [otherSavings, setOtherSavings] = useState<SavingsItem[]>([]);
  const [openSections, setOpenSections] = useState<Record<SavingsType, boolean>>({
    system: false,
    build_vs_buy: false,
    other: false,
  });
  const [form, setForm] = useState<ProcessImprovementForm>({
    process_id: processId,
    sprint_deliverable_id: deliverableId,
    project_id: projectId,
    baseline_time_hours: baselineData?.time_spent_hours || 0,
    baseline_cost_monthly: baselineData?.cost_monthly || 0,
    baseline_volume: baselineData?.volume_executions || 0,
    baseline_people_involved: baselineData?.people_involved || 1,
    improved_time_hours: 0,
    improved_cost_monthly: 0,
    improved_volume: 0,
    improved_people_involved: 1,
    evaluation_period_days: baselineData?.evaluation_period_days || 30,
    implementation_hours: 0,
    improvement_description: '',
  });

  useEffect(() => {
    const response = jobRolesQuery.data;
    if (response && !response.error && response.data) setJobRoles(response.data);
  }, [jobRolesQuery.data]);

  const savingsTotals = useMemo(() => ({
    system: calculateSavingsTotal(systemSavings),
    buildVsBuy: calculateSavingsTotal(buildVsBuySavings),
    other: calculateSavingsTotal(otherSavings),
  }), [systemSavings, buildVsBuySavings, otherSavings]);

  const baselineCost = calculateTeamCost(baselineMembers);
  const improvedCost = calculateTeamCost(improvedMembers);
  const baselineHours = calculateTeamHours(baselineMembers);
  const improvedHours = calculateTeamHours(improvedMembers);
  const laborSavingsMonthly = baselineCost - improvedCost;
  const savingsMonthly = laborSavingsMonthly + savingsTotals.system + savingsTotals.other;
  const savingsPercent = baselineCost > 0 ? (laborSavingsMonthly / baselineCost) * 100 : 0;

  const getSavingsState = (type: SavingsType) => {
    if (type === 'system') return { items: systemSavings, setItems: setSystemSavings };
    if (type === 'build_vs_buy') return { items: buildVsBuySavings, setItems: setBuildVsBuySavings };
    return { items: otherSavings, setItems: setOtherSavings };
  };

  const addSavings = (type: SavingsType) => {
    const { items, setItems } = getSavingsState(type);
    setItems([...items, createSavingsItem(type)]);
    setOpenSections(current => ({ ...current, [type]: true }));
  };

  const updateSavings = (type: SavingsType, index: number, item: SavingsItem) => {
    const { items, setItems } = getSavingsState(type);
    const updated = [...items];
    updated[index] = item;
    setItems(updated);
  };

  const removeSavings = (type: SavingsType, index: number) => {
    const { items, setItems } = getSavingsState(type);
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const addTeamMember = (isBaseline: boolean) => {
    const member: TeamMember = { job_role_id: '', hours_allocated: 0, is_baseline: isBaseline };
    if (isBaseline) setBaselineMembers([...baselineMembers, member]);
    else setImprovedMembers([...improvedMembers, member]);
  };

  const updateTeamMember = (
    index: number,
    changes: Partial<Pick<TeamMember, 'job_role_id' | 'hours_allocated' | 'job_role'>>,
    isBaseline: boolean,
  ) => {
    const members = isBaseline ? [...baselineMembers] : [...improvedMembers];
    members[index] = { ...members[index], ...changes };
    if (isBaseline) setBaselineMembers(members);
    else setImprovedMembers(members);
  };

  const removeTeamMember = (index: number, isBaseline: boolean) => {
    if (isBaseline) setBaselineMembers(baselineMembers.filter((_, memberIndex) => memberIndex !== index));
    else setImprovedMembers(improvedMembers.filter((_, memberIndex) => memberIndex !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: improvement, error: insertError } = await createImprovementMutation.mutateAsync(
        buildImprovementPayload({
          processId,
          deliverableId,
          projectId,
          userId: user?.id,
          form,
          baselineMembers,
          improvedMembers,
          savingsTotals,
        }),
      );
      if (insertError) throw insertError;

      const savingsDetails = buildSavingsDetailsPayload(
        improvement.id,
        systemSavings,
        buildVsBuySavings,
        otherSavings,
      );
      if (savingsDetails.length > 0) {
        const { error } = await createSavingsDetailsMutation.mutateAsync(savingsDetails);
        if (error) console.error('Error saving savings details:', error);
      }

      const teamMembers = buildTeamMembersPayload(improvement.id, baselineMembers, improvedMembers);
      if (teamMembers.length > 0) {
        const { error } = await createTeamMembersMutation.mutateAsync(teamMembers);
        if (error) console.error('Error saving team members:', error);
      }

      setCalculating(true);
      const { data: roiData, error: roiError } = await calculateRoiMutation.mutateAsync(improvement.id);
      if (roiError) console.error('Error calculating ROI:', roiError);
      else if (roiData?.results) setResults(roiData.results);

      const { error: updateProcessError } = await updateProcessMutation.mutateAsync({
        processId,
        payload: buildProcessUpdatePayload({ form, improvedMembers, roiResults: roiData?.results }),
      });
      if (updateProcessError) console.error('Error updating process baseline:', updateProcessError);

      toast({
        title: 'Avaliação criada!',
        description: 'A melhoria foi registrada, o ROI calculado e o baseline do processo atualizado.',
      });
      onSaved?.();
    } catch (error: unknown) {
      console.error('Error saving improvement:', error);
      toast({ title: 'Erro ao salvar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Avaliar Melhoria do Processo
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{processName}</p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Descrição da Melhoria Implementada</Label>
            <Textarea
              value={form.improvement_description}
              onChange={event => setForm({ ...form, improvement_description: event.target.value })}
              placeholder="Descreva a melhoria realizada..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período de Avaliação (dias)</Label>
              <Select
                value={form.evaluation_period_days.toString()}
                onValueChange={value => setForm({ ...form, evaluation_period_days: parseInt(value) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90].map(days => <SelectItem key={days} value={String(days)}>{days} dias</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horas de Implementação</Label>
              <Input
                type="number"
                value={form.implementation_hours}
                onChange={event => setForm({ ...form, implementation_hours: parseFloat(event.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <TeamComparison
            baselineMembers={baselineMembers}
            improvedMembers={improvedMembers}
            jobRoles={jobRoles}
            baselineCost={baselineCost}
            improvedCost={improvedCost}
            onAdd={addTeamMember}
            onRemove={removeTeamMember}
            onRoleChange={(index, roleId, isBaseline) => updateTeamMember(index, {
              job_role_id: roleId,
              job_role: jobRoles.find(role => role.id === roleId),
            }, isBaseline)}
            onHoursChange={(index, hours, isBaseline) => updateTeamMember(index, { hours_allocated: hours }, isBaseline)}
          />
          <SavingsSections
            system={systemSavings}
            buildVsBuy={buildVsBuySavings}
            other={otherSavings}
            totals={savingsTotals}
            openSections={openSections}
            onOpenChange={(type, isOpen) => setOpenSections(current => ({ ...current, [type]: isOpen }))}
            onAdd={addSavings}
            onUpdate={updateSavings}
            onRemove={removeSavings}
          />
          {(baselineMembers.length > 0 || improvedMembers.length > 0) && (
            <PreviewCard
              baselineHours={baselineHours}
              improvedHours={improvedHours}
              savingsMonthly={savingsMonthly}
              savingsPercent={savingsPercent}
            />
          )}
          {results && <RoiResultCard results={results} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || calculating}>
            {(loading || calculating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {calculating ? 'Calculando ROI...' : 'Salvar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
