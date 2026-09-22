import { useState } from 'react';
import { ClipboardList, ListPlus, Trash2 } from 'lucide-react';
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
import { ConclusaoComHorasDialog } from '@/components/equipe/ConclusaoComHorasDialog';
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
import { TitleSeal } from '@/components/equipe/sprint-detalhes/tarefaModalVisual';
import {
  tarefaModalBodyClass as bodyClass,
  tarefaModalContentClass as contentClass,
  tarefaModalFooterClass as footerClass,
  tarefaModalHeaderClass as headerClass,
} from '@/components/equipe/sprint-detalhes/tarefaModalClasses';
import { AnexosEntregavel } from '@/components/equipe/AnexosEntregavel';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

export function DeliverableDialogs({
  controller: c,
}: {
  controller: EquipeSprintDetalhesController;
}) {
  const [editDescriptionExpanded, setEditDescriptionExpanded] = useState(false);
  const [createDescriptionExpanded, setCreateDescriptionExpanded] = useState(false);

  return (
    <>
      <ConclusaoComHorasDialog
        tarefa={c.conclusao.pendente}
        salvando={c.conclusao.salvando}
        onCancelar={c.conclusao.cancelar}
        onConfirmar={(horas) => void c.conclusao.confirmar(horas)}
      />

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
          <DialogHeader className={headerClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <TitleSeal icon={ClipboardList} />
                <DialogTitle className="text-xl tracking-tight">Editar Entregável</DialogTitle>
              </div>
              {c.editingDeliverable && !editDescriptionExpanded && (
                // A ação vive dentro da faixa teal: texto e ícone claros, realce
                // por transparência em vez da cor de fundo padrão do botão.
                <div className="[&_button:hover]:bg-white/15 [&_button:hover]:text-white [&_button]:text-white [&_svg]:text-white">
                  <RetrospectiveReportDialog
                    deliverable={c.editingDeliverable}
                    controller={c}
                    showLabel
                  />
                </div>
              )}
            </div>
          </DialogHeader>
          <div className={bodyClass}>
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
          <DialogFooter className={cn(footerClass, 'sm:justify-between')}>
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
                // A descrição é lida à parte, ao abrir a tarefa. Salvar antes de
                // ela chegar gravaria o campo em branco por cima do texto atual.
                disabled={
                  c.saving ||
                  c.descricaoDaTarefaCarregando ||
                  !c.editForm.title ||
                  !c.editForm.due_date
                }
              >
                {c.saving
                  ? 'Salvando...'
                  : c.descricaoDaTarefaCarregando
                    ? 'Carregando...'
                    : 'Salvar Alterações'}
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
          <DialogHeader className={headerClass}>
            <div className="flex min-w-0 items-center gap-2.5">
              <TitleSeal icon={ListPlus} />
              <DialogTitle className="text-xl tracking-tight">Nova Tarefa</DialogTitle>
            </div>
          </DialogHeader>
          <div className={bodyClass}>
            <DeliverableFormFields
              prefix="create"
              form={c.createForm}
              setForm={c.setCreateForm}
              controller={c}
              descriptionExpanded={createDescriptionExpanded}
              onToggleDescription={() => setCreateDescriptionExpanded((current) => !current)}
            />
          </div>
          <DialogFooter className={footerClass}>
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
