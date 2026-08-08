import { useState } from 'react';
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
import { DeliverableFormFields } from '@/components/equipe/sprint-detalhes/DeliverableFormFields';
import { RetrospectiveReportDialog } from '@/components/equipe/sprint-detalhes/RetrospectiveReportDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AnexosEntregavel } from '@/components/equipe/AnexosEntregavel';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

// Modal largo e de altura contida; em "tela cheia" da descrição ele assume a
// altura máxima para o campo esticar sem empurrar o rodapé para fora da tela.
const contentClass = (expanded: boolean) =>
  cn(
    'flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 transition-[max-width] duration-200',
    expanded ? 'h-[88vh] sm:max-w-4xl' : 'sm:max-w-[calc(100vw-2rem)] xl:max-w-7xl',
  );

export function DeliverableDialogs({
  controller: c,
}: {
  controller: EquipeSprintDetalhesController;
}) {
  const [editDescriptionExpanded, setEditDescriptionExpanded] = useState(false);
  const [createDescriptionExpanded, setCreateDescriptionExpanded] = useState(false);

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

      <Dialog
        open={c.editModalOpen}
        onOpenChange={(open) => {
          if (!open) setEditDescriptionExpanded(false);
          c.setEditModalOpen(open);
        }}
      >
        <DialogContent
          className={contentClass(editDescriptionExpanded)}
          onEscapeKeyDown={(event) => {
            if (editDescriptionExpanded) {
              event.preventDefault();
              setEditDescriptionExpanded(false);
            }
          }}
        >
          <DialogHeader className="border-b bg-muted/30 px-6 py-4 pr-12">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl tracking-tight">Editar Entregável</DialogTitle>
              {c.editingDeliverable && !editDescriptionExpanded && (
                <RetrospectiveReportDialog
                  deliverable={c.editingDeliverable}
                  controller={c}
                  showLabel
                />
              )}
            </div>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
            <DeliverableFormFields
              prefix="edit"
              form={c.editForm}
              setForm={c.setEditForm}
              controller={c}
              editingId={c.editingDeliverable?.id}
              descriptionExpanded={editDescriptionExpanded}
              onToggleDescription={() => setEditDescriptionExpanded((current) => !current)}
            />
            {!editDescriptionExpanded && (
              <AnexosEntregavel deliverableId={c.editingDeliverable?.id} ativo={c.editModalOpen} />
            )}
          </div>
          <DialogFooter className="border-t bg-background px-6 py-4 sm:justify-between">
            <AlertDialog open={c.deleteDialogOpen} onOpenChange={c.setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10">
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

      <Dialog
        open={c.createModalOpen}
        onOpenChange={(open) => {
          if (!open) setCreateDescriptionExpanded(false);
          c.setCreateModalOpen(open);
        }}
      >
        <DialogContent
          className={contentClass(createDescriptionExpanded)}
          onEscapeKeyDown={(event) => {
            if (createDescriptionExpanded) {
              event.preventDefault();
              setCreateDescriptionExpanded(false);
            }
          }}
        >
          <DialogHeader className="border-b bg-muted/30 px-6 py-4 pr-12">
            <DialogTitle className="text-xl tracking-tight">Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
            <DeliverableFormFields
              prefix="create"
              form={c.createForm}
              setForm={c.setCreateForm}
              controller={c}
              descriptionExpanded={createDescriptionExpanded}
              onToggleDescription={() => setCreateDescriptionExpanded((current) => !current)}
            />
          </div>
          <DialogFooter className="border-t bg-background px-6 py-4">
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
