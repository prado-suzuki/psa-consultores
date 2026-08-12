import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Registro } from '@/hooks/useGeracaoDocumento';

interface SelecaoRegistrosListaProps {
  /** Nome da seção no modelo ({{#imoveis}}) — só compõe o id do checkbox. */
  nome: string;
  registros: Registro[];
  selecionados: string[];
  onAlternar: (registroId: string) => void;
  /** Variante do rail ao lado da folha: mais estreita e sem borda própria. */
  compacto?: boolean;
}

/**
 * A escolha MÚLTIPLA de registros de uma lista do modelo (as sete matrículas que
 * o contrato de constituição integraliza, por exemplo). É a mesma lista nos dois
 * lugares em que ela aparece — o passo do fluxo guiado e o rail ao lado da folha,
 * que é o caminho de volta depois que o documento entra em cena.
 *
 * Cada item é `Checkbox` + `Label htmlFor`, e não um `<label>` embrulhando o
 * checkbox: o Checkbox do Radix renderiza um `button`, que um label em volta não
 * nomeia — sem o `htmlFor` o leitor de tela anuncia "caixa de seleção" e nada mais.
 */
export function SelecaoRegistrosLista({
  nome,
  registros,
  selecionados,
  onAlternar,
  compacto = false,
}: SelecaoRegistrosListaProps) {
  if (registros.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum registro cadastrado.</p>;
  }
  return (
    <div
      className={cn(
        'space-y-2 overflow-y-auto',
        compacto ? 'max-h-64 p-1.5' : 'max-h-56 rounded-lg border border-slate-200 p-3',
      )}
    >
      {registros.map((registro) => {
        const id = `selecao-${nome}-${registro.id}`;
        return (
          <div key={registro.id} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={selecionados.includes(registro.id)}
              onCheckedChange={() => onAlternar(registro.id)}
            />
            <Label
              htmlFor={id}
              className={cn('cursor-pointer font-normal', compacto ? 'text-xs' : 'text-sm')}
            >
              {registro.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
