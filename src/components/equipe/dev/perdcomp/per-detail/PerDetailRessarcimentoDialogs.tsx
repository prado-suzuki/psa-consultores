import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PerDetailRessarcimentoDialogsProps {
  nrPer: string;
  formattedNrPer: string;
  ressarcimentoOpen: boolean;
  onRessarcimentoOpenChange: (open: boolean) => void;
  ressarcimentoValor: string;
  onRessarcimentoValorInput: (value: string) => void;
  ressarcimentoData: string;
  ressarcimentoDataDisplay: string;
  ressarcimentoDate: Date | undefined;
  onRessarcimentoDateSelect: (date: Date | undefined) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  valorNumerico: number;
  selicIndisponivel: boolean;
  selicError?: string;
  fatorRessarcimento: number;
  valorOriginal: number;
  formatCurrency: (value: number) => string;
  savePending: boolean;
  onSave: () => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  vlrRessarcido: number;
  deletePending: boolean;
  onDelete: () => void;
}

export function PerDetailRessarcimentoDialogs({
  nrPer,
  formattedNrPer,
  ressarcimentoOpen,
  onRessarcimentoOpenChange,
  ressarcimentoValor,
  onRessarcimentoValorInput,
  ressarcimentoData,
  ressarcimentoDataDisplay,
  ressarcimentoDate,
  onRessarcimentoDateSelect,
  calendarOpen,
  onCalendarOpenChange,
  valorNumerico,
  selicIndisponivel,
  selicError,
  fatorRessarcimento,
  valorOriginal,
  formatCurrency,
  savePending,
  onSave,
  deleteOpen,
  onDeleteOpenChange,
  vlrRessarcido,
  deletePending,
  onDelete,
}: PerDetailRessarcimentoDialogsProps) {
  return (
    <>
      <AlertDialog open={ressarcimentoOpen} onOpenChange={onRessarcimentoOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Ressarcimento</AlertDialogTitle>
            <AlertDialogDescription>
              Registre o valor efetivamente ressarcido e a data do pagamento para o PER {nrPer}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor Atualizado (R$)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={ressarcimentoValor}
                onChange={(event) => onRessarcimentoValorInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !ressarcimentoData && 'text-muted-foreground',
                    )}
                  >
                    {ressarcimentoData ? ressarcimentoDataDisplay : <span>Selecione...</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar selected={ressarcimentoDate} onSelect={onRessarcimentoDateSelect} />
                </PopoverContent>
              </Popover>
            </div>
            {ressarcimentoData && valorNumerico > 0 && (
              <div className="rounded-md border bg-muted p-3 text-sm">
                {selicIndisponivel ? (
                  <p className="text-xs text-destructive">
                    SELIC indisponível: {selicError ?? 'sem dados da API'}
                  </p>
                ) : fatorRessarcimento > 0 ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Original (calculado)</p>
                      <p className="font-mono font-bold text-foreground">
                        {formatCurrency(valorOriginal)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Fator SELIC: {fatorRessarcimento.toFixed(6)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Em carência — sem parcela SELIC (Valor Original = Valor Atualizado)
                  </p>
                )}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onSave} disabled={savePending || selicIndisponivel}>
              {savePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ressarcimento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação limpa o valor ressarcido registrado neste PER
              {nrPer ? ` (${formattedNrPer})` : ''}
              {vlrRessarcido > 0 ? ` — ${formatCurrency(vlrRessarcido)}` : ''}. Não é possível
              desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
            >
              {deletePending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
