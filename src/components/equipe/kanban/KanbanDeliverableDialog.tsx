import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  formatEquipeKanbanFileSize,
  type EquipeKanbanAttachment,
  type EquipeKanbanDeliverable,
  type EquipeKanbanEditForm,
  type EquipeKanbanProfile,
} from '@/lib/equipeKanban';

interface KanbanDeliverableDialogProps {
  selectedDeliverable: EquipeKanbanDeliverable | null;
  editForm: EquipeKanbanEditForm;
  profiles: EquipeKanbanProfile[];
  subtasks: EquipeKanbanDeliverable[];
  attachments: EquipeKanbanAttachment[];
  fileInputRef: RefObject<HTMLInputElement>;
  uploadingFile: boolean;
  deleting: boolean;
  deleteDialogOpen: boolean;
  setEditForm: Dispatch<SetStateAction<EquipeKanbanEditForm>>;
  onClose: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDeleteDeliverable: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownloadFile: (attachment: EquipeKanbanAttachment) => void;
  onDeleteFile: (attachment: EquipeKanbanAttachment) => void;
  onSubtaskStatusChange: (subtask: EquipeKanbanDeliverable) => Promise<void>;
}

export function KanbanDeliverableDialog(props: KanbanDeliverableDialogProps) {
  const { selectedDeliverable, editForm, setEditForm } = props;

  return (
    <Dialog open={!!selectedDeliverable} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {selectedDeliverable?.parent_id ? 'Detalhes da Subtarefa' : 'Detalhes do Entregável'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedDeliverable?.task_code && (
            <div className="text-sm text-gray-500">
              Código: <span className="font-mono">{selectedDeliverable.task_code}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-700">Título</Label>
            <Input
              value={editForm.title}
              onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Descrição</Label>
            <Textarea
              value={editForm.description}
              onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
              className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
              placeholder="Descreva os detalhes do entregável..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Responsável</Label>
              <Select
                value={editForm.assigned_to || 'unassigned'}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, assigned_to: value === 'unassigned' ? '' : value })
                }
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
              <Label className="text-gray-700">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="pending">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Data Início</Label>
              <Input
                type="date"
                value={editForm.start_date}
                onChange={(event) => setEditForm({ ...editForm, start_date: event.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Data Limite</Label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(event) => setEditForm({ ...editForm, due_date: event.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Horas Estimadas</Label>
              <Input
                type="number"
                step="0.5"
                value={editForm.estimated_hours}
                onChange={(event) =>
                  setEditForm({ ...editForm, estimated_hours: event.target.value })
                }
                className="bg-white border-gray-300 text-gray-900"
                placeholder="0"
              />
            </div>
          </div>

          {selectedDeliverable && !selectedDeliverable.parent_id && props.subtasks.length > 0 && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <Label className="text-gray-700 flex items-center gap-2">
                Subtarefas (
                {props.subtasks.filter((subtask) => subtask.status === 'completed').length}/
                {props.subtasks.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {props.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md bg-gray-50 border border-gray-100',
                      subtask.status === 'completed' && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      checked={subtask.status === 'completed'}
                      onCheckedChange={() => props.onSubtaskStatusChange(subtask)}
                    />
                    <div className="flex-1">
                      <span
                        className={cn(
                          'text-sm text-gray-700',
                          subtask.status === 'completed' && 'line-through',
                        )}
                      >
                        {subtask.task_code && (
                          <span className="text-gray-400 mr-1">{subtask.task_code}</span>
                        )}
                        {subtask.title}
                      </span>
                    </div>
                    {subtask.estimated_hours && (
                      <span className="text-xs text-gray-400">{subtask.estimated_hours}h</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.fileInputRef.current?.click()}
                disabled={props.uploadingFile}
                className="border-gray-300"
              >
                <Upload className="h-4 w-4 mr-2" />
                {props.uploadingFile ? 'Enviando...' : 'Anexar arquivo'}
              </Button>
              <input
                ref={props.fileInputRef}
                type="file"
                className="hidden"
                onChange={props.onFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
              />
            </div>

            {props.attachments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum anexo</p>
            ) : (
              <div className="space-y-2">
                {props.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{attachment.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatEquipeKanbanFileSize(attachment.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.onDownloadFile(attachment)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.onDeleteFile(attachment)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <AlertDialog open={props.deleteDialogOpen} onOpenChange={props.onDeleteDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900">Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Tem certeza que deseja excluir este entregável? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white border-gray-300 text-gray-700">
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
            <Button variant="outline" onClick={props.onClose} className="border-gray-300">
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
