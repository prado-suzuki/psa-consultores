import { GitBranch, Save, X } from 'lucide-react';
import type { EquipeProcesso, EquipeProcessoEditForm } from '@/lib/equipeProcessos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getProcessStageInfo, PROCESS_STAGES } from '@/components/equipe/projetos/constants';

interface ProcessInfoTabProps {
  process: EquipeProcesso;
  taskCount: number;
  isEditing: boolean;
  saving: boolean;
  editForm: EquipeProcessoEditForm;
  equipes: Array<{ id: string; name: string }>;
  onEditFieldChange: (field: keyof EquipeProcessoEditForm, value: string) => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onGenerateScenario: () => void;
  onViewScenarios: () => void;
}

export function ProcessInfoTab(props: ProcessInfoTabProps) {
  const setField = (field: keyof EquipeProcessoEditForm, value: string) => {
    props.onEditFieldChange(field, value);
  };

  return (
    <TabsContent value="info" className="mt-0 space-y-4">
      {!props.isEditing && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Área</label>
              <p className="text-gray-900">{props.process.area || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Fase</label>
              <Badge className={getProcessStageInfo(props.process.stage).color}>
                {getProcessStageInfo(props.process.stage).label}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Prioridade</label>
              <p className="text-gray-900">{props.process.priority || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Frequência</label>
              <p className="text-gray-900">{props.process.frequency || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Volume Mensal</label>
              <p className="text-gray-900">{props.process.volume_month || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Impacto Financeiro</label>
              <p className="text-gray-900">{props.process.financial_impact || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tarefas Vinculadas</label>
              <div className="mt-1">
                <Badge variant={props.taskCount > 0 ? 'default' : 'secondary'}>
                  {props.taskCount} tarefa{props.taskCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
          {props.process.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-gray-900 mt-1">{props.process.description}</p>
            </div>
          )}
          <div className="pt-3 border-t flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={props.onGenerateScenario}>
              <GitBranch className="h-4 w-4 mr-2" />
              Gerar variante (cenário)
            </Button>
            <Button variant="ghost" size="sm" onClick={props.onViewScenarios}>
              Ver cenários deste processo
            </Button>
          </div>
        </>
      )}
      {props.isEditing && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nome do Processo *</Label>
            <Input
              id="edit-name"
              value={props.editForm.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Nome do processo"
            />
          </div>
          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={props.editForm.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Descrição do processo"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-equipe">Equipe responsável</Label>
              <Select
                value={props.editForm.equipe_id}
                onValueChange={(value) => setField('equipe_id', value)}
              >
                <SelectTrigger id="edit-equipe">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {props.equipes.map((equipe) => (
                    <SelectItem key={equipe.id} value={equipe.id}>
                      {equipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Estrutura formal da equipe (substitui o campo "Área" livre).
              </p>
            </div>
            <div>
              <Label htmlFor="edit-stage">Status / Fase</Label>
              <Select
                value={props.editForm.stage}
                onValueChange={(value) => setField('stage', value)}
              >
                <SelectTrigger id="edit-stage">
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Descoberta = Não Iniciado · Mapeamento/Análise/Melhoria/Automação = Em Andamento ·
                Concluído = Concluído
              </p>
            </div>
            <div>
              <Label htmlFor="edit-priority">Prioridade</Label>
              <Select
                value={props.editForm.priority}
                onValueChange={(value) => setField('priority', value)}
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
                value={props.editForm.frequency}
                onChange={(event) => setField('frequency', event.target.value)}
                placeholder="Ex: Diária, Semanal, Mensal"
              />
            </div>
            <div>
              <Label htmlFor="edit-volume">Volume Mensal</Label>
              <Input
                id="edit-volume"
                type="number"
                value={props.editForm.volume_month}
                onChange={(event) => setField('volume_month', event.target.value)}
                placeholder="Quantidade por mês"
              />
            </div>
            <div>
              <Label htmlFor="edit-impact">Impacto Financeiro</Label>
              <Input
                id="edit-impact"
                value={props.editForm.financial_impact}
                onChange={(event) => setField('financial_impact', event.target.value)}
                placeholder="Ex: Alto, Médio, Baixo"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={props.onCancelEditing} disabled={props.saving}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={props.onSave} disabled={props.saving || !props.editForm.name.trim()}>
              <Save className="h-4 w-4 mr-1" />
              {props.saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
