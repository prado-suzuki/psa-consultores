import { Edit2, FileText, History, Plus, TrendingUp } from 'lucide-react';
import type { EquipeProcesso, EquipeProcessoStage } from '@/lib/equipeProcessos';
import { NewStageForm } from '@/components/equipe/NewStageForm';
import { StageEditCard } from '@/components/equipe/StageEditCard';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';

interface ProcessStagesTabProps {
  process: EquipeProcesso;
  stages: EquipeProcessoStage[];
  loading: boolean;
  isAddingStage: boolean;
  onAddingStageChange: (adding: boolean) => void;
  onRefresh: () => void;
  onOpenSopConfig: () => void;
  onOpenSop: () => void;
  onOpenImprovement: () => void;
  onOpenHistory: () => void;
}

export function ProcessStagesTab(props: ProcessStagesTabProps) {
  return (
    <TabsContent value="stages" className="mt-0">
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <Button variant="outline" size="sm" onClick={props.onOpenSopConfig}>
          <Edit2 className="h-4 w-4 mr-2" />
          Configurar SOP
        </Button>
        <Button variant="outline" size="sm" onClick={props.onOpenSop}>
          <FileText className="h-4 w-4 mr-2" />
          Ver SOP
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => props.onAddingStageChange(true)}
          disabled={props.isAddingStage || !props.process.cluster_id}
          title={
            !props.process.cluster_id
              ? 'Vincule o processo a um projeto com cluster antes de adicionar etapas'
              : undefined
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Etapa
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={props.onOpenImprovement}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Avaliar Melhoria
        </Button>
        <Button variant="outline" size="sm" onClick={props.onOpenHistory}>
          <History className="h-4 w-4 mr-2" />
          Histórico Versões
        </Button>
      </div>
      {props.loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando etapas...</div>
      ) : (
        <div className="space-y-4">
          {!props.process.cluster_id && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              ⚠ Este processo não tem cluster (não está sob um projeto com cluster). Vincule-o a um
              projeto com cluster para poder adicionar etapas e para que apareça no MAPA.
            </div>
          )}
          {props.isAddingStage && (
            <NewStageForm
              processId={props.process.id}
              nextOrder={props.stages.length + 1}
              onCreated={() => {
                props.onAddingStageChange(false);
                props.onRefresh();
              }}
              onCancel={() => props.onAddingStageChange(false)}
            />
          )}
          {props.stages.length === 0 && !props.isAddingStage ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma etapa cadastrada para este processo.</p>
              <p className="text-sm mt-1">Clique em "Nova Etapa" para adicionar.</p>
            </div>
          ) : (
            props.stages.map((stage, index) => (
              <StageEditCard
                key={stage.id}
                stage={stage}
                index={index}
                totalStages={props.stages.length}
                onUpdate={props.onRefresh}
                onDelete={props.onRefresh}
              />
            ))
          )}
        </div>
      )}
    </TabsContent>
  );
}
