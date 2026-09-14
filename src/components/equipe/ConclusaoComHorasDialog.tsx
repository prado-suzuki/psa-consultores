import { useEffect, useState, type FormEvent } from 'react';
import { Check, Clock3, TimerReset } from 'lucide-react';

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
import { avaliarHorasApontadas, parseHorasRealizadas } from '@/lib/horasApontamento';
import { cn } from '@/lib/utils';

export interface TarefaEmConclusao {
  titulo: string;
  horasEstimadas: number | null;
  horasRealizadas: number | null;
}

interface ConclusaoComHorasDialogProps {
  /** `null` = fechado. */
  tarefa: TarefaEmConclusao | null;
  salvando?: boolean;
  onCancelar: () => void;
  onConfirmar: (horas: number) => void;
}

/**
 * Passo obrigatório entre "marquei como concluída" e a gravação do status.
 *
 * Sem ele, a tarefa sai do quadro com `actual_hours` nulo e a auditoria de
 * produtividade fica com um buraco que só aparece semanas depois, no relatório,
 * quando ninguém mais lembra quantas horas aquilo levou. A Daily já cobrava as
 * horas na conclusão; o Kanban e a Sprint não.
 *
 * O aviso de digitação (`AvisoHorasDigitadas`) trava o botão até alguém corrigir
 * ou confirmar — mesma regra da Daily, porque o erro que ele pega (um dígito a
 * mais) é exatamente o que um campo recém-obrigatório vai produzir.
 */
export function ConclusaoComHorasDialog({
  tarefa,
  salvando,
  onCancelar,
  onConfirmar,
}: ConclusaoComHorasDialogProps) {
  const [horas, setHoras] = useState('');
  const [erro, setErro] = useState(false);
  // Aviso de digitação já confirmado por quem está apontando as horas.
  const [avisoConfirmado, setAvisoConfirmado] = useState(false);

  // Abrir para outra tarefa recomeça o campo com o que ela já tinha apontado.
  useEffect(() => {
    const jaApontadas = tarefa === null ? null : tarefa.horasRealizadas;
    setHoras(jaApontadas === null ? '' : String(jaApontadas));
    setErro(false);
    setAvisoConfirmado(false);
  }, [tarefa]);

  const aviso = tarefa
    ? avaliarHorasApontadas({ realizadas: horas, estimadas: tarefa.horasEstimadas })
    : null;

  const confirmar = (event: FormEvent) => {
    event.preventDefault();
    const valor = parseHorasRealizadas(horas);
    if (valor === null) {
      setErro(true);
      return;
    }
    if (aviso && !avisoConfirmado) return;
    onConfirmar(valor);
  };

  return (
    <Dialog open={tarefa !== null} onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={confirmar}>
          <DialogHeader>
            <DialogTitle>Concluir tarefa</DialogTitle>
            <DialogDescription>
              Informe quantas horas “{tarefa?.titulo}” consumiu. O número alimenta as análises de
              estimadas × realizadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="horas-da-conclusao" className="flex items-center gap-1.5 text-sm">
              <Clock3 className="h-3.5 w-3.5" /> Horas realizadas{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="horas-da-conclusao"
                autoFocus
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={horas}
                onChange={(event) => {
                  setHoras(event.target.value);
                  setErro(false);
                  setAvisoConfirmado(false);
                }}
                placeholder="Ex.: 3,5"
                className={cn('sm:max-w-44', erro && 'border-destructive/50')}
              />
              <div className="flex h-10 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground">
                <TimerReset className="h-3.5 w-3.5" />
                {tarefa === null || tarefa.horasEstimadas === null
                  ? 'Sem estimativa'
                  : `${tarefa.horasEstimadas.toLocaleString('pt-BR')}h estimadas`}
              </div>
            </div>
            {erro && (
              <p className="text-xs font-medium text-destructive">
                Informe um valor igual ou maior que zero.
              </p>
            )}
            <AvisoHorasDigitadas
              aviso={aviso}
              confirmado={avisoConfirmado}
              onConfirmar={() => setAvisoConfirmado(true)}
              onUsarSugestao={(sugestao) => {
                setHoras(String(sugestao));
                setAvisoConfirmado(false);
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || (!!aviso && !avisoConfirmado)}>
              <Check className="mr-1.5 h-4 w-4" />
              {salvando ? 'Concluindo...' : 'Concluir tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
