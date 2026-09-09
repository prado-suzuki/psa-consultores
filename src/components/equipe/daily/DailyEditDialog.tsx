import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { Textarea } from '@/components/ui/textarea';
import type { DailyEditDraft } from '@/lib/equipeDaily';
import type { DailySprintTask } from '@/hooks/useDailySprintTasks';

interface DailyEditDialogProps {
  open: boolean;
  form: DailyEditDraft;
  submitting: boolean;
  onFormChange: (form: DailyEditDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  tasks: DailySprintTask[];
  sprintId?: string | null;
}

export function DailyEditDialog({
  open,
  form,
  submitting,
  onFormChange,
  onClose,
  onSubmit,
  tasks,
  sprintId,
}: DailyEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      {/*
        Teto de altura com header e rodapé fixos: a daily de um dia cheio traz
        vários parágrafos, e o modal é centralizado por translate. Sem o teto o
        conteúdo cresce para os dois lados e o título e o X saem pela borda de
        cima, fora de alcance. O maxHeight dos editores segura cada campo antes
        disso, para o texto longo rolar dentro do próprio campo. A largura é a
        dos modais de formulário com editor rico, e não a `lg` do padrão: a
        daily é texto corrido, e linha mais larga é o que a mantém baixa.
      */}
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader><DialogTitle>Editar Daily</DialogTitle></DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="space-y-2">
            <Label className="text-foreground">O que fiz ontem?</Label>
            <TarefaRichTextEditor
              value={form.did_yesterday}
              onChange={(did_yesterday) => onFormChange({ ...form, did_yesterday })}
              placeholder="Descreva suas entregas de ontem..."
              ariaLabel="O que fiz ontem?"
              minHeight="min-h-[100px]"
              maxHeight="max-h-[220px]"
              taskReferences={tasks.map((task) => ({
                ...task,
                href: `/equipe/sprints/${sprintId}?taskId=${task.id}`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">O que vou fazer hoje?</Label>
            <TarefaRichTextEditor
              value={form.will_do_today}
              onChange={(will_do_today) => onFormChange({ ...form, will_do_today })}
              placeholder="Suas tarefas para hoje..."
              ariaLabel="O que vou fazer hoje?"
              minHeight="min-h-[100px]"
              maxHeight="max-h-[220px]"
              taskReferences={tasks.map((task) => ({
                ...task,
                href: `/equipe/sprints/${sprintId}?taskId=${task.id}`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Bloqueios? (opcional)</Label>
            <Textarea
              value={form.blockers}
              onChange={(event) => onFormChange({ ...form, blockers: event.target.value })}
              className="max-h-[120px] min-h-[60px]"
              placeholder="Algum impedimento ou bloqueio?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
