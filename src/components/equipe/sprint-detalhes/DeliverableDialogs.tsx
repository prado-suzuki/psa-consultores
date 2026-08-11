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
    'flex max-h-[90vh] flex-col gap-0 overflow-hidden border-teal-700/30 p-0 transition-[max-width] duration-200',
    // O "X" de fechar é filho direto do content e herdaria a cor do texto: sobre
    // a faixa teal ele precisa ser claro.
    '[&>button]:text-white/70 [&>button:hover]:text-white',
    expanded ? 'h-[88vh] sm:max-w-4xl' : 'sm:max-w-[calc(100vw-2rem)] xl:max-w-7xl',
  );

// Faixa de cor no topo: o teal da área entra em bloco, não em linha fina, e é o
// que tira o modal do branco. Miolo e rodapé seguem claros para o formulário
// respirar embaixo dela.
// Degrau mais claro da escala (a paleta do projeto só tem 500/600/700), não
// transparência: misturar com o branco do modal deixaria o teal acinzentado.
// A borda mais escura mantém a faixa com um limite definido embaixo.
const headerClass = 'border-b border-teal-700 bg-teal-500 px-6 py-4 pr-12 text-white';
const footerClass = 'border-t border-teal-600/20 bg-background px-6 py-4';

/** Selo antes do título: recorte claro dentro da faixa, para o ícone respirar. */
function TitleSeal({ icon: Icon }: { icon: typeof ClipboardList }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
      <Icon className="h-4 w-4" />
    </span>
  );
}

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
