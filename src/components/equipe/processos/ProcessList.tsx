import { Clock, Eye, FolderKanban, Workflow } from 'lucide-react';
import type { EquipeProcesso, EquipeProcessoCatalogClient } from '@/lib/equipeProcessos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta', color: 'bg-muted text-gray-700' },
  { value: 'mapping', label: 'Mapeamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'analysis', label: 'Análise', color: 'bg-purple-100 text-purple-700' },
  { value: 'improvement', label: 'Melhoria', color: 'bg-orange-100 text-orange-700' },
  { value: 'automation', label: 'Automação', color: 'bg-teal-100 text-teal-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' },
];

const getProcessStageInfo = (stage: string) =>
  PROCESS_STAGES.find((item) => item.value === stage) || PROCESS_STAGES[0];

interface ProcessListProps {
  processes: EquipeProcesso[];
  catalogClients: EquipeProcessoCatalogClient[];
  loading: boolean;
  onViewProcess: (process: EquipeProcesso) => void;
}

export function ProcessList({
  processes,
  catalogClients,
  loading,
  onViewProcess,
}: ProcessListProps) {
  const getClientBadge = (process: EquipeProcesso) => {
    if (process.equipe?.name) {
      return (
        <Badge variant="outline" className="text-xs">
          {process.equipe.name}
        </Badge>
      );
    }
    const client =
      process.catalog_client || catalogClients.find((item) => item.id === process.client_id);
    if (client) {
      return (
        <Badge
          style={{
            backgroundColor: `${client.color}20`,
            color: client.color,
            borderColor: client.color,
          }}
          className="border text-xs"
        >
          {client.name}
        </Badge>
      );
    }
    if (process.area)
      return (
        <Badge variant="outline" className="text-xs">
          {process.area}
        </Badge>
      );
    return null;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando processos...</div>;
  }
  if (processes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">Nenhum processo encontrado.</div>
    );
  }
  return (
    <div className="space-y-4">
      {processes.map((process) => {
        const stageInfo = getProcessStageInfo(process.stage);
        return (
          <Card
            key={process.id}
            className="bg-background border-border shadow-sm hover:shadow-md transition-shadow"
          >
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
                          <span className="text-xs font-mono text-muted-foreground">
                            {process.code}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{process.name}</h3>
                    </div>
                  </div>
                  {process.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {process.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {getClientBadge(process)}
                    <Badge className={`text-xs ${stageInfo.color}`}>{stageInfo.label}</Badge>
                    {process.priority && (
                      <Badge variant="secondary" className="text-xs">
                        {process.priority === 'high'
                          ? 'Alta'
                          : process.priority === 'medium'
                            ? 'Média'
                            : process.priority === 'low'
                              ? 'Baixa'
                              : process.priority}
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
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <FolderKanban className="h-3 w-3 mr-1" />
                        {process.linked_projects.length} projeto
                        {process.linked_projects.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onViewProcess(process)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
