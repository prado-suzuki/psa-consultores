// Lista do rateio de receita, um centro de custo por linha.
//
// A escolha de QUAIS centros entram é do diálogo; aqui é só a leitura e o ajuste
// fino do percentual, que é o que se mexe com frequência. Voltou a ser linha a
// linha a pedido da Patricia: agrupado num resumo, conferir o rateio exigia
// abrir o diálogo toda vez.
//
// Saiu de ContratosTab quando aquele arquivo passou do teto de 600 linhas do
// AGENTS.md.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcentoArea } from './acentoArea';

export interface RateioLinha {
  id_centro_custo: string;
  percentual_rateio: number;
  _dbId?: string;
}

export interface RateioListaProps {
  rateios: RateioLinha[];
  opcoes: Array<{ id: string; label: string }>;
  onPercentual: (indice: number, percentual: number) => void;
  onRemover: (indice: number) => void;
}

/** Percentual sem casas decimais desnecessárias: 33.33% e 50%, não 50.00%. */
const formatarPct = (valor: number) => valor.toFixed(2).replace(/\.?0+$/, '');

export default function RateioLista({ rateios, opcoes, onPercentual, onRemover }: RateioListaProps) {
  const acento = useAcentoArea();
  if (rateios.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Nenhum centro de custo. Use "Centros de custo" para escolher; a soma precisa fechar 100% para salvar.
      </p>
    );
  }

  const total = rateios.reduce((acc, r) => acc + (r.percentual_rateio || 0), 0);
  const fecha = Math.abs(total - 100) <= 0.01;

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y">
        {rateios.map((r, idx) => {
          const rotulo = opcoes.find((o) => o.id === r.id_centro_custo)?.label
            ?? '(centro de custo fora do catálogo)';
          const pct = r.percentual_rateio || 0;
          return (
            <li key={r.id_centro_custo || idx} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 break-words text-xs text-foreground">{rotulo}</span>
              {/* Barra proporcional: dá a leitura do rateio de relance, sem
                  precisar somar os números de cabeça. */}
              <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
                <span
                  className={cn('block h-full rounded-full', fecha ? acento.positivoBarra : 'bg-amber-500')}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Input
                  type="number" min={0} max={100} step="any"
                  aria-label={`Percentual de ${rotulo}`}
                  value={r.percentual_rateio || ''}
                  onChange={(e) => onPercentual(idx, parseFloat(e.target.value) || 0)}
                  className="h-7 w-20 text-right"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Button
                type="button" size="icon" variant="ghost"
                aria-label={`Remover ${rotulo}`}
                className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onRemover(idx)}
              >
                <X size={13} />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className={cn(
        'flex items-center justify-between gap-3 border-t px-3 py-2 text-xs font-medium',
        fecha ? cn(acento.positivoFundo, acento.positivoTexto)
          : total > 100 ? 'bg-destructive/10 text-destructive'
            : 'bg-amber-50 text-amber-700',
      )}>
        <span>Total do rateio</span>
        <span className="tabular-nums">
          {formatarPct(total)}%
          {fecha && ' ✓'}
          {!fecha && total < 100 && ` — faltam ${formatarPct(100 - total)}%`}
          {total > 100 && ` — excedeu ${formatarPct(total - 100)}%`}
        </span>
      </div>
    </div>
  );
}
