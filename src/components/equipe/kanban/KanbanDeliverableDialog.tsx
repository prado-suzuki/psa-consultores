import type { Dispatch, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { avaliarHorasApontadas } from '@/lib/horasApontamento';
import { cn } from '@/lib/utils';
import { AnexosEntregavel } from '@/components/equipe/AnexosEntregavel';
import { AvisoHorasDigitadas } from '@/components/equipe/AvisoHorasDigitadas';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { ENTREGAVEL_STATUS_OPCOES } from '@/lib/entregavelStatusColors';
import type {
  EquipeKanbanDeliverable,
  EquipeKanbanEditForm,
  EquipeKanbanProfile,
} from '@/lib/equipeKanban';

interface KanbanDeliverableDialogProps {
  selectedDeliverable: EquipeKanbanDeliverable | null;
  editForm: EquipeKanbanEditForm;
  profiles: EquipeKanbanProfile[];
  subtasks: EquipeKanbanDeliverable[];
  deleting: boolean;
  deleteDialogOpen: boolean;
  setEditForm: Dispatch<SetStateAction<EquipeKanbanEditForm>>;
  onClose: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDeleteDeliverable: () => void;
  onSubtaskStatusChange: (subtask: EquipeKanbanDeliverable) => Promise<void>;
  onOpenSubtask: (subtask: EquipeKanbanDeliverable) => void;
}

export function KanbanDeliverableDialog(props: KanbanDeliverableDialogProps) {
  const { selectedDeliverable, editForm, setEditForm } = props;

  return (
    <Dialog open={!!selectedDeliverable} onOpenChange={(open) => !open && props.onClose()}>
      {/* Cabeçalho e rodapé parados, só o corpo rolando: é o outro modal do
          sistema onde se digita descrição em texto rico, e rolar tudo junto
          levava o título e os botões de salvar para fora da vista. */}
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {selectedDeliverable?.parent_id ? 'Detalhes da Subtarefa' : 'Detalhes do Entregável'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {selectedDeliverable?.task_code && (
            <div className="text-sm text-muted-foreground">
              Código: <span className="font-mono">{selectedDeliverable.task_code}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={editForm.title}
              onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            {/* Mesma coluna editada no modal da sprint: precisa do mesmo editor rico,
                senão abrir aqui um texto formatado mostraria o JSON cru. */}
            <Label>Descrição</Label>
            <TarefaRichTextEditor
              value={editForm.description}
              onChange={(next) => setEditForm({ ...editForm, description: next })}
              ariaLabel="Descrição"
              minHeight="min-h-[120px]"
              maxHeight="max-h-[280px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={editForm.assigned_to || 'unassigned'}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, assigned_to: value === 'unassigned' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {props.profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTREGAVEL_STATUS_OPCOES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onChange={(event) => setEditForm({ ...editForm, start_date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Limite</Label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(event) => setEditForm({ ...editForm, due_date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Horas Estimadas</Label>
              <Input
                type="number"
                step="0.5"
                value={editForm.estimated_hours}
                onChange={(event) =>
                  setEditForm({ ...editForm, estimated_hours: event.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>

          {editForm.status === 'completed' && (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
              <Label className="text-foreground font-medium">Horas Realizadas</Label>
              <Input
                type="number"
                step="0.5"
                value={editForm.actual_hours}
                onChange={(event) => setEditForm({ ...editForm, actual_hours: event.target.value })}
                className="border-warning/50"
                placeholder="0"
              />
              <AvisoHorasDigitadas
                aviso={avaliarHorasApontadas({
                  realizadas: editForm.actual_hours,
                  estimadas: editForm.estimated_hours,
                })}
                className="bg-card"
                onUsarSugestao={(horas) =>
                  setEditForm({ ...editForm, actual_hours: String(horas) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Preencha as horas reais — usado nas análises (estimadas × realizadas).
              </p>
            </div>
          )}

          {selectedDeliverable && !selectedDeliverable.parent_id && props.subtasks.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="flex items-center gap-2">
                Subtarefas (
                {props.subtasks.filter((subtask) => subtask.status === 'completed').length}/
                {props.subtasks.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {props.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md bg-muted border border-border',
                      subtask.status === 'completed' && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      checked={subtask.status === 'completed'}
                      onCheckedChange={() => props.onSubtaskStatusChange(subtask)}
                    />
                    <button
                      type="button"
                      onClick={() => props.onOpenSubtask(subtask)}
                      className="flex-1 text-left cursor-pointer hover:underline"
                      title="Abrir subtarefa (para lançar horas realizadas)"
                    >
                      <span
                        className={cn(
                          'text-sm',
                          subtask.status === 'completed' && 'line-through',
                        )}
                      >
                        {subtask.task_code && (
                          <span className="text-muted-foreground mr-1">{subtask.task_code}</span>
                        )}
                        {subtask.title}
                      </span>
                    </button>
                    {subtask.estimated_hours && (
                      <span className="text-xs text-muted-foreground">{subtask.estimated_hours}h</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AnexosEntregavel
            deliverableId={selectedDeliverable?.id}
            ativo={!!selectedDeliverable}
          />
        </div>

        <DialogFooter className="flex justify-between">
          <AlertDialog open={props.deleteDialogOpen} onOpenChange={props.onDeleteDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este entregável? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white border-border">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={props.onDeleteDeliverable}
                  disabled={props.deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {props.deleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={props.onClose} className="border-border">
              Cancelar
            </Button>
            <Button onClick={props.onSave} className="bg-primary hover:bg-primary/90">
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
