 import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
 import { Loader2, Plus, Trash2, TrendingUp, Clock, DollarSign, Users, CheckCircle2, Monitor, ShoppingCart, Sparkles, ChevronRight } from 'lucide-react';
 import { cn } from '@/lib/utils';

interface JobRole {
  id: string;
  name: string;
  level: string;
  category: string;
  hourly_rate: number;
}

interface TeamMember {
  id?: string;
  job_role_id: string;
  hours_allocated: number;
  is_baseline: boolean;
  job_role?: JobRole;
}

 interface SavingsItem {
   id?: string;
   savings_type: 'system' | 'build_vs_buy' | 'other';
   description: string;
   cost_before: number;
   cost_after: number;
   savings_value: number;
   is_monthly: boolean;
 }
 
interface ProcessImprovement {
  id?: string;
  process_id: string;
  sprint_deliverable_id?: string;
  project_id?: string;
  baseline_time_hours: number;
  baseline_cost_monthly: number;
  baseline_volume: number;
  baseline_people_involved: number;
  improved_time_hours: number;
  improved_cost_monthly: number;
  improved_volume: number;
  improved_people_involved: number;
  evaluation_period_days: number;
  implementation_hours: number;
  improvement_description: string;
  system_savings_monthly?: number;
  build_vs_buy_savings?: number;
  other_savings_monthly?: number;
}

interface ProcessStageInput {
  id: string;
  name: string;
  responsible: string | null;
  time_current: string | null;
  time_target: string | null;
  job_role_id: string | null;
}

interface ProcessImprovementModalProps {
  open: boolean;
  onClose: () => void;
  processId: string;
  processName: string;
  processStages?: ProcessStageInput[];
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

/** Parse time strings like "2h", "30min", "1 dia", "1.5h" into hours */
function parseTimeToHours(time: string | null): number {
  if (!time) return 0;
  const t = time.trim().toLowerCase();
  
  // Match number + unit patterns
  const match = t.match(/^([\d.,]+)\s*(h|hora|horas|min|minuto|minutos|dia|dias|d)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1].replace(',', '.'));
  if (isNaN(value)) return 0;
  
  const unit = match[2] || 'h';
  if (unit.startsWith('min')) return value / 60;
  if (unit.startsWith('dia') || unit === 'd') return value * 8;
  return value; // default hours
}

export function ProcessImprovementModal({
  open,
  onClose,
  processId,
  processName,
  processStages = [],
  deliverableId,
  projectId,
  baselineData,
  onSaved
}: ProcessImprovementModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [baselineMembers, setBaselineMembers] = useState<TeamMember[]>([]);
  const [improvedMembers, setImprovedMembers] = useState<TeamMember[]>([]);
  const [results, setResults] = useState<any>(null);
  
   // Estados para economias detalhadas
   const [systemSavings, setSystemSavings] = useState<SavingsItem[]>([]);
   const [buildVsBuySavings, setBuildVsBuySavings] = useState<SavingsItem[]>([]);
   const [otherSavings, setOtherSavings] = useState<SavingsItem[]>([]);
   
   // Estados de colapsáveis
   const [systemOpen, setSystemOpen] = useState(false);
   const [buildVsBuyOpen, setBuildVsBuyOpen] = useState(false);
   const [otherOpen, setOtherOpen] = useState(false);
   
   // Calcular totais automaticamente
   const totalSystemSavings = useMemo(() => 
     systemSavings.reduce((sum, item) => sum + (item.savings_value || 0), 0), 
     [systemSavings]
   );
   
   const totalBuildVsBuy = useMemo(() => 
     buildVsBuySavings.reduce((sum, item) => sum + (item.savings_value || 0), 0), 
     [buildVsBuySavings]
   );
   
   const totalOtherSavings = useMemo(() => 
     otherSavings.reduce((sum, item) => sum + (item.savings_value || 0), 0), 
     [otherSavings]
   );
  
  const [form, setForm] = useState<ProcessImprovement>({
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
    improvement_description: ''
  });

  useEffect(() => {
    if (open) {
      fetchJobRoles();
    }
  }, [open]);

  // Auto-populate baseline from process stages when job_roles are loaded
  useEffect(() => {
    if (!open || jobRoles.length === 0 || processStages.length === 0) return;
    // Only auto-populate if baseline is empty
    if (baselineMembers.length > 0) return;
    
    const stagesWithRoles = processStages.filter(s => s.job_role_id && s.time_current);
    if (stagesWithRoles.length === 0) return;
    
    const autoBaseline: TeamMember[] = stagesWithRoles.map(stage => {
      const role = jobRoles.find(r => r.id === stage.job_role_id);
      return {
        job_role_id: stage.job_role_id!,
        hours_allocated: parseTimeToHours(stage.time_current),
        is_baseline: true,
        job_role: role
      };
    });
    
    setBaselineMembers(autoBaseline);
    
    // Also pre-populate improved members from time_target
    const autoImproved: TeamMember[] = stagesWithRoles
      .filter(s => s.time_target)
      .map(stage => {
        const role = jobRoles.find(r => r.id === stage.job_role_id);
        return {
          job_role_id: stage.job_role_id!,
          hours_allocated: parseTimeToHours(stage.time_target),
          is_baseline: false,
          job_role: role
        };
      });
    
    if (autoImproved.length > 0 && improvedMembers.length === 0) {
      setImprovedMembers(autoImproved);
    }
  }, [open, jobRoles, processStages]);

  const fetchJobRoles = async () => {
    const { data, error } = await supabase
      .from('job_roles')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('hourly_rate', { ascending: true });
    
    if (!error && data) {
      setJobRoles(data);
    }
  };

   const addSavingsItem = (type: 'system' | 'build_vs_buy' | 'other') => {
     const newItem: SavingsItem = {
       savings_type: type,
       description: '',
       cost_before: 0,
       cost_after: 0,
       savings_value: 0,
       is_monthly: type !== 'build_vs_buy'
     };
     
     switch (type) {
       case 'system':
         setSystemSavings([...systemSavings, newItem]);
         setSystemOpen(true);
         break;
       case 'build_vs_buy':
         setBuildVsBuySavings([...buildVsBuySavings, newItem]);
         setBuildVsBuyOpen(true);
         break;
       case 'other':
         setOtherSavings([...otherSavings, newItem]);
         setOtherOpen(true);
         break;
     }
   };
 
   const updateSavingsItem = (index: number, updated: SavingsItem, type: 'system' | 'build_vs_buy' | 'other') => {
     switch (type) {
       case 'system':
         const sysItems = [...systemSavings];
         sysItems[index] = updated;
         setSystemSavings(sysItems);
         break;
       case 'build_vs_buy':
         const bvbItems = [...buildVsBuySavings];
         bvbItems[index] = updated;
         setBuildVsBuySavings(bvbItems);
         break;
       case 'other':
         const otherItems = [...otherSavings];
         otherItems[index] = updated;
         setOtherSavings(otherItems);
         break;
     }
   };
 
   const removeSavingsItem = (index: number, type: 'system' | 'build_vs_buy' | 'other') => {
     switch (type) {
       case 'system':
         setSystemSavings(systemSavings.filter((_, i) => i !== index));
         break;
       case 'build_vs_buy':
         setBuildVsBuySavings(buildVsBuySavings.filter((_, i) => i !== index));
         break;
       case 'other':
         setOtherSavings(otherSavings.filter((_, i) => i !== index));
         break;
     }
   };
 
  const addTeamMember = (isBaseline: boolean) => {
    const newMember: TeamMember = {
      job_role_id: '',
      hours_allocated: 0,
      is_baseline: isBaseline
    };
    
    if (isBaseline) {
      setBaselineMembers([...baselineMembers, newMember]);
    } else {
      setImprovedMembers([...improvedMembers, newMember]);
    }
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: any, isBaseline: boolean) => {
    const members = isBaseline ? [...baselineMembers] : [...improvedMembers];
    members[index] = { ...members[index], [field]: value };
    
    if (field === 'job_role_id') {
      members[index].job_role = jobRoles.find(r => r.id === value);
    }
    
    if (isBaseline) {
      setBaselineMembers(members);
    } else {
      setImprovedMembers(members);
    }
  };

  const removeTeamMember = (index: number, isBaseline: boolean) => {
    if (isBaseline) {
      setBaselineMembers(baselineMembers.filter((_, i) => i !== index));
    } else {
      setImprovedMembers(improvedMembers.filter((_, i) => i !== index));
    }
  };

  const calculateCost = (members: TeamMember[]): number => {
    return members.reduce((total, member) => {
      const rate = member.job_role?.hourly_rate || 0;
      return total + (member.hours_allocated * rate);
    }, 0);
  };

  const calculateTotalHours = (members: TeamMember[]): number => {
    return members.reduce((total, member) => total + (member.hours_allocated || 0), 0);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Calcular custos baseados nos membros
      const baselineCost = calculateCost(baselineMembers);
      const improvedCost = calculateCost(improvedMembers);
      const baselineHours = calculateTotalHours(baselineMembers);
      const improvedHours = calculateTotalHours(improvedMembers);

      // Criar registro de melhoria
      const { data: improvement, error: insertError } = await supabase
        .from('process_improvements')
        .insert({
          process_id: processId,
          sprint_deliverable_id: deliverableId || null,
          project_id: projectId || null,
          baseline_time_hours: baselineHours || form.baseline_time_hours,
          baseline_cost_monthly: baselineCost || form.baseline_cost_monthly,
          baseline_volume: form.baseline_volume,
          baseline_people_involved: baselineMembers.length || form.baseline_people_involved,
          improved_time_hours: improvedHours || form.improved_time_hours,
          improved_cost_monthly: improvedCost || form.improved_cost_monthly,
          improved_volume: form.improved_volume,
          improved_people_involved: improvedMembers.length || form.improved_people_involved,
          evaluation_period_days: form.evaluation_period_days,
          evaluation_start_date: new Date().toISOString().split('T')[0],
          evaluation_end_date: new Date(Date.now() + form.evaluation_period_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          evaluation_status: 'in_evaluation',
          implementation_hours: form.implementation_hours,
          improvement_description: form.improvement_description,
          evaluated_by: user?.id,
           system_savings_monthly: totalSystemSavings,
           build_vs_buy_savings: totalBuildVsBuy,
           other_savings_monthly: totalOtherSavings
        })
        .select()
        .single();

      if (insertError) throw insertError;

       // Salvar detalhes das economias
       const allSavingsDetails = [
         ...systemSavings.map(s => ({ 
           improvement_id: improvement.id, 
           savings_type: 'system' as const,
           description: s.description,
           cost_before: s.cost_before,
           cost_after: s.cost_after,
           savings_value: s.savings_value,
           is_monthly: true
         })),
         ...buildVsBuySavings.map(s => ({ 
           improvement_id: improvement.id, 
           savings_type: 'build_vs_buy' as const,
           description: s.description,
           cost_before: s.cost_before,
           cost_after: s.cost_after,
           savings_value: s.savings_value,
           is_monthly: false
         })),
         ...otherSavings.map(s => ({ 
           improvement_id: improvement.id, 
           savings_type: 'other' as const,
           description: s.description,
           cost_before: 0,
           cost_after: 0,
           savings_value: s.savings_value,
           is_monthly: true
         }))
       ].filter(s => s.description.trim());
 
       if (allSavingsDetails.length > 0) {
         const { error: savingsError } = await supabase
           .from('improvement_savings_details')
           .insert(allSavingsDetails);
         
         if (savingsError) console.error('Error saving savings details:', savingsError);
       }
 
      // Inserir membros da equipe
      const allMembers = [
        ...baselineMembers.map(m => ({ ...m, is_baseline: true, improvement_id: improvement.id })),
        ...improvedMembers.map(m => ({ ...m, is_baseline: false, improvement_id: improvement.id }))
      ].filter(m => m.job_role_id);

      if (allMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('improvement_team_members')
          .insert(allMembers.map(m => ({
            improvement_id: improvement.id,
            job_role_id: m.job_role_id,
            hours_allocated: m.hours_allocated,
            is_baseline: m.is_baseline
          })));
        
        if (membersError) console.error('Error saving team members:', membersError);
      }

      // Calcular ROI
      setCalculating(true);
      const { data: roiData, error: roiError } = await supabase.functions.invoke('calculate-process-roi', {
        body: { improvement_id: improvement.id }
      });

      if (roiError) {
        console.error('Error calculating ROI:', roiError);
      } else if (roiData?.results) {
        setResults(roiData.results);
      }

      // Atualizar tabela processes com os dados "DEPOIS" como novo baseline
      const { error: updateProcessError } = await supabase
        .from('processes')
        .update({
          time_spent_hours: improvedHours || form.improved_time_hours,
          cost_monthly: improvedCost || form.improved_cost_monthly,
          volume_executions: form.improved_volume,
          people_involved: improvedMembers.length || form.improved_people_involved,
          last_roi_percentage: roiData?.results?.roi_percentage || null,
          last_cost_saved_monthly: roiData?.results?.cost_saved_monthly || null,
          last_time_saved_hours: roiData?.results?.time_saved_hours || null,
          last_improvement_date: new Date().toISOString()
        })
        .eq('id', processId);

      if (updateProcessError) {
        console.error('Error updating process baseline:', updateProcessError);
      }

      toast({
        title: "Avaliação criada!",
        description: "A melhoria foi registrada, o ROI calculado e o baseline do processo atualizado."
      });

      onSaved?.();
    } catch (error: any) {
      console.error('Error saving improvement:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  const baselineCost = calculateCost(baselineMembers);
  const improvedCost = calculateCost(improvedMembers);
  const laborSavingsMonthly = baselineCost - improvedCost;
   const totalSavingsMonthly = laborSavingsMonthly + totalSystemSavings + totalOtherSavings;
  const savingsMonthly = totalSavingsMonthly;
  const savingsPercent = baselineCost > 0 ? (laborSavingsMonthly / baselineCost) * 100 : 0;

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
          {/* Descrição da Melhoria */}
          <div className="space-y-2">
            <Label>Descrição da Melhoria Implementada</Label>
            <Textarea
              value={form.improvement_description}
              onChange={(e) => setForm({ ...form, improvement_description: e.target.value })}
              placeholder="Descreva a melhoria realizada..."
              rows={2}
            />
          </div>

          {/* Configurações */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período de Avaliação (dias)</Label>
              <Select
                value={form.evaluation_period_days.toString()}
                onValueChange={(v) => setForm({ ...form, evaluation_period_days: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="45">45 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horas de Implementação</Label>
              <Input
                type="number"
                value={form.implementation_hours}
                onChange={(e) => setForm({ ...form, implementation_hours: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Comparativo */}
          <div className="grid grid-cols-2 gap-6">
            {/* ANTES */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-orange-700">ANTES (Baseline)</h4>
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    R$ {baselineCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {baselineMembers.map((member, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={member.job_role_id}
                        onValueChange={(v) => updateTeamMember(index, 'job_role_id', v, true)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecionar cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobRoles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name} (R$ {role.hourly_rate}/h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="h/mês"
                        value={member.hours_allocated || ''}
                        onChange={(e) => updateTeamMember(index, 'hours_allocated', parseFloat(e.target.value) || 0, true)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTeamMember(index, true)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTeamMember(true)}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Membro
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* DEPOIS */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-green-700">DEPOIS (Atual)</h4>
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    R$ {improvedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {improvedMembers.map((member, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={member.job_role_id}
                        onValueChange={(v) => updateTeamMember(index, 'job_role_id', v, false)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecionar cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobRoles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name} (R$ {role.hourly_rate}/h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="h/mês"
                        value={member.hours_allocated || ''}
                        onChange={(e) => updateTeamMember(index, 'hours_allocated', parseFloat(e.target.value) || 0, false)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTeamMember(index, false)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTeamMember(false)}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Membro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Economias Adicionais */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4">
               <div className="flex items-center justify-between mb-4">
                 <h4 className="font-semibold text-blue-700">Economias Adicionais (opcional)</h4>
                 {(totalSystemSavings + totalBuildVsBuy + totalOtherSavings) > 0 && (
                   <Badge className="bg-green-100 text-green-700 border-green-300">
                     Total: R$ {(totalSystemSavings + totalBuildVsBuy + totalOtherSavings).toLocaleString('pt-BR')}
                   </Badge>
                 )}
              </div>
 
               <div className="space-y-2">
                 {/* Economia com Sistemas */}
                 <Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
                   <CollapsibleTrigger asChild>
                     <div className="flex items-center justify-between p-3 hover:bg-blue-100/50 rounded cursor-pointer border border-blue-200/50">
                       <div className="flex items-center gap-2">
                         <ChevronRight className={cn("h-4 w-4 transition-transform text-blue-600", systemOpen && "rotate-90")} />
                         <Monitor className="h-4 w-4 text-blue-600" />
                         <span className="font-medium text-sm">Economia com Sistemas</span>
                         <span className="text-xs text-muted-foreground">(licenças, softwares)</span>
                       </div>
                       {totalSystemSavings > 0 && (
                         <Badge variant="outline" className="text-green-600 border-green-300">
                           R$ {totalSystemSavings.toLocaleString('pt-BR')}/mês
                         </Badge>
                       )}
                     </div>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <div className="pl-6 pr-2 pb-3 pt-2 space-y-2 border-l-2 border-blue-200 ml-2">
                       {systemSavings.length > 0 && (
                         <div className="grid grid-cols-[1fr_100px_100px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-2">
                           <span>Sistema/Ferramenta</span>
                           <span>Custo Antes</span>
                           <span>Custo Depois</span>
                           <span className="text-right">Economia</span>
                           <span></span>
                         </div>
                       )}
                       {systemSavings.map((item, i) => (
                         <div key={i} className="grid grid-cols-[1fr_100px_100px_90px_32px] gap-2 items-center">
                           <Input
                             placeholder="Nome do sistema"
                             value={item.description}
                             onChange={(e) => updateSavingsItem(i, { ...item, description: e.target.value }, 'system')}
                             className="h-9"
                           />
                           <Input
                             type="number"
                             placeholder="R$"
                             value={item.cost_before || ''}
                             onChange={(e) => {
                               const before = parseFloat(e.target.value) || 0;
                               updateSavingsItem(i, { 
                                 ...item, 
                                 cost_before: before,
                                 savings_value: before - item.cost_after
                               }, 'system');
                             }}
                             className="h-9"
                           />
                           <Input
                             type="number"
                             placeholder="R$"
                             value={item.cost_after || ''}
                             onChange={(e) => {
                               const after = parseFloat(e.target.value) || 0;
                               updateSavingsItem(i, { 
                                 ...item, 
                                 cost_after: after,
                                 savings_value: item.cost_before - after
                               }, 'system');
                             }}
                             className="h-9"
                           />
                           <div className="text-right font-medium text-green-600 text-sm">
                             R$ {(item.savings_value || 0).toLocaleString('pt-BR')}
                           </div>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8"
                             onClick={() => removeSavingsItem(i, 'system')}
                           >
                             <Trash2 className="h-4 w-4 text-muted-foreground" />
                           </Button>
                         </div>
                       ))}
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => addSavingsItem('system')}
                         className="w-full border-dashed border mt-2"
                       >
                         <Plus className="h-4 w-4 mr-2" />
                         Adicionar Sistema
                       </Button>
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
 
                 {/* Construir vs Comprar */}
                 <Collapsible open={buildVsBuyOpen} onOpenChange={setBuildVsBuyOpen}>
                   <CollapsibleTrigger asChild>
                     <div className="flex items-center justify-between p-3 hover:bg-blue-100/50 rounded cursor-pointer border border-blue-200/50">
                       <div className="flex items-center gap-2">
                         <ChevronRight className={cn("h-4 w-4 transition-transform text-blue-600", buildVsBuyOpen && "rotate-90")} />
                         <ShoppingCart className="h-4 w-4 text-blue-600" />
                         <span className="font-medium text-sm">Construir vs Comprar</span>
                         <span className="text-xs text-muted-foreground">(economia única)</span>
                       </div>
                       {totalBuildVsBuy > 0 && (
                         <Badge variant="outline" className="text-green-600 border-green-300">
                           R$ {totalBuildVsBuy.toLocaleString('pt-BR')}
                         </Badge>
                       )}
                     </div>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <div className="pl-6 pr-2 pb-3 pt-2 space-y-2 border-l-2 border-blue-200 ml-2">
                       {buildVsBuySavings.length > 0 && (
                         <div className="grid grid-cols-[1fr_100px_100px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-2">
                           <span>Item/Solução</span>
                           <span>Preço Mercado</span>
                           <span>Custo Interno</span>
                           <span className="text-right">Economia</span>
                           <span></span>
                         </div>
                       )}
                       {buildVsBuySavings.map((item, i) => (
                         <div key={i} className="grid grid-cols-[1fr_100px_100px_90px_32px] gap-2 items-center">
                           <Input
                             placeholder="Nome da solução"
                             value={item.description}
                             onChange={(e) => updateSavingsItem(i, { ...item, description: e.target.value }, 'build_vs_buy')}
                             className="h-9"
                           />
                           <Input
                             type="number"
                             placeholder="R$"
                             value={item.cost_before || ''}
                             onChange={(e) => {
                               const before = parseFloat(e.target.value) || 0;
                               updateSavingsItem(i, { 
                                 ...item, 
                                 cost_before: before,
                                 savings_value: before - item.cost_after
                               }, 'build_vs_buy');
                             }}
                             className="h-9"
                           />
                           <Input
                             type="number"
                             placeholder="R$"
                             value={item.cost_after || ''}
                             onChange={(e) => {
                               const after = parseFloat(e.target.value) || 0;
                               updateSavingsItem(i, { 
                                 ...item, 
                                 cost_after: after,
                                 savings_value: item.cost_before - after
                               }, 'build_vs_buy');
                             }}
                             className="h-9"
                           />
                           <div className="text-right font-medium text-green-600 text-sm">
                             R$ {(item.savings_value || 0).toLocaleString('pt-BR')}
                           </div>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8"
                             onClick={() => removeSavingsItem(i, 'build_vs_buy')}
                           >
                             <Trash2 className="h-4 w-4 text-muted-foreground" />
                           </Button>
                         </div>
                       ))}
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => addSavingsItem('build_vs_buy')}
                         className="w-full border-dashed border mt-2"
                       >
                         <Plus className="h-4 w-4 mr-2" />
                         Adicionar Item
                       </Button>
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
 
                 {/* Outras Economias */}
                 <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
                   <CollapsibleTrigger asChild>
                     <div className="flex items-center justify-between p-3 hover:bg-blue-100/50 rounded cursor-pointer border border-blue-200/50">
                       <div className="flex items-center gap-2">
                         <ChevronRight className={cn("h-4 w-4 transition-transform text-blue-600", otherOpen && "rotate-90")} />
                         <Sparkles className="h-4 w-4 text-blue-600" />
                         <span className="font-medium text-sm">Outras Economias</span>
                         <span className="text-xs text-muted-foreground">(ganhos recorrentes)</span>
                       </div>
                       {totalOtherSavings > 0 && (
                         <Badge variant="outline" className="text-green-600 border-green-300">
                           R$ {totalOtherSavings.toLocaleString('pt-BR')}/mês
                         </Badge>
                       )}
                     </div>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <div className="pl-6 pr-2 pb-3 pt-2 space-y-2 border-l-2 border-blue-200 ml-2">
                       {otherSavings.length > 0 && (
                         <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-xs font-medium text-muted-foreground px-2">
                           <span>Descrição</span>
                           <span className="text-right">Valor/mês</span>
                           <span></span>
                         </div>
                       )}
                       {otherSavings.map((item, i) => (
                         <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                           <Input
                             placeholder="Descrição da economia"
                             value={item.description}
                             onChange={(e) => updateSavingsItem(i, { ...item, description: e.target.value }, 'other')}
                             className="h-9"
                           />
                           <Input
                             type="number"
                             placeholder="R$/mês"
                             value={item.savings_value || ''}
                             onChange={(e) => updateSavingsItem(i, { 
                               ...item, 
                               savings_value: parseFloat(e.target.value) || 0 
                             }, 'other')}
                             className="h-9"
                           />
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8"
                             onClick={() => removeSavingsItem(i, 'other')}
                           >
                             <Trash2 className="h-4 w-4 text-muted-foreground" />
                           </Button>
                         </div>
                       ))}
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => addSavingsItem('other')}
                         className="w-full border-dashed border mt-2"
                       >
                         <Plus className="h-4 w-4 mr-2" />
                         Adicionar Economia
                       </Button>
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
               </div>
            </CardContent>
          </Card>

          {/* Resultados Prévios */}
          {(baselineMembers.length > 0 || improvedMembers.length > 0) && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-primary">Prévia dos Resultados</h4>
                  <p className="text-xs text-muted-foreground">
                    Os dados de "DEPOIS" serão salvos como novo baseline
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {calculateTotalHours(baselineMembers) - calculateTotalHours(improvedMembers)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Horas economizadas/mês</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {savingsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Economia mensal</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {savingsPercent.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Redução de custo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {((calculateTotalHours(baselineMembers) - calculateTotalHours(improvedMembers)) / 176).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">FTE liberados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados Calculados */}
          {results && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  ROI Calculado
                </h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{results.time_saved_hours?.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Economia de tempo/mês</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {results.cost_saved_monthly?.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Economia mensal</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{results.roi_percentage?.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">ROI anual</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{results.payback_months?.toFixed(1)} meses</p>
                    <p className="text-xs text-muted-foreground">Payback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
