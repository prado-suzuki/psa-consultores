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
  Layers
} from 'lucide-react';
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
    fetchProcessDetails(process.id);
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

  const parseJsonArray = (json: Json): { name: string; source?: string; format?: string; type?: string; bottleneck?: string }[] => {
    if (Array.isArray(json)) {
      return json as { name: string; source?: string; format?: string; type?: string; bottleneck?: string }[];
    }
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
      <Dialog open={!!selectedProcess} onOpenChange={(open) => !open && setSelectedProcess(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              {selectedProcess?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="stages">Etapas ({processStages.length})</TabsTrigger>
              <TabsTrigger value="projects">Projetos ({projectProcesses.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              {/* Info Tab */}
              <TabsContent value="info" className="mt-0 space-y-4">
                {selectedProcess && (
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
                              {parseJsonArray(stage.inputs).length > 0 && (
                                <AccordionItem value="inputs">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <FileInput className="h-4 w-4 text-blue-500" />
                                      Inputs ({parseJsonArray(stage.inputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseJsonArray(stage.inputs).map((input, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{input.name}</span>
                                          {input.source && <span className="text-gray-500"> - {input.source}</span>}
                                          {input.format && <Badge variant="outline" className="ml-2 text-xs">{input.format}</Badge>}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              )}

                              {/* Outputs */}
                              {parseJsonArray(stage.outputs).length > 0 && (
                                <AccordionItem value="outputs">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <FileOutput className="h-4 w-4 text-green-500" />
                                      Outputs ({parseJsonArray(stage.outputs).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseJsonArray(stage.outputs).map((output, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{output.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              )}

                              {/* Systems */}
                              {parseJsonArray(stage.systems).length > 0 && (
                                <AccordionItem value="systems">
                                  <AccordionTrigger className="text-sm py-2">
                                    <span className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-purple-500" />
                                      Sistemas ({parseJsonArray(stage.systems).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2">
                                      {parseJsonArray(stage.systems).map((system, i) => (
                                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                                          <span className="font-medium">{system.name}</span>
                                          {system.type && <span className="text-gray-500"> ({system.type})</span>}
                                          {system.bottleneck && (
                                            <p className="text-orange-600 text-xs mt-1">⚠️ {system.bottleneck}</p>
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
