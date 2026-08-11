import { AlertTriangle, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatarHoras, type AvisoHorasApontadas } from '@/lib/horasApontamento';
import { cn } from '@/lib/utils';

interface AvisoHorasDigitadasProps {
  /** Resultado de `avaliarHorasApontadas`; `null` esconde o aviso. */
  aviso: AvisoHorasApontadas | null;
  /** Quem digitou já confirmou que o valor está certo. */
  confirmado?: boolean;
  /** Sem handler, o aviso é só informativo — a tela não trava o salvamento. */
  onConfirmar?: () => void;
  /** Aplica o valor sugerido no campo (só aparece quando há sugestão). */
  onUsarSugestao?: (horas: number) => void;
  className?: string;
}

/**
 * Faixa de aviso ao lado das horas realizadas: aparece enquanto a pessoa digita
 * e some sozinha quando o valor volta ao normal.
 *
 * Duas saídas, as duas de um clique: corrigir para o valor provável ou confirmar
 * que o apontamento está certo mesmo. O aviso nunca impede o registro — só
 * impede que um dígito a mais entre no relatório sem ninguém ver.
 */
export function AvisoHorasDigitadas({
  aviso,
  confirmado,
  onConfirmar,
  onUsarSugestao,
  className,
}: AvisoHorasDigitadasProps) {
  if (!aviso) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs',
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span className="min-w-0 flex-1 text-foreground">{aviso.mensagem}</span>
      {confirmado ? (
        <span className="flex items-center gap-1 font-medium text-muted-foreground">
          <Check className="h-3.5 w-3.5" /> Confirmado
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          {aviso.sugestao !== null && onUsarSugestao && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 bg-background px-2 text-xs"
              onClick={() => onUsarSugestao(aviso.sugestao as number)}
            >
              Usar {formatarHoras(aviso.sugestao)}h
            </Button>
          )}
          {onConfirmar && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onConfirmar}
            >
              Está certo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
