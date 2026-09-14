import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Pencil, X } from 'lucide-react';
import { brl } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/valoresDoTitular';
import type { AderenciaDoTitular } from '@/lib/osg/integralizacaoDaMatricula';
import type { TitularidadeEnriched, TitularidadeRow } from '@/hooks/useDiagnosticoPatrimonial';

const CODIGO_DA_ESPECIE: Record<string, string> = {
  FATO: 'FT',
  DIREITO: 'DT',
  USUFRUTO: 'US',
  NUE_PROP: 'NP',
};

export interface TitularidadeLinhaProps {
  titularidade: TitularidadeEnriched;
  isEditing: boolean;
  canDelete: boolean;
  /**
   * Esta linha é a que carrega os valores desta pessoa nesta matrícula (a de
   * direito, quando há uma). Falso na linha de fato de quem também consta no
   * registro, e em toda titularidade ancorada em BEM.
   */
  mostrarValores: boolean;
  /** O que a distribuição de titularidade esperaria deste titular, quando há o que comparar. */
  aderencia?: AderenciaDoTitular;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * UMA LINHA DE TITULARIDADE na lista do imóvel.
 *
 * A estrela de "integralizador" saiu daqui na frente de 14/09/2026. Ela elegia
 * UM titular por imóvel para liderar a descrição e mandava os demais para a
 * área remanescente — decisão de texto tomada à mão, que os valores por titular
 * passaram a contradizer. Quem lidera hoje é o sócio do parágrafo, e o
 * remanescente é quem não tem valor a integralizar.
 *
 * Além de quem é e de que fração tem, a linha de direito de matrícula mostra os
 * dois valores por titular: o CONTÁBIL que ele declarou na DIRPF e o que ele
 * INTEGRALIZA na sociedade. Os dois divergem de propósito (o contador do
 * cliente decide o segundo), e "a integralizar" em branco é o titular que fica
 * de fora: não entra no capital, não recebe quota, segue no texto como área
 * remanescente. É por isso que o vazio é escrito por extenso, e não como "—".
 */
export function TitularidadeLinha({
  titularidade, isEditing, canDelete, mostrarValores, aderencia, onEdit, onDelete,
}: TitularidadeLinhaProps) {
  const foraDoEsperado = aderencia?.foraDoEsperado ?? false;
  const codigo = CODIGO_DA_ESPECIE[titularidade.tipo] ?? titularidade.tipo;

  return (
    <div
      className={`group rounded-lg border px-3 py-2 transition-colors ${
        isEditing
          ? 'bg-osg-50 border-osg-200'
          : foraDoEsperado
            ? 'border-warning/40 bg-warning/[0.06]'
            : 'bg-card hover:bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{titularidade.titular_denominacao}</span>
          {titularidade.titular_tipo && (
            <span className="shrink-0 text-[11px] text-muted-foreground">{titularidade.titular_tipo}</span>
          )}
        </div>
        <span
          className={`shrink-0 text-sm font-mono tabular-nums ${titularidade.fracao != null ? 'font-medium text-foreground' : 'text-muted-foreground/60'}`}
        >
          {titularidade.fracao != null ? `${titularidade.fracao}%` : '—'}
        </span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!canDelete ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              disabled
              title="Precisa de ao menos um titular"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover titularidade?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remover {titularidade.titular_denominacao} ({codigo}
                    {titularidade.fracao != null ? `, ${titularidade.fracao}%` : ''}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDelete}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {mostrarValores && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-osg-100 pt-1.5 text-[11px]">
          <ValorDoTitular rotulo="Contábil" valor={titularidade.vlr_contabil} />
          <ValorDoTitular
            rotulo="A integralizar"
            valor={titularidade.vlr_integralizar}
            vazio="não integraliza"
          />
          {foraDoEsperado && (
            <span className="flex items-center gap-1 font-medium text-warning">
              <AlertTriangle className="h-3 w-3" />
              a titularidade pediria {brl.format(aderencia!.esperado)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ValorDoTitular({ rotulo, valor, vazio = 'não informado' }: {
  rotulo: string;
  valor: number | null;
  vazio?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="uppercase tracking-wide text-muted-foreground/70">{rotulo}</span>
      {valor != null ? (
        <span className="font-mono tabular-nums font-medium text-foreground">{brl.format(valor)}</span>
      ) : (
        <span className="italic text-muted-foreground/60">{vazio}</span>
      )}
    </span>
  );
}
