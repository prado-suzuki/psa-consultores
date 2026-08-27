import { ArrowRight, Pencil, Plus, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PROCESS_STAGES } from '@/components/equipe/projetos/constants';
import { getPriorityBadge, getStageBadge } from '@/components/equipe/projetos/projectPresentation';
import type { Process } from '@/components/equipe/projetos/types';

interface ProjectProcessesTabProps {
  processes: Process[];
  loading: boolean;
  onCreateProcess: () => void;
  onAdvanceProcess: (process: Process) => Promise<void>;
  onEditProcess: (process: Process) => void;
}

export const ProjectProcessesTab = ({
  processes,
  loading,
  onCreateProcess,
  onAdvanceProcess,
  onEditProcess,
}: ProjectProcessesTabProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">Processos da empresa vinculados a este projeto</p>
      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onCreateProcess}>
        <Plus className="h-4 w-4 mr-1" />
        Novo Processo
      </Button>
    </div>

    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
      {PROCESS_STAGES.map((stage, index) => (
        <div key={stage.value} className="flex items-center gap-1">
          <Badge className={stage.color}>{stage.label}</Badge>
          {index < PROCESS_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-gray-400" />}
        </div>
      ))}
    </div>

    {loading ? (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    ) : processes.length > 0 ? (
      <div className="space-y-2">
        {processes.map((process) => (
          <Card key={process.id} className="bg-muted border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{process.name}</h4>
                    {getStageBadge(process.stage)}
                  </div>
                  {process.description && (
                    <p className="text-sm text-gray-500 truncate mt-1">{process.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {process.area && <span>Área: {process.area}</span>}
                    {process.frequency && <span>Freq: {process.frequency}</span>}
                    {process.volume_month && <span>Vol: {process.volume_month}/mês</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {process.priority && getPriorityBadge(process.priority)}
                  {process.stage !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary"
                      onClick={() => onAdvanceProcess(process)}
                      title="Avançar estágio"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={() => onEditProcess(process)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <div className="text-center py-8">
        <Workflow className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h4 className="text-gray-900 font-medium mb-1">Nenhum processo</h4>
        <p className="text-sm text-gray-500">
          Adicione processos da empresa para acompanhar os estágios
        </p>
      </div>
    )}
  </div>
);
