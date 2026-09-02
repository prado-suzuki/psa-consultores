import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDomainCreateProcess } from '@/hooks/useDomainCreateProcess';
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
  category: string | null;
  hourly_rate: number;
}

interface EstruturaEquipe {
  id: string;
  name: string;
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
  const { jobRoles, projects } = useDomainCreateProcess(open);
  const [loading, setLoading] = useState(false);
  const [equipes, setEquipes] = useState<EstruturaEquipe[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    project_id: '',
    client_id: '',
    equipe_id: '',
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
      fetchEquipes();
      // Restore draft
      const saved = restoreDraft();
      if (saved) {
        if (saved.form) setForm(saved.form);
        if (saved.teamMembers) setTeamMembers(saved.teamMembers);
      }
    }
  }, [open]);

  const fetchEquipes = async () => {
    const { data } = await (supabase as any)
      .from('estrutura_equipes')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setEquipes(data as EstruturaEquipe[]);
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

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do processo.",
        variant: "destructive"
      });
      return;
    }

    // Processo exige projeto (não há processo avulso) — o cluster é herdado dele.
    if (!form.project_id) {
      toast({
        title: "Projeto obrigatório",
        description: "Selecione o projeto ao qual este processo pertence.",
        variant: "destructive"
      });
      return;
    }

    const selectedProject = projects.find(p => p.id === form.project_id);

    setLoading(true);
    try {
      // Calcular custos
      const cost_monthly = calculateMonthlyCost();
      const time_spent_hours = calculateTotalHours() || form.time_spent_hours;

      const { data: process, error } = await (supabase as any)
        .from('processes')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          project_id: form.project_id,
          cluster_id: selectedProject?.cluster_id ?? null, // herda do projeto → aparece no MAPA junto dele
          client_id: form.client_id || null,
          equipe_id: form.equipe_id || null,
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

      // Vínculo N:N com o projeto (impacto principal) — mantém o processo visível
      // na lista de "projetos vinculados" da página de Processos.
      if (process?.id) {
        const { error: linkError } = await (supabase as any)
          .from('project_processes')
          .insert({ process_id: process.id, project_id: form.project_id, impact_type: 'principal' });
        if (linkError) throw linkError;
      }

      toast({
        title: "Processo criado!",
        description: selectedProject?.cluster_id
          ? `${form.name} foi adicionado com sucesso.`
          : `${form.name} criado, mas o projeto não tem cluster — não aparecerá no MAPA até o projeto receber um cluster.`,
        variant: selectedProject?.cluster_id ? undefined : "destructive"
      });

      // Reset form
      setForm({
        name: '',
        description: '',
        project_id: '',
        client_id: '',
        equipe_id: '',
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
          {/* Projeto (obrigatório) — define o cluster herdado e a visibilidade no MAPA */}
          <div className="space-y-2">
            <Label>Projeto <RequiredMark /></Label>
            <Select
              value={form.project_id}
              onValueChange={(v) => setForm({ ...form, project_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{!p.cluster_id ? ' (sem cluster)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.project_id && !projects.find(p => p.id === form.project_id)?.cluster_id && (
              <p className="text-xs text-warning">
                ⚠ Este projeto não tem cluster — o processo não aparecerá no MAPA até o projeto receber um cluster.
              </p>
            )}
          </div>

          {/* Informações Básicas */}
          <div className="space-y-2">
            <Label>Nome do Processo <RequiredMark /></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do processo"
            />
            <p className="text-xs text-muted-foreground">
              O código (PROC-SIGLA-NNN) é gerado automaticamente a partir da área selecionada.
            </p>
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
              <Label>Equipe responsável</Label>
              <Select
                value={form.equipe_id}
                onValueChange={(v) => setForm({ ...form, equipe_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}
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
          <Card className="bg-muted/40">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">Equipe Envolvida (Baseline)</h4>
                {monthlyCost > 0 && (
                  <span className="text-sm font-medium text-foreground">
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
