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
import { formatarPercentual, resumoRateio } from '@/lib/rateioReceita';
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

export default function RateioLista({ rateios, opcoes, onPercentual, onRemover }: RateioListaProps) {
  const acento = useAcentoArea();
  if (rateios.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Nenhum centro de custo. Use "Centros de custo" para escolher; a soma precisa fechar 100% para salvar.
      </p>
    );
  }

  // A conta e a tolerância vivem em `lib/rateioReceita`: a aba de Faturamento
  // exibe o mesmo total em leitura, e duas cópias da regra divergiriam no dia em
  // que alguém mudasse a folga de um centésimo.
  const { total, fecha, faltam, excede } = resumoRateio(rateios);

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y">
        {rateios.map((r, idx) => {
          const rotulo = opcoes.find((o) => o.id === r.id_centro_custo)?.label
            ?? '(centro de custo fora do catálogo)';
          const pct = r.percentual_rateio || 0;
          // A chave inclui o índice porque o MESMO centro de custo pode aparecer
          // duas vezes: a OS 088/2026 tem CC-0001 e CC-0007 repetidos, e com a
          // chave só no identificador o React acusava "two children with the same
          // key" quatro vezes ao abrir aquela OS em edição. O `_dbId` vem antes
          // porque é estável quando a linha já existe no banco.
          return (
            <li
              key={r._dbId ?? `${r.id_centro_custo}-${idx}`}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="min-w-0 flex-1 break-words text-xs text-foreground">{rotulo}</span>
              {/* Barra proporcional: dá a leitura do rateio de relance, sem
                  precisar somar os números de cabeça. */}
              <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
                <span
                  className={cn('block h-full rounded-full', fecha ? acento.positivoBarra : 'bg-warning')}
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
            : 'bg-warning/10 text-warning',
      )}>
        <span>Total do rateio</span>
        <span className="tabular-nums">
          {formatarPercentual(total)}%
          {fecha && ' ✓'}
          {faltam > 0 && ` — faltam ${formatarPercentual(faltam)}%`}
          {excede > 0 && ` — excedeu ${formatarPercentual(excede)}%`}
        </span>
      </div>
    </div>
  );
}
