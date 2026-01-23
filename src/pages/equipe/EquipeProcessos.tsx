import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateProcessModal } from '@/components/equipe/CreateProcessModal';
import * as XLSX from 'xlsx';
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
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Json } from '@/integrations/supabase/types';

interface Process {
  id: string;
  name: string;
  code?: string | null;
  description: string | null;
  area: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_month: number | null;
  financial_impact: string | null;
  client_id: string | null;
  created_at: string;
  formatted_content?: string | null;
  document_path?: string | null;
  last_ai_sync?: string | null;
  catalog_client?: CatalogClient | null;
  linked_projects?: LinkedProject[];
}

interface ProcessDocument {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface CatalogClient {
  id: string;
  name: string;
  responsible: string | null;
  color: string;
  is_active: boolean;
}

interface LinkedProject {
  id: string;
  name: string;
  impact_type: string | null;
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [catalogClients, setCatalogClients] = useState<CatalogClient[]>([]);
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
    financial_impact: '',
    // Performance baseline fields
    time_spent_hours: '',
    time_spent_frequency: '',
    cost_monthly: '',
    volume_executions: '',
    people_involved: '',
    complexity_level: ''
  });

  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle file select for import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const workbook = XLSX.read(evt.target?.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        setImportData(data);
        setIsImportDialogOpen(true);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ler o arquivo.",
        variant: "destructive"
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract area from Cliente column
  const extractAreaFromCliente = (cliente: string | undefined): string => {
    if (!cliente) return 'Geral';
    const c = String(cliente).toLowerCase();
    if (c.includes('fiscal') || c.includes('ricardo')) return 'Fiscal';
    if (c.includes('consultoria') || c.includes('felipe')) return 'Consultoria';
    if (c.includes('fixos') || c.includes('washington')) return 'Fixos';
    return 'Transversal';
  };

  // Handle import processes
  const handleImportProcesses = async () => {
    if (importData.length === 0) return;
    
    const validStages = ['discovery', 'mapping', 'analysis', 'improvement', 'automation', 'completed'];
    
    setImporting(true);
    try {
      const processesToInsert = importData.map(row => {
        // Map stage from Portuguese to English
        let stage = row.stage || row.Stage || row.fase || row.Fase || 'discovery';
        stage = String(stage).toLowerCase().trim();
        
        // Portuguese to English stage mapping
        const stageMap: Record<string, string> = {
          'descoberta': 'discovery',
          'mapeamento': 'mapping',
          'análise': 'analysis',
          'analise': 'analysis',
          'melhoria': 'improvement',
          'automação': 'automation',
          'automacao': 'automation',
          'concluído': 'completed',
          'concluido': 'completed'
        };
        const mappedStage = stageMap[stage] || stage;
        
        // Extract process name from multiple possible columns
        const processName = row.Processo || row.processo || row.Process || row.name || row.Nome || row.nome || '';
        
        // Extract code
        const code = row.Código || row.codigo || row.Code || row.code || null;
        
        // Extract area from Cliente or Area column
        const areaFromCliente = extractAreaFromCliente(row.Cliente || row.cliente);
        const area = row.area || row.Area || row.área || row.Área || areaFromCliente;
        
        return {
          name: String(processName).trim(),
          code: code ? String(code).trim() : null,
          description: row.description || row.Descricao || row.descricao || row.Descrição || row.Descriçao || null,
          area: area,
          stage: validStages.includes(mappedStage) ? mappedStage : 'discovery',
          priority: row.priority || row.Prioridade || row.prioridade || 'medium',
          frequency: row.frequency || row.Frequencia || row.frequencia || row.Frequência || null,
          volume_month: row.volume_month ? parseInt(row.volume_month) : (row.Volume ? parseInt(row.Volume) : null),
          financial_impact: row.financial_impact || row.Impacto || row.impacto || null,
          created_by: user?.id
        };
      }).filter(p => p.name && p.name.length > 0);

      if (processesToInsert.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum processo válido encontrado. Verifique se a planilha tem uma coluna 'Processo' ou 'Nome'.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('processes').insert(processesToInsert);
      
      if (error) throw error;

      toast({
        title: "Processos importados!",
        description: `${processesToInsert.length} processos criados com sucesso.`,
      });

      setIsImportDialogOpen(false);
      setImportData([]);
      fetchProcesses();
    } catch (error) {
      console.error('Error importing processes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível importar os processos.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    fetchCatalogClients();
  }, []);

  const fetchCatalogClients = async () => {
    try {
      const { data, error } = await supabase
        .from('catalog_clients')
        .select('id, name, responsible, color, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setCatalogClients(data || []);
    } catch (error) {
      console.error('Error fetching catalog clients:', error);
    }
  };

  const fetchProcesses = async () => {
    try {
      // Buscar processos com catalog_clients e projetos vinculados
      const { data, error } = await supabase
        .from('processes')
        .select(`
          *,
          catalog_client:catalog_clients!client_id(id, name, responsible, color, is_active),
          project_processes(
            id,
            impact_type,
            project:projects(id, name)
          )
        `)
        .order('name');
      
      if (error) throw error;
      
      // Mapear os dados para incluir projetos vinculados
      const processesWithProjects = (data || []).map(p => ({
        ...p,
        linked_projects: p.project_processes?.map((pp: any) => ({
          id: pp.project?.id,
          name: pp.project?.name,
          impact_type: pp.impact_type
        })).filter((lp: any) => lp.id) || []
      }));
      
      setProcesses(processesWithProjects);
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


  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      financial_impact: selectedProcess.financial_impact || '',
      // Performance baseline fields
      time_spent_hours: (selectedProcess as any).time_spent_hours?.toString() || '',
      time_spent_frequency: (selectedProcess as any).time_spent_frequency || '',
      cost_monthly: (selectedProcess as any).cost_monthly?.toString() || '',
      volume_executions: (selectedProcess as any).volume_executions?.toString() || '',
      people_involved: (selectedProcess as any).people_involved?.toString() || '',
      complexity_level: (selectedProcess as any).complexity_level || ''
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
        financial_impact: editForm.financial_impact.trim() || null,
        // Performance baseline fields
        time_spent_hours: editForm.time_spent_hours ? parseFloat(editForm.time_spent_hours) : null,
        time_spent_frequency: editForm.time_spent_frequency || null,
        cost_monthly: editForm.cost_monthly ? parseFloat(editForm.cost_monthly) : null,
        volume_executions: editForm.volume_executions ? parseInt(editForm.volume_executions) : null,
        people_involved: editForm.people_involved ? parseInt(editForm.people_involved) : null,
        complexity_level: editForm.complexity_level || null
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

  // Get unique areas from catalog_clients
  const areas = catalogClients.map(c => c.name).sort();

  // Helper to get client badge
  const getClientBadge = (process: Process) => {
    const client = process.catalog_client || catalogClients.find(c => c.id === process.client_id);
    if (client) {
      return (
        <Badge 
          style={{ backgroundColor: `${client.color}20`, color: client.color, borderColor: client.color }}
          className="border text-xs"
        >
          {client.name}
        </Badge>
      );
    }
    if (process.area) {
      return <Badge variant="outline" className="text-xs">{process.area}</Badge>;
    }
    return null;
  };

  // Filter processes
  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (process.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const clientName = process.catalog_client?.name || process.area;
    const matchesArea = areaFilter === 'all' || clientName === areaFilter;
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
    nome?: string;
    name?: string;
    origem?: string;
    source?: string;
    formato?: string;
    format?: string;
    quantidade?: string;
    criticidade?: string;
    criticality?: string;
  }

  interface OutputItem {
    nome?: string;
    name?: string;
    destino?: string;
    destination?: string;
    formato?: string;
    format?: string;
    proposito?: string;
    purpose?: string;
  }

  interface SystemItem {
    nome?: string;
    name?: string;
    uso?: string;
    function?: string;
    frequencia?: string;
    frequency?: string;
    gargalo?: string;
    bottleneck?: string;
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

  // Helpers to get values from bilingual fields
  const getInputName = (input: InputItem) => input.nome || input.name || '';
  const getInputSource = (input: InputItem) => input.origem || input.source || '';
  const getInputFormat = (input: InputItem) => input.formato || input.format || '';
  const getInputCriticality = (input: InputItem) => input.criticidade || input.criticality || '';

  const getOutputName = (output: OutputItem) => output.nome || output.name || '';
  const getOutputDestination = (output: OutputItem) => output.destino || output.destination || '';
  const getOutputFormat = (output: OutputItem) => output.formato || output.format || '';
  const getOutputPurpose = (output: OutputItem) => output.proposito || output.purpose || '';

  const getSystemName = (system: SystemItem) => system.nome || system.name || '';
  const getSystemFunction = (system: SystemItem) => system.uso || system.function || '';
  const getSystemFrequency = (system: SystemItem) => system.frequencia || system.frequency || '';
  const getSystemBottleneck = (system: SystemItem) => system.gargalo || system.bottleneck || '';

  return (
    <EquipeLayout 
      title="Processos" 
      subtitle="Visualize e gerencie os processos mapeados"
      headerActions={
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          
          {/* Create Process Button */}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Processo
          </Button>
        </>
      }
    >
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Processos
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{importData.length}</strong> processos encontrados no arquivo.
                Verifique os dados abaixo antes de confirmar a importação.
              </p>
            </div>
            
            {importData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {row.name || row.Nome || row.nome || '-'}
                        </TableCell>
                        <TableCell>
                          {row.area || row.Area || row.área || '-'}
                        </TableCell>
                        <TableCell>
                          {row.stage || row.Stage || row.fase || row.Fase || 'discovery'}
                        </TableCell>
                        <TableCell>
                          {row.priority || row.Prioridade || row.prioridade || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... e mais {importData.length - 10} processos
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setImportData([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportProcesses}
                disabled={importing || importData.length === 0}
              >
                {importing ? 'Importando...' : `Importar ${importData.length} Processos`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <div className="text-center py-12 text-muted-foreground">Carregando processos...</div>
      ) : filteredProcesses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum processo encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProcesses.map((process) => {
            const stageInfo = getStageInfo(process.stage);
            return (
              <Card key={process.id} className="bg-background border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Workflow className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {process.code && (
                              <span className="text-xs font-mono text-muted-foreground">{process.code}</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground truncate">{process.name}</h3>
                        </div>
                      </div>
                      {process.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{process.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {getClientBadge(process)}
                        <Badge className={`text-xs ${stageInfo.color}`}>
                          {stageInfo.label}
                        </Badge>
                        {process.priority && (
                          <Badge variant="secondary" className="text-xs">
                            {process.priority === 'high' ? 'Alta' : process.priority === 'medium' ? 'Média' : process.priority === 'low' ? 'Baixa' : process.priority}
                          </Badge>
                        )}
                        {process.frequency && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {process.frequency}
                          </Badge>
                        )}
                        {process.volume_month && (
                          <Badge variant="outline" className="text-xs">
                            {process.volume_month}/mês
                          </Badge>
                        )}
                        {process.linked_projects && process.linked_projects.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <FolderKanban className="h-3 w-3 mr-1" />
                            {process.linked_projects.length} projeto{process.linked_projects.length > 1 ? 's' : ''}
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
                    
                    {/* Performance Baseline Card */}
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-amber-600" />
                          Performance Baseline (Antes da Melhoria)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-time-spent">Tempo Gasto (horas)</Label>
                            <Input
                              id="edit-time-spent"
                              type="number"
                              step="0.5"
                              min="0"
                              value={editForm.time_spent_hours}
                              onChange={(e) => setEditForm(prev => ({ ...prev, time_spent_hours: e.target.value }))}
                              placeholder="Ex: 4"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-time-frequency">Frequência do Tempo</Label>
                            <Select 
                              value={editForm.time_spent_frequency || "none"} 
                              onValueChange={(value) => setEditForm(prev => ({ ...prev, time_spent_frequency: value === "none" ? "" : value }))}
                            >
                              <SelectTrigger id="edit-time-frequency">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Não definida</SelectItem>
                                <SelectItem value="diária">Diária</SelectItem>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-cost-monthly">Custo Mensal (R$)</Label>
                            <Input
                              id="edit-cost-monthly"
                              type="number"
                              step="0.01"
                              min="0"
                              value={editForm.cost_monthly}
                              onChange={(e) => setEditForm(prev => ({ ...prev, cost_monthly: e.target.value }))}
                              placeholder="Ex: 5000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-volume-executions">Volume de Execuções</Label>
                            <Input
                              id="edit-volume-executions"
                              type="number"
                              min="0"
                              value={editForm.volume_executions}
                              onChange={(e) => setEditForm(prev => ({ ...prev, volume_executions: e.target.value }))}
                              placeholder="Ex: 100"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-people-involved">Pessoas Envolvidas</Label>
                            <Input
                              id="edit-people-involved"
                              type="number"
                              min="0"
                              value={editForm.people_involved}
                              onChange={(e) => setEditForm(prev => ({ ...prev, people_involved: e.target.value }))}
                              placeholder="Ex: 3"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="edit-complexity">Complexidade</Label>
                            <Select 
                              value={editForm.complexity_level || "none"} 
                              onValueChange={(value) => setEditForm(prev => ({ ...prev, complexity_level: value === "none" ? "" : value }))}
                            >
                              <SelectTrigger id="edit-complexity">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Não definida</SelectItem>
                                <SelectItem value="baixa">Baixa</SelectItem>
                                <SelectItem value="média">Média</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="crítica">Crítica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <p className="text-xs text-amber-700">
                          💡 Preencha estes campos para permitir o cálculo automático de ROI quando melhorias forem implementadas.
                        </p>
                      </CardContent>
                    </Card>
                    
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
                                      Entradas ({parseInputs(stage.inputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseInputs(stage.inputs).map((input, i) => (
                                        <li key={i} className="text-sm bg-muted/50 p-2 rounded">
                                          <span className="font-medium">{getInputName(input)}</span>
                                          {getInputSource(input) && <span className="text-muted-foreground"> - {getInputSource(input)}</span>}
                                          {getInputFormat(input) && <Badge variant="outline" className="ml-2 text-xs">{getInputFormat(input)}</Badge>}
                                          {getInputCriticality(input) && (
                                            <Badge 
                                              variant="outline" 
                                              className={`ml-2 text-xs ${getInputCriticality(input) === 'high' ? 'border-red-300 text-red-600' : ''}`}
                                            >
                                              {getInputCriticality(input) === 'high' ? 'Alta' : getInputCriticality(input) === 'medium' ? 'Média' : getInputCriticality(input)}
                                            </Badge>
                                          )}
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
                                      Saídas ({parseOutputs(stage.outputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseOutputs(stage.outputs).map((output, i) => (
                                        <li key={i} className="text-sm bg-muted/50 p-2 rounded">
                                          <span className="font-medium">{getOutputName(output)}</span>
                                          {getOutputDestination(output) && <span className="text-muted-foreground"> → {getOutputDestination(output)}</span>}
                                          {getOutputFormat(output) && <Badge variant="outline" className="ml-2 text-xs">{getOutputFormat(output)}</Badge>}
                                          {getOutputPurpose(output) && <p className="text-muted-foreground text-xs mt-1">{getOutputPurpose(output)}</p>}
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
                                        <li key={i} className="text-sm bg-muted/50 p-2 rounded">
                                          <span className="font-medium">{getSystemName(system)}</span>
                                          {getSystemFunction(system) && <span className="text-muted-foreground"> ({getSystemFunction(system)})</span>}
                                          {getSystemFrequency(system) && <Badge variant="outline" className="ml-2 text-xs">{getSystemFrequency(system)}</Badge>}
                                          {getSystemBottleneck(system) && (
                                            <p className="text-orange-600 text-xs mt-1 flex items-center gap-1">
                                              <AlertTriangle className="h-3 w-3" />
                                              Gargalo: {getSystemBottleneck(system)}
                                            </p>
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

      {/* Create Process Modal */}
      <CreateProcessModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchProcesses}
      />
    </EquipeLayout>
  );
};

export default EquipeProcessos;
