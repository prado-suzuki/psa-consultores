import { useEffect, useState } from 'react';
import { CheckCircle2, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { AvisoHorasDigitadas } from '@/components/equipe/AvisoHorasDigitadas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { AreaKey } from '@/config/areaCategories';
import { OrgTask, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { avaliarHorasApontadas, formatarHoras } from '@/lib/horasApontamento';
import { horasApontadas } from '@/lib/orgTaskHours';
import { cn } from '@/lib/utils';

/**
 * Pergunta as horas realizadas antes de concluir a tarefa.
 *
 * Existe por causa dos atalhos: arrastar o card no kanban, o checkbox da
 * subtarefa e os selects de status da tabela, da visão Hoje e da árvore de
 * Projetos & Tarefas concluem sem abrir o formulário — e a trava de
 * `useUpdateOrgTask` recusaria a conclusão sem dar onde digitar. Aqui a pessoa
 * digita e conclui no mesmo gesto.
 *
 * A estimativa aparece ao lado só como referência: nada é validado contra ela.
 * O aviso de digitação (3× a estimativa) é informativo e não impede concluir.
 */

interface TaskCompletionHoursDialogProps {
  /** Tarefa aguardando apontamento; `null` mantém o diálogo fechado. */
  task: OrgTask | null;
  area: AreaKey;
  onClose: () => void;
}

export function TaskCompletionHoursDialog({
  task,
  area,
  onClose,
}: TaskCompletionHoursDialogProps) {
  const updateTask = useUpdateOrgTask(area, { showToasts: false });
  const [horas, setHoras] = useState('');
  const [erro, setErro] = useState(false);

  // O diálogo é montado uma vez por tela e reaproveitado a cada atalho: sem
  // isso a hora da tarefa anterior apareceria já digitada na próxima.
  useEffect(() => {
    setHoras('');
    setErro(false);
  }, [task?.id]);

  const valor = horasApontadas(horas);
  const aviso = avaliarHorasApontadas({
    realizadas: horas,
    estimadas: task?.estimated_hours,
  });

  const concluir = async () => {
    if (!task) return;
    if (valor === null) {
      setErro(true);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: task.id, status: 'done', actual_hours: valor });
      toast.success('Tarefa concluída');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível concluir a tarefa',
      );
    }
  };

  return (
    <Dialog
      open={!!task}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-status-feito-soft p-2 text-status-feito">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Concluir tarefa</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">{task?.title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="conclusao-horas">
            Horas realizadas <RequiredMark />
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="conclusao-horas"
              autoFocus
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={horas}
              onChange={(event) => {
                setHoras(event.target.value);
                setErro(false);
              }}
              placeholder="Ex.: 3,5"
              className={cn('h-9 sm:max-w-44', erro && 'border-destructive/50')}
            />
            <div className="flex h-9 items-center gap-1.5 rounded-md border bg-muted/40 px-3 text-xs text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5 shrink-0" />
              {task?.estimated_hours
                ? `${formatarHoras(task.estimated_hours)}h estimadas`
                : 'Sem estimativa'}
            </div>
          </div>
          {erro && (
            <p className="text-sm text-destructive">Informe um valor maior que zero.</p>
          )}
          <AvisoHorasDigitadas aviso={aviso} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateTask.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={concluir}
            disabled={updateTask.isPending}
            className="bg-status-feito hover:bg-status-feito/90"
          >
            Concluir tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
