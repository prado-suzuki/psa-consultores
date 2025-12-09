import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Workflow,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  ArrowRight,
  Zap,
  FileInput,
  FileOutput,
  Monitor,
  FolderKanban,
  Layers,
  Edit2,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Json } from '@/integrations/supabase/types';

interface Process {
  id: string;
  name: string;
  description: string | null;
  area: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_month: number | null;
  financial_impact: string | null;
  project_id: string | null;
  created_at: string;
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
}

interface Project {
  id: string;
  name: string;
}

interface ProjectProcess {
  id: string;
  project_id: string | null;
  process_id: string | null;
  impact_type: string | null;
  impacted_stages: string[] | null;
  projects: Project | null;
}

const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta', color: 'bg-gray-100 text-gray-700' },
  { value: 'mapping', label: 'Mapeamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'analysis', label: 'Análise', color: 'bg-purple-100 text-purple-700' },
  { value: 'improvement', label: 'Melhoria', color: 'bg-orange-100 text-orange-700' },
  { value: 'automation', label: 'Automação', color: 'bg-teal-100 text-teal-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' }
];

const AUTOMATION_LEVELS = [
  { value: 'none', label: 'Nenhuma', color: 'bg-gray-100 text-gray-600' },
  { value: 'low', label: 'Baixa', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-green-100 text-green-700' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700' }
];

const EquipeProcessos = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [processStages, setProcessStages] = useState<ProcessStage[]>([]);
  const [projectProcesses, setProjectProcesses] = useState<ProjectProcess[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    area: '',
    stage: '',
    priority: '',
    frequency: '',
    volume_month: '',
    financial_impact: ''
  });

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProcesses(data || []);
    } catch (error) {
      console.error('Error fetching processes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os processos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessDetails = async (processId: string) => {
    setLoadingDetails(true);
    try {
      const [stagesRes, projectsRes] = await Promise.all([
        supabase
          .from('process_stages')
          .select('*')
          .eq('process_id', processId)
          .order('stage_order'),
        supabase
          .from('project_processes')
          .select(`
            *,
            projects:project_id (id, name)
          `)
          .eq('process_id', processId)
      ]);

      if (stagesRes.error) throw stagesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setProcessStages(stagesRes.data || []);
      setProjectProcesses(projectsRes.data || []);
    } catch (error) {
      console.error('Error fetching process details:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do processo.",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewProcess = (process: Process) => {
    setSelectedProcess(process);
    setIsEditing(false);
    fetchProcessDetails(process.id);
  };

  const startEditing = () => {
    if (!selectedProcess) return;
    setEditForm({
      name: selectedProcess.name || '',
      description: selectedProcess.description || '',
      area: selectedProcess.area || '',
      stage: selectedProcess.stage || '',
      priority: selectedProcess.priority || '',
      frequency: selectedProcess.frequency || '',
      volume_month: selectedProcess.volume_month?.toString() || '',
      financial_impact: selectedProcess.financial_impact || ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProcess = async () => {
    if (!selectedProcess) return;
    
    try {
      setSaving(true);
      
      const updates = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        area: editForm.area.trim() || null,
        stage: editForm.stage,
        priority: editForm.priority || null,
        frequency: editForm.frequency.trim() || null,
        volume_month: editForm.volume_month ? parseInt(editForm.volume_month) : null,
        financial_impact: editForm.financial_impact.trim() || null
      };

      const { error } = await supabase
        .from('processes')
        .update(updates)
        .eq('id', selectedProcess.id);

      if (error) throw error;
      
      // Update local state
      setProcesses(prev => 
        prev.map(p => p.id === selectedProcess.id ? { ...p, ...updates } : p)
      );
      setSelectedProcess(prev => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);
      
      toast({
        title: "Processo atualizado",
        description: "As alterações foram salvas com sucesso."
      });
    } catch (error: any) {
      console.error('Error saving process:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProcess = async () => {
    if (!selectedProcess) return;
    
    try {
      setSaving(true);
      
      // Delete related process_stages first
      await supabase
        .from('process_stages')
        .delete()
        .eq('process_id', selectedProcess.id);
      
      // Delete related project_processes
      await supabase
        .from('project_processes')
        .delete()
        .eq('process_id', selectedProcess.id);
      
      // Delete the process
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', selectedProcess.id);

      if (error) throw error;
      
      // Update local state
      setProcesses(prev => prev.filter(p => p.id !== selectedProcess.id));
      setSelectedProcess(null);
      
      toast({
        title: "Processo excluído",
        description: "O processo foi removido com sucesso."
      });
    } catch (error: any) {
      console.error('Error deleting process:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Get unique areas
  const areas = [...new Set(processes.map(p => p.area).filter(Boolean))].sort();

  // Filter processes
  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (process.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesArea = areaFilter === 'all' || process.area === areaFilter;
    const matchesStage = stageFilter === 'all' || process.stage === stageFilter;
    return matchesSearch && matchesArea && matchesStage;
  });

  const getStageInfo = (stage: string) => {
    return PROCESS_STAGES.find(s => s.value === stage) || PROCESS_STAGES[0];
  };

  const getAutomationInfo = (level: string | null) => {
    return AUTOMATION_LEVELS.find(a => a.value === level) || AUTOMATION_LEVELS[0];
  };

  interface InputItem {
    nome: string;
    origem?: string;
    formato?: string;
    quantidade?: string;
    criticidade?: string;
  }

  interface OutputItem {
    nome: string;
    destino?: string;
    formato?: string;
    proposito?: string;
  }

  interface SystemItem {
    nome: string;
    uso?: string;
    frequencia?: string;
    gargalo?: string;
  }

  const parseInputs = (json: Json): InputItem[] => {
    if (Array.isArray(json)) return json as unknown as InputItem[];
    return [];
  };

  const parseOutputs = (json: Json): OutputItem[] => {
    if (Array.isArray(json)) return json as unknown as OutputItem[];
    return [];
  };

  const parseSystems = (json: Json): SystemItem[] => {
    if (Array.isArray(json)) return json as unknown as SystemItem[];
    return [];
  };

  return (
    <EquipeLayout 
      title="Processos" 
      subtitle="Visualize e gerencie os processos mapeados"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar processos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Áreas</SelectItem>
            {areas.map(area => (
              <SelectItem key={area} value={area || ''}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Fases</SelectItem>
            {PROCESS_STAGES.map(stage => (
              <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Process List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando processos...</div>
      ) : filteredProcesses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum processo encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProcesses.map((process) => {
            const stageInfo = getStageInfo(process.stage);
            return (
              <Card key={process.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Workflow className="h-5 w-5 text-primary flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 truncate">{process.name}</h3>
                      </div>
                      {process.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{process.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {process.area && (
                          <Badge variant="outline" className="text-xs">
                            {process.area}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${stageInfo.color}`}>
                          {stageInfo.label}
                        </Badge>
                        {process.priority && (
                          <Badge variant="secondary" className="text-xs">
                            {process.priority}
                          </Badge>
                        )}
                        {process.frequency && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {process.frequency}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProcess(process)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Process Detail Dialog */}
      <Dialog open={!!selectedProcess} onOpenChange={(open) => { if (!open) { setSelectedProcess(null); setIsEditing(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              {isEditing ? 'Editar Processo' : selectedProcess?.name}
            </DialogTitle>
            
            {/* Botões em linha separada, distante do X de fechar */}
            {!isEditing && (
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Processo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o processo "{selectedProcess?.name}"? 
                        Esta ação também excluirá todas as etapas e vínculos com projetos relacionados.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={deleteProcess}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="stages" disabled={isEditing}>Etapas ({processStages.length})</TabsTrigger>
              <TabsTrigger value="projects" disabled={isEditing}>Projetos ({projectProcesses.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              {/* Info Tab */}
              <TabsContent value="info" className="mt-0 space-y-4">
                {selectedProcess && !isEditing && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Área</label>
                        <p className="text-gray-900">{selectedProcess.area || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fase</label>
                        <Badge className={getStageInfo(selectedProcess.stage).color}>
                          {getStageInfo(selectedProcess.stage).label}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Prioridade</label>
                        <p className="text-gray-900">{selectedProcess.priority || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Frequência</label>
                        <p className="text-gray-900">{selectedProcess.frequency || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Volume Mensal</label>
                        <p className="text-gray-900">{selectedProcess.volume_month || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Impacto Financeiro</label>
                        <p className="text-gray-900">{selectedProcess.financial_impact || '-'}</p>
                      </div>
                    </div>
                    {selectedProcess.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Descrição</label>
                        <p className="text-gray-900 mt-1">{selectedProcess.description}</p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Edit Form */}
                {isEditing && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Nome do Processo *</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome do processo"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição do processo"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-area">Área</Label>
                        <Input
                          id="edit-area"
                          value={editForm.area}
                          onChange={(e) => setEditForm(prev => ({ ...prev, area: e.target.value }))}
                          placeholder="Ex: Fiscal, Consultoria"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-stage">Fase</Label>
                        <Select 
                          value={editForm.stage} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, stage: value }))}
                        >
                          <SelectTrigger id="edit-stage">
                            <SelectValue placeholder="Selecione a fase" />
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
                      
                      <div>
                        <Label htmlFor="edit-priority">Prioridade</Label>
                        <Select 
                          value={editForm.priority} 
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger id="edit-priority">
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Crítica">Crítica</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Baixa">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-frequency">Frequência</Label>
                        <Input
                          id="edit-frequency"
                          value={editForm.frequency}
                          onChange={(e) => setEditForm(prev => ({ ...prev, frequency: e.target.value }))}
                          placeholder="Ex: Diária, Semanal, Mensal"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-volume">Volume Mensal</Label>
                        <Input
                          id="edit-volume"
                          type="number"
                          value={editForm.volume_month}
                          onChange={(e) => setEditForm(prev => ({ ...prev, volume_month: e.target.value }))}
                          placeholder="Quantidade por mês"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-impact">Impacto Financeiro</Label>
                        <Input
                          id="edit-impact"
                          value={editForm.financial_impact}
                          onChange={(e) => setEditForm(prev => ({ ...prev, financial_impact: e.target.value }))}
                          placeholder="Ex: Alto, Médio, Baixo"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button onClick={saveProcess} disabled={saving || !editForm.name.trim()}>
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Stages Tab */}
              <TabsContent value="stages" className="mt-0">
                {loadingDetails ? (
                  <div className="text-center py-8 text-gray-500">Carregando etapas...</div>
                ) : processStages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma etapa cadastrada para este processo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {processStages.map((stage, index) => (
                      <div key={stage.id} className="relative">
                        {/* Connector line */}
                        {index < processStages.length - 1 && (
                          <div className="absolute left-6 top-full h-4 w-0.5 bg-gray-200" />
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
                              {stage.automation_level && (
                                <Badge className={getAutomationInfo(stage.automation_level).color}>
                                  <Zap className="h-3 w-3 mr-1" />
                                  {getAutomationInfo(stage.automation_level).label}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {stage.description && (
                              <p className="text-sm text-gray-600">{stage.description}</p>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {stage.responsible && (
                                <div>
                                  <span className="text-gray-500 flex items-center gap-1">
                                    <User className="h-3 w-3" /> Responsável
                                  </span>
                                  <p className="font-medium">{stage.responsible}</p>
                                </div>
                              )}
                              {(stage.time_current || stage.time_target) && (
                                <div>
                                  <span className="text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Tempo
                                  </span>
                                  <p className="font-medium">
                                    {stage.time_current || '-'} → {stage.time_target || '-'}
                                  </p>
                                </div>
                              )}
                              {stage.frequency && (
                                <div>
                                  <span className="text-gray-500">Frequência</span>
                                  <p className="font-medium">{stage.frequency}</p>
                                </div>
                              )}
                              {stage.volume && (
                                <div>
                                  <span className="text-gray-500">Volume</span>
                                  <p className="font-medium">{stage.volume}</p>
                                </div>
                              )}
                            </div>

                            <Accordion type="single" collapsible className="w-full">
                              {/* Inputs */}
                              {parseInputs(stage.inputs).length > 0 && (
                                <AccordionItem value="inputs">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <FileInput className="h-4 w-4 text-blue-500" />
                                      Inputs ({parseInputs(stage.inputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseInputs(stage.inputs).map((input, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{input.nome}</span>
                                          {input.origem && <span className="text-gray-500"> - {input.origem}</span>}
                                          {input.formato && <Badge variant="outline" className="ml-2 text-xs">{input.formato}</Badge>}
                                          {input.quantidade && <span className="text-gray-400 text-xs ml-2">({input.quantidade})</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              )}

                              {/* Outputs */}
                              {parseOutputs(stage.outputs).length > 0 && (
                                <AccordionItem value="outputs">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <FileOutput className="h-4 w-4 text-green-500" />
                                      Outputs ({parseOutputs(stage.outputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseOutputs(stage.outputs).map((output, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{output.nome}</span>
                                          {output.destino && <span className="text-gray-500"> → {output.destino}</span>}
                                          {output.formato && <Badge variant="outline" className="ml-2 text-xs">{output.formato}</Badge>}
                                          {output.proposito && <p className="text-gray-500 text-xs mt-1">{output.proposito}</p>}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              )}

                              {/* Systems */}
                              {parseSystems(stage.systems).length > 0 && (
                                <AccordionItem value="systems">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-purple-500" />
                                      Sistemas ({parseSystems(stage.systems).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseSystems(stage.systems).map((system, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{system.nome}</span>
                                          {system.uso && <span className="text-gray-500"> ({system.uso})</span>}
                                          {system.frequencia && <Badge variant="outline" className="ml-2 text-xs">{system.frequencia}</Badge>}
                                          {system.gargalo && (
                                            <p className="text-orange-600 text-xs mt-1">⚠️ Gargalo: {system.gargalo}</p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              )}

                              {/* Related Projects */}
                              {stage.related_projects && stage.related_projects.length > 0 && (
                                <AccordionItem value="related">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <FolderKanban className="h-4 w-4 text-orange-500" />
                                      Projetos Relacionados ({stage.related_projects.length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="flex flex-wrap gap-2">
                                      {stage.related_projects.map((project, i) => (
                                        <Badge key={i} variant="outline">{project}</Badge>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              )}
                            </Accordion>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-0">
                {loadingDetails ? (
                  <div className="text-center py-8 text-gray-500">Carregando projetos...</div>
                ) : projectProcesses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum projeto relacionado a este processo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectProcesses.map((pp) => (
                      <Card key={pp.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FolderKanban className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{pp.projects?.name || 'Projeto não encontrado'}</p>
                                <div className="flex gap-2 mt-1">
                                  {pp.impact_type && (
                                    <Badge 
                                      variant={pp.impact_type === 'principal' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {pp.impact_type === 'principal' ? 'Principal' : 
                                       pp.impact_type === 'secundario' ? 'Secundário' : 'Suporte'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {pp.impacted_stages && pp.impacted_stages.length > 0 && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Etapas Impactadas</p>
                                <div className="flex gap-1 mt-1 justify-end flex-wrap">
                                  {pp.impacted_stages.map((stage, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{stage}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeProcessos;
