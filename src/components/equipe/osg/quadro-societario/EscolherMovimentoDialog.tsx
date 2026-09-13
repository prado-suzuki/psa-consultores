import { useEffect, useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { AjudaSocietaria } from './AjudaSocietaria';
import type { OpcaoDeGesto } from './gestosSocietarios';

// A PORTA ÚNICA do quadro societário: escolher o gesto ANTES de pedir pessoas,
// quotas ou datas.
//
// Antes daqui havia três entradas concorrendo no cabeçalho da lista de sócios
// ("Doar quotas", "Instituir usufruto", "Registrar movimento") mais um ícone por
// linha de sócio, e o consultor precisava adivinhar qual formulário continha o
// caso dele para só então conseguir comparar os efeitos. A doação aparecia em
// dois lugares com o mesmo nome e sentidos diferentes. O custo desta tela é um
// clique a mais para quem já sabe; o que ela retira é a escolha implícita entre
// formulários.
//
// Ela não conhece Supabase, não grava nada e não decide disponibilidade: recebe
// o catálogo e os motivos de bloqueio já apurados e devolve o gesto escolhido.
// As regras de saldo e de ônus continuam no formulário, que é onde há número
// para checá-las.
//
// Escolher NÃO avança sozinho. Abrir o formulário no clique impediria consultar
// a ajuda de duas opções antes de decidir, que é exatamente a comparação que
// esta tela existe para permitir.

interface EscolherMovimentoDialogProps<V extends string> {
  open: boolean;
  empresa: PessoaRow;
  opcoes: OpcaoDeGesto<V>[];
  /** Motivo do bloqueio, por gesto. Ausente ou nulo = disponível. */
  indisponibilidade?: Partial<Record<V, string | null>>;
  /** Opção já marcada ao reabrir, quando se voltou por "Trocar movimento". */
  valorInicial?: V | null;
  onEscolher: (valor: V) => void;
  onClose: () => void;
}

export function EscolherMovimentoDialog<V extends string>({
  open, empresa, opcoes, indisponibilidade, valorInicial, onEscolher, onClose,
}: EscolherMovimentoDialogProps<V>) {
  const [escolhido, setEscolhido] = useState<V | null>(valorInicial ?? null);
  const idBase = useId();

  const motivoDe = (valor: V) => indisponibilidade?.[valor] ?? null;

  useEffect(() => {
    if (!open) return;
    // Reabrir pelo "Trocar movimento" traz o gesto anterior marcado; reabrir
    // pelo botão do cabeçalho não marca nada, para não sugerir um padrão.
    setEscolhido(valorInicial && !motivoDe(valorInicial) ? valorInicial : null);
    // `indisponibilidade` muda de identidade a cada render do pai; o que
    // interessa é a reabertura, e o motivo é lido de novo na hora de marcar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, valorInicial]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
        <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex flex-wrap items-center gap-2.5 text-base font-semibold">
              Registrar movimento
              <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                {empresa.denominacao}
              </span>
            </DialogTitle>
            <DialogDescription>
              Escolha o que aconteceu na sociedade. O formulário do gesto abre em seguida.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <RadioGroup
            value={escolhido ?? ''}
            onValueChange={(v) => setEscolhido(v as V)}
            className="gap-2"
          >
            {opcoes.map((o) => {
              const motivo = motivoDe(o.valor);
              const id = `${idBase}-${o.valor}`;
              const marcado = escolhido === o.valor;
              return (
                <div
                  key={o.valor}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-3 transition-colors',
                    marcado ? 'border-osg-moss bg-osg-50/60' : 'border-osg-200/80',
                    motivo && 'bg-muted/30',
                  )}
                >
                  <RadioGroupItem
                    value={o.valor}
                    id={id}
                    disabled={!!motivo}
                    className="mt-0.5 border-osg-300 text-osg-moss"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={id}
                      className={cn(
                        'block text-sm font-medium',
                        motivo ? 'text-muted-foreground' : 'cursor-pointer text-foreground',
                      )}
                    >
                      {o.rotulo}
                    </label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.linha}</p>
                    {/* Motivo de bloqueio fica VISÍVEL, e não dentro da ajuda:
                        é a razão de o gesto não estar disponível agora, não
                        explicação do que ele faria. */}
                    {motivo && <p className="mt-1 text-xs font-medium text-warning">{motivo}</p>}
                  </div>
                  {/* Irmão do rótulo, nunca dentro dele: pedir ajuda não pode
                      marcar a opção. */}
                  <AjudaSocietaria chave={o.ajuda} rotulo={o.rotulo} className="mt-0.5" />
                </div>
              );
            })}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Use o ícone de informação para consultar o efeito no quadro e no contrato.
          </p>
        </div>

        <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => escolhido && onEscolher(escolhido)}
            disabled={!escolhido}
            className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
