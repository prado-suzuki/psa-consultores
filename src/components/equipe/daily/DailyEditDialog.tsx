import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { Textarea } from '@/components/ui/textarea';
import type { DailyEditDraft } from '@/lib/equipeDaily';

interface DailyEditDialogProps {
  open: boolean;
  form: DailyEditDraft;
  submitting: boolean;
  onFormChange: (form: DailyEditDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function DailyEditDialog({
  open,
  form,
  submitting,
  onFormChange,
  onClose,
  onSubmit,
}: DailyEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Editar Daily</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-gray-700">O que fiz ontem?</Label>
            <TarefaRichTextEditor
              value={form.did_yesterday}
              onChange={(did_yesterday) => onFormChange({ ...form, did_yesterday })}
              placeholder="Descreva suas entregas de ontem..."
              ariaLabel="O que fiz ontem?"
              minHeight="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">O que vou fazer hoje?</Label>
            <TarefaRichTextEditor
              value={form.will_do_today}
              onChange={(will_do_today) => onFormChange({ ...form, will_do_today })}
              placeholder="Suas tarefas para hoje..."
              ariaLabel="O que vou fazer hoje?"
              minHeight="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Bloqueios? (opcional)</Label>
            <Textarea
              value={form.blockers}
              onChange={(event) => onFormChange({ ...form, blockers: event.target.value })}
              className="min-h-[60px]"
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
