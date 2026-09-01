// Escolha dos centros de custo do rateio, com os percentuais no mesmo lugar.
//
// Antes cada centro de custo ocupava uma linha inteira do formulário, e uma OS
// com vários rateios empurrava o resto para baixo. Aqui a escolha e o percentual
// vivem no diálogo, e o formulário fica só com o resumo.
//
// O diálogo tem dois andares: em cima os escolhidos, com o percentual e o total;
// embaixo o catálogo inteiro, com busca. Marcar sobe o item; desmarcar devolve.
//
// Trabalha numa cópia e só devolve no "Confirmar": cancelar não mexe na OS.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcentoArea } from './acentoArea';

export interface CentroCustoOpcao {
  id: string;
  codigo: string;
  nome: string;
  label: string;
}

export interface RateioEscolhido {
  id_centro_custo: string;
  percentual_rateio: number;
  /** Id da linha no banco. Perdê-lo faz o save inserir uma segunda cópia. */
  _dbId?: string;
}

export interface CentrosCustoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opcoes: CentroCustoOpcao[];
  selecionados: RateioEscolhido[];
  onConfirmar: (rateios: RateioEscolhido[]) => void;
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function CentrosCustoPickerDialog({
  open,
  onOpenChange,
  opcoes,
  selecionados,
  onConfirmar,
}: CentrosCustoPickerDialogProps) {
  const acento = useAcentoArea();
  const [escolhidos, setEscolhidos] = useState<RateioEscolhido[]>(selecionados);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (open) {
      setEscolhidos(selecionados);
      setBusca('');
    }
  }, [open, selecionados]);

  const rotulo = (id: string) => opcoes.find((o) => o.id === id)?.label ?? id;

  const catalogo = useMemo(() => {
    const termo = normalizar(busca);
    const lista = termo
      ? opcoes.filter((o) => normalizar(o.label).includes(termo))
      : opcoes;
    return lista.slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [opcoes, busca]);

  const total = escolhidos.reduce((soma, r) => soma + (r.percentual_rateio || 0), 0);
  const fecha = Math.abs(total - 100) <= 0.01;

  const alternar = (id: string) =>
    setEscolhidos((atual) =>
      atual.some((r) => r.id_centro_custo === id)
        ? atual.filter((r) => r.id_centro_custo !== id)
        : [...atual, { id_centro_custo: id, percentual_rateio: 0 }]);

  const definirPercentual = (id: string, valor: string) => {
    const num = parseFloat(valor);
    setEscolhidos((atual) =>
      atual.map((r) =>
        r.id_centro_custo === id ? { ...r, percentual_rateio: isNaN(num) ? 0 : num } : r));
  };

  /** Divide 100% igualmente, com a sobra dos centavos no primeiro. */
  const dividirIgualmente = () => {
    if (escolhidos.length === 0) return;
    const base = Math.floor((100 / escolhidos.length) * 100) / 100;
    const sobra = Math.round((100 - base * escolhidos.length) * 100) / 100;
    setEscolhidos((atual) =>
      atual.map((r, i) => ({ ...r, percentual_rateio: i === 0 ? base + sobra : base })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Distribuição de receita</DialogTitle>
          <DialogDescription>
            Marque os centros de custo e defina o percentual de cada um. A soma precisa fechar 100%
            para a OS poder ser salva.
          </DialogDescription>
        </DialogHeader>

        {/* Andar de cima: o que já foi escolhido, com os percentuais. */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className={cn('text-xs font-bold uppercase tracking-wide', acento.positivoTexto)}>
              Escolhidos ({escolhidos.length})
            </p>
            {escolhidos.length > 1 && (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={dividirIgualmente}>
                Dividir igualmente
              </Button>
            )}
          </div>

          {escolhidos.length === 0 ? (
            <p className="py-2 text-xs italic text-muted-foreground">
              Nenhum centro de custo escolhido. Marque abaixo para começar.
            </p>
          ) : (
            <>
              <ul className="max-h-[26vh] space-y-1.5 overflow-y-auto pr-1">
                {escolhidos.map((r) => (
                  <li key={r.id_centro_custo} className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 break-words text-xs text-foreground">
                      {rotulo(r.id_centro_custo)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Input
                        type="number" min={0} max={100} step="any"
                        aria-label={`Percentual de ${rotulo(r.id_centro_custo)}`}
                        value={r.percentual_rateio || ''}
                        onChange={(e) => definirPercentual(r.id_centro_custo, e.target.value)}
                        className="h-7 w-20 text-right"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Button
                      type="button" size="icon" variant="ghost"
                      aria-label={`Remover ${rotulo(r.id_centro_custo)}`}
                      className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => alternar(r.id_centro_custo)}
                    >
                      <X size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className={cn(
                'mt-2 text-xs font-medium',
                fecha ? acento.positivoTexto : total > 100 ? 'text-destructive' : 'text-warning',
              )}>
                Total: {total.toFixed(2).replace(/\.00$/, '')}%
                {!fecha && total < 100 && ` — faltam ${(100 - total).toFixed(2).replace(/\.00$/, '')}%`}
                {total > 100 && ` — excedeu ${(total - 100).toFixed(2).replace(/\.00$/, '')}%`}
                {fecha && ' ✓'}
              </p>
            </>
          )}
        </div>

        {/* Andar de baixo: o catálogo. */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar centro de custo"
            className="h-9 pl-8"
            aria-label="Buscar centro de custo"
          />
        </div>

        <ScrollArea className="h-[30vh] min-h-[180px] pr-3">
          {catalogo.length === 0 ? (
            <p className="py-6 text-center text-sm italic text-muted-foreground">
              Nenhum centro de custo encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {catalogo.map((o) => {
                const marcado = escolhidos.some((r) => r.id_centro_custo === o.id);
                return (
                  <li key={o.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors',
                        marcado ? cn('border-current', acento.positivoFundo, acento.texto) : 'hover:bg-muted/60',
                      )}
                    >
                      <Checkbox checked={marcado} onCheckedChange={() => alternar(o.id)} className="mt-0.5" />
                      <span className="min-w-0 flex-1 break-words text-sm text-foreground">{o.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {escolhidos.length} {escolhidos.length === 1 ? 'centro de custo' : 'centros de custo'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              className={acento.botao}
              onClick={() => { onConfirmar(escolhidos); onOpenChange(false); }}
            >
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
