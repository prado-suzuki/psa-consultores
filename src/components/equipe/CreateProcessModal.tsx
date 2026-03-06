import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';

interface JobRole {
  id: string;
  name: string;
  level: string;
  category: string;
  hourly_rate: number;
}

interface CatalogClient {
  id: string;
  name: string;
  color: string;
}

interface TeamMemberInput {
  job_role_id: string;
  hours_allocated: number;
  job_role?: JobRole;
}

interface CreateProcessModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta' },
  { value: 'mapping', label: 'Mapeamento' },
  { value: 'analysis', label: 'Análise' },
  { value: 'improvement', label: 'Melhoria' },
  { value: 'automation', label: 'Automação' },
  { value: 'completed', label: 'Concluído' }
];

const FREQUENCIES = [
  { value: 'diário', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' }
];

const COMPLEXITY_LEVELS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' }
];

export function CreateProcessModal({ open, onClose, onCreated }: CreateProcessModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [catalogClients, setCatalogClients] = useState<CatalogClient[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);
  
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    client_id: '',
    area: '',
    stage: 'mapping',
    priority: 'medium',
    frequency: 'mensal',
    time_spent_hours: 0,
    time_spent_frequency: 'mensal',
    volume_executions: 0,
    people_involved: 1,
    complexity_level: 'medium',
    automation_potential: 0,
    evaluation_period_days: 30,
    financial_impact: ''
  });

  // Draft persistence
  const draftValues = useMemo(() => ({ form, teamMembers }), [form, teamMembers]);
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'process-form-draft', draftValues, open, user?.id,
  );

  useEffect(() => {
    if (open) {
      fetchJobRoles();
      fetchCatalogClients();
      // Restore draft
      const saved = restoreDraft();
      if (saved) {
        if (saved.form) setForm(saved.form);
        if (saved.teamMembers) setTeamMembers(saved.teamMembers);
      }
    }
  }, [open]);

  const fetchJobRoles = async () => {
    const { data } = await supabase
      .from('job_roles')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('hourly_rate');
    if (data) setJobRoles(data);
  };

  const fetchCatalogClients = async () => {
    const { data } = await supabase
      .from('catalog_clients')
      .select('id, name, color')
      .eq('is_active', true)
      .order('name');
    if (data) setCatalogClients(data);
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { job_role_id: '', hours_allocated: 0 }]);
  };

  const updateTeamMember = (index: number, field: keyof TeamMemberInput, value: any) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'job_role_id') {
      updated[index].job_role = jobRoles.find(r => r.id === value);
    }
    setTeamMembers(updated);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const calculateMonthlyCost = (): number => {
    return teamMembers.reduce((total, member) => {
      const rate = member.job_role?.hourly_rate || 0;
      return total + (member.hours_allocated * rate);
    }, 0);
  };

  const calculateTotalHours = (): number => {
    return teamMembers.reduce((total, member) => total + (member.hours_allocated || 0), 0);
  };

  const generateCode = () => {
    const prefix = form.area ? form.area.substring(0, 3).toUpperCase() : 'GER';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PROC-${prefix}-${random}`;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do processo.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Verificar duplicação por código
      if (form.code) {
        const { data: existing } = await supabase
          .from('processes')
          .select('id')
          .eq('code', form.code)
          .maybeSingle();
        
        if (existing) {
          toast({
            title: "Código duplicado",
            description: "Já existe um processo com esse código. O código foi regenerado.",
            variant: "destructive"
          });
          setForm({ ...form, code: generateCode() });
          setLoading(false);
          return;
        }
      }

      // Calcular custos
      const cost_monthly = calculateMonthlyCost();
      const time_spent_hours = calculateTotalHours() || form.time_spent_hours;

      const { data: process, error } = await supabase
        .from('processes')
        .insert({
          code: form.code || generateCode(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          client_id: form.client_id || null,
          area: form.area || null,
          stage: form.stage,
          priority: form.priority,
          frequency: form.frequency,
          time_spent_hours,
          time_spent_frequency: form.time_spent_frequency,
          cost_monthly,
          volume_executions: form.volume_executions || null,
          people_involved: teamMembers.length || form.people_involved,
          complexity_level: form.complexity_level,
          automation_potential: form.automation_potential || null,
          evaluation_period_days: form.evaluation_period_days,
          financial_impact: form.financial_impact || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Processo criado!",
        description: `${form.name} foi adicionado com sucesso.`
      });

      // Reset form
      setForm({
        code: '',
        name: '',
        description: '',
        client_id: '',
        area: '',
        stage: 'mapping',
        priority: 'medium',
        frequency: 'mensal',
        time_spent_hours: 0,
        time_spent_frequency: 'mensal',
        volume_executions: 0,
        people_involved: 1,
        complexity_level: 'medium',
        automation_potential: 0,
        evaluation_period_days: 30,
        financial_impact: ''
      });
      setTeamMembers([]);
      clearDraft();
      onCreated?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating process:', error);
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const monthlyCost = calculateMonthlyCost();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { clearDraft(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Processo</DialogTitle>
          <DialogDescription className="sr-only">Formulário de criação de processo</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="PROC-XXX-000"
                />
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, code: generateCode() })}>
                  Gerar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Processo <RequiredMark /></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do processo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição do processo..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Área/Cliente</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => {
                  const client = catalogClients.find(c => c.id === v);
                  setForm({ ...form, client_id: v, area: client?.name || '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {catalogClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select
                value={form.stage}
                onValueChange={(v) => setForm({ ...form, stage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Volume/Mês</Label>
              <Input
                type="number"
                value={form.volume_executions || ''}
                onChange={(e) => setForm({ ...form, volume_executions: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Complexidade</Label>
              <Select
                value={form.complexity_level}
                onValueChange={(v) => setForm({ ...form, complexity_level: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* Equipe Envolvida */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-orange-700">Equipe Envolvida (Baseline)</h4>
                {monthlyCost > 0 && (
                  <span className="text-sm font-medium text-orange-700">
                    Custo estimado: R$ {monthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={member.job_role_id}
                      onValueChange={(v) => updateTeamMember(index, 'job_role_id', v)}
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
                      className="w-24"
                      placeholder="h/mês"
                      value={member.hours_allocated || ''}
                      onChange={(e) => updateTeamMember(index, 'hours_allocated', parseFloat(e.target.value) || 0)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTeamMember(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTeamMember}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { clearDraft(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
