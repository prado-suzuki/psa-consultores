import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { CandidatoDeCopia } from '@/lib/produtoServicoVinculo';

interface Props {
  aberto: boolean;
  /** "03-CC — Consultoria contábil", o produto que vai RECEBER. */
  nomeDoAlvo: string;
  candidatos: CandidatoDeCopia[];
  onFechar: () => void;
  onConfirmar: (produtoOrigemId: string) => void;
}

/**
 * Copiar o conjunto de serviços de um produto para outro.
 *
 * Existe porque o gesto que a tela pedia não era o gesto que o trabalho tem. A
 * lista oferece o catálogo do cluster inteiro e pede que se marque um a um; o
 * que os produtos realmente têm é um punhado de serviços cada, e um produto novo
 * quase sempre se parece com um que já existe. Achar cinco linhas entre dezenas
 * é mais caro do que partir de um vizinho e ajustar duas.
 *
 * SÓ ACRESCENTA. O que já está marcado no produto aberto continua marcado, e
 * nada é desmarcado — por isso não há confirmação destrutiva aqui, e o desfazer
 * do lote dá conta do arrependimento.
 *
 * Os candidatos vêm com DOIS números, e o que decide é o segundo: "12 serviços,
 * 9 novos aqui". O total sozinho não diz o que a cópia vai fazer quando os dois
 * produtos já se parecem.
 */
export default function CopiarDeProdutoDialog({
  aberto, nomeDoAlvo, candidatos, onFechar, onConfirmar,
}: Props) {
  const [origemId, setOrigemId] = useState('');

  // O diálogo é reaproveitado entre produtos: reabrir não pode trazer a escolha
  // feita para outro alvo.
  useEffect(() => {
    if (aberto) setOrigemId('');
  }, [aberto]);

  const doCluster = candidatos.filter((c) => c.mesmoCluster);
  const deFora = candidatos.filter((c) => !c.mesmoCluster);
  const escolhido = candidatos.find((c) => c.id === origemId) ?? null;

  const linha = (produto: CandidatoDeCopia) => (
    <SelectItem key={produto.id} value={produto.id} className="text-sm">
      <span className="font-mono text-[11px] text-muted-foreground">{produto.codigo || '—'}</span>
      {' '}{produto.nome || '(sem nome)'}
      <span className="ml-1.5 text-[11px] text-muted-foreground">
        · {produto.total} {produto.total === 1 ? 'serviço' : 'serviços'}
      </span>
    </SelectItem>
  );

  return (
    <Dialog open={aberto} onOpenChange={valor => { if (!valor) onFechar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar serviços de outro produto</DialogTitle>
          <DialogDescription>
            Os serviços do produto escolhido passam a valer também para{' '}
            <strong className="font-semibold text-foreground">{nomeDoAlvo}</strong>. O que já está
            marcado continua marcado — nada é desmarcado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="copiar-origem">Copiar de</Label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger id="copiar-origem">
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {doCluster.map(linha)}
                {deFora.length > 0 && (
                  <SelectGroup>
                    {doCluster.length > 0 && <SelectSeparator />}
                    <SelectLabel className="text-muted-foreground">Outros clusters</SelectLabel>
                    {deFora.map(linha)}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {escolhido && (
            <p className="rounded-md border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
              {escolhido.novos === 0 ? (
                <>
                  <strong className="font-semibold text-foreground">Nada a trazer.</strong>{' '}
                  {nomeDoAlvo} já tem os {escolhido.total}{' '}
                  {escolhido.total === 1 ? 'serviço' : 'serviços'} desse produto.
                </>
              ) : (
                <>
                  Marca{' '}
                  <strong className="font-semibold text-foreground">
                    {escolhido.novos} {escolhido.novos === 1 ? 'serviço' : 'serviços'}
                  </strong>
                  {escolhido.novos < escolhido.total && (
                    <> — os outros {escolhido.total - escolhido.novos} já estavam marcados</>
                  )}.
                </>
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button
            disabled={!escolhido || escolhido.novos === 0}
            onClick={() => { if (escolhido) { onConfirmar(escolhido.id); onFechar(); } }}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar serviços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
