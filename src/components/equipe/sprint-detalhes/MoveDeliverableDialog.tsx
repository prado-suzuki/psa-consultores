import { format } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseDate } from '@/lib/dateUtils';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

interface MoveDeliverableDialogProps {
  controller: EquipeSprintDetalhesController;
}

/**
 * Confirmação do move de tarefa entre sprints.
 *
 * O diálogo mostra por escrito tudo que a gravação vai fazer antes de fazer: subtarefa que passa a
 * ser tarefa principal, subtarefas que vão junto, datas que mudam e perda de visibilidade quando a
 * sprint de destino é de outro projeto. As frases vêm de describeMoveEffect, a mesma função que
 * recebe as datas já calculadas pela lógica da gravação, para o texto não prometer uma coisa e o
 * banco fazer outra.
 */
export function MoveDeliverableDialog({ controller: c }: MoveDeliverableDialogProps) {
  const task = c.movingDeliverable;
  const humanDate = (iso: string) => format(parseDate(iso), 'dd/MM/yyyy');

  return (
    <Dialog open={c.moveModalOpen} onOpenChange={(open) => !open && c.closeMoveModal()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover tarefa de sprint</DialogTitle>
          <DialogDescription>
            {task ? `"${task.title}"` : ''}
            {task?.parent_id ? ' (hoje é subtarefa)' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="move-target-sprint">Sprint de destino</Label>
          <Select value={c.moveTargetSprintId} onValueChange={c.setMoveTargetSprintId}>
            <SelectTrigger id="move-target-sprint">
              <SelectValue placeholder="Escolha a sprint" />
            </SelectTrigger>
            <SelectContent>
              {c.moveSprintOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name} ({humanDate(option.start_date)} a {humanDate(option.end_date)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {c.movePreview && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
            <p className="font-medium mb-1">O que vai acontecer</p>
            <ul className="list-disc pl-4 space-y-1">
              {c.movePreview.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={c.closeMoveModal} disabled={c.moving}>
            Cancelar
          </Button>
          <Button onClick={c.confirmMove} disabled={c.moving || !c.moveTargetSprint}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {c.moving ? 'Movendo...' : 'Mover tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
