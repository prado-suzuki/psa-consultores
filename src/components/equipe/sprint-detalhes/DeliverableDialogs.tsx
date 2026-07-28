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
import { OpenSubtasksWarningDialog } from '@/components/equipe/OpenSubtasksWarningDialog';
import { MoveDeliverableDialog } from '@/components/equipe/sprint-detalhes/MoveDeliverableDialog';
import { Button } from '@/components/ui/button';
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
import type {
  DeliverableForm,
  EquipeSprintDetalhesController,
} from '@/hooks/useEquipeSprintDetalhesController';

interface FieldsProps {
  prefix: 'edit' | 'create';
  form: DeliverableForm;
  setForm: React.Dispatch<React.SetStateAction<DeliverableForm>>;
  controller: EquipeSprintDetalhesController;
  editingId?: string;
}

function DeliverableFields({ prefix, form, setForm, controller: c, editingId }: FieldsProps) {
  const update = (field: keyof DeliverableForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const linkedProcesses = c.processes.filter(
    (process) =>
      !form.project_id ||
      process.project_id === form.project_id ||
      c.projectProcesses.some(
        (link) => link.process_id === process.id && link.project_id === form.project_id,
      ),
  );
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-title`}>{prefix === 'create' ? 'Título *' : 'Título'}</Label>
        <Input
          id={`${prefix}-title`}
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-description`}>Descrição</Label>
        <Textarea
          id={`${prefix}-description`}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-parent`}>Tarefa Pai (opcional)</Label>
        <Select
          value={form.parent_id || 'none'}
          onValueChange={(value) =>
            setForm((current) =>
              c.selectParent(current, value === 'none' ? '' : value, prefix === 'edit'),
            )
          }
        >
          <SelectTrigger id={`${prefix}-parent`}>
            <SelectValue placeholder="Nenhuma (tarefa principal)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma (tarefa principal)</SelectItem>
            {c.parentTaskOptions
              .filter((item) => item.id !== editingId)
              .map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.task_code && `${item.task_code} - `}
                  {item.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {(prefix === 'create' || form.parent_id) && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-task-code`}>ID / Ordem</Label>
          <Input
            id={`${prefix}-task-code`}
            value={form.task_code}
            onChange={(event) => update('task_code', event.target.value)}
          />
          {form.parent_id && (
            <p className="text-xs text-muted-foreground">
              Alterar reordena automaticamente as demais subtarefas
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-assigned`}>Responsável</Label>
          <Select
            value={form.assigned_to || 'unassigned'}
            onValueChange={(value) => update('assigned_to', value === 'unassigned' ? '' : value)}
          >
            <SelectTrigger id={`${prefix}-assigned`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Não atribuído</SelectItem>
              {c.profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.first_name} {profile.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {prefix === 'edit' ? (
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={form.status} onValueChange={(value) => update('status', value)}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="create-hours">Horas Estimadas</Label>
            <Input
              id="create-hours"
              type="number"
              step="0.5"
              min="0"
              value={form.estimated_hours}
              onChange={(event) => update('estimated_hours', event.target.value)}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}-start`}>Data Início</Label>
          <Input
            id={`${prefix}-start`}
            type="date"
            value={form.start_date}
            onChange={(event) => update('start_date', event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-due`}>Data Entrega{prefix === 'create' ? ' *' : ''}</Label>
          <Input
            id={`${prefix}-due`}
            type="date"
            value={form.due_date}
            onChange={(event) => update('due_date', event.target.value)}
          />
        </div>
      </div>
      {prefix === 'edit' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-hours">Horas Estimadas</Label>
            <Input
              id="edit-hours"
              type="number"
              step="0.5"
              min="0"
              value={form.estimated_hours}
              onChange={(event) => update('estimated_hours', event.target.value)}
            />
          </div>
          {form.status === 'completed' && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2">
              <Label htmlFor="edit-actual-hours" className="text-amber-800 font-medium">
                Horas Realizadas
              </Label>
              <Input
                id="edit-actual-hours"
                type="number"
                step="0.5"
                min="0"
                value={form.actual_hours}
                onChange={(event) => update('actual_hours', event.target.value)}
                className="bg-white border-amber-300"
              />
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}-project`}>Projeto</Label>
          <Select
            value={form.project_id || 'none'}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                project_id: value === 'none' ? '' : value,
                process_id: value === 'none' ? current.process_id : '',
              }))
            }
          >
            <SelectTrigger id={`${prefix}-project`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {c.projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-process`}>Processo</Label>
          <Select
            value={form.process_id || 'none'}
            onValueChange={(value) => update('process_id', value === 'none' ? '' : value)}
          >
            <SelectTrigger id={`${prefix}-process`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {linkedProcesses.map((process) => (
                <SelectItem key={process.id} value={process.id}>
                  {process.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function DeliverableDialogs({
  controller: c,
}: {
  controller: EquipeSprintDetalhesController;
}) {
  return (
    <>
      <OpenSubtasksWarningDialog
        taskTitle={c.completionWarning?.taskTitle ?? null}
        openSubtasks={c.completionWarning?.openSubtasks ?? []}
        confirming={c.confirmingCompletion}
        getProfileName={c.getProfileName}
        onCancel={c.cancelCompletionWarning}
        onConfirm={c.confirmCompletionWarning}
      />

      <MoveDeliverableDialog controller={c} />

      <Dialog open={c.editModalOpen} onOpenChange={c.setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Entregável</DialogTitle>
          </DialogHeader>
          <DeliverableFields
            prefix="edit"
            form={c.editForm}
            setForm={c.setEditForm}
            controller={c}
            editingId={c.editingDeliverable?.id}
          />
          <DialogFooter className="flex justify-between sm:justify-between">
            <AlertDialog open={c.deleteDialogOpen} onOpenChange={c.setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir entregável?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O entregável "{c.editingDeliverable?.title}"
                    será permanentemente removido junto com todos os seus anexos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={c.deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={c.deleteDeliverable}
                    disabled={c.deleting}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {c.deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => c.setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={c.saveDeliverable}
                disabled={c.saving || !c.editForm.title || !c.editForm.due_date}
              >
                {c.saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={c.createModalOpen} onOpenChange={c.setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <DeliverableFields
            prefix="create"
            form={c.createForm}
            setForm={c.setCreateForm}
            controller={c}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => c.setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={c.createDeliverable}
              disabled={c.creating || !c.createForm.title || !c.createForm.due_date}
            >
              {c.creating ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
