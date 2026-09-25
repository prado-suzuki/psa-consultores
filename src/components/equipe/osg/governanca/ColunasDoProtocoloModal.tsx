import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BeneficiarioDoProtocolo } from '@/lib/protocoloRemuneracao';

/**
 * As colunas do protocolo: quem recebe.
 *
 * **Elas não vêm de cadastro nenhum**, e é por isso que esta caixa existe. A
 * coluna não é órgão de governança nem cargo: é o título que a família e a
 * consultoria combinam na conversa, só para diferenciar quem tem direito a o
 * quê. O protocolo nasce com Fundadores, Sócios e Sócios Gestores, e daí em
 * diante é renomear, acrescentar e tirar.
 *
 * Nos documentos reais nenhum cliente usa exatamente os três padrão: o Potrich
 * usa "Sócios Fundadores" e "Sucessores na Gestão", o Toqueto V1 usa "Sócios
 * Fundadores" e "Familiares Gestores", e o Toqueto VF usa "Gestores",
 * "Fundadores" e "Sócios/Filhos 1a geração". Renomear é o caso comum, não a
 * exceção.
 */
export function ColunasDoProtocoloModal({
  open,
  onOpenChange,
  colunas,
  regrasPorColuna,
  salvando,
  onAcrescentar,
  onRenomear,
  onTirar,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  colunas: BeneficiarioDoProtocolo[];
  /** Regras escritas em cada coluna, pelo id do beneficiário. */
  regrasPorColuna: ReadonlyMap<string, number>;
  salvando: boolean;
  onAcrescentar: (nome: string) => Promise<unknown>;
  onRenomear: (id: string, de: string, para: string) => Promise<unknown>;
  onTirar: (id: string, nome: string) => Promise<unknown>;
}) {
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [nova, setNova] = useState('');
  const [aTirar, setATirar] = useState<BeneficiarioDoProtocolo | null>(null);
  const regrasATirar = aTirar ? (regrasPorColuna.get(aTirar.id) ?? 0) : 0;
  const perda =
    regrasATirar === 0
      ? 'Nenhuma regra foi escrita nesta coluna ainda.'
      : regrasATirar === 1
        ? 'A regra escrita nesta coluna se perde, e não há como desfazer.'
        : `As ${regrasATirar} regras escritas nesta coluna, somando todos os itens do protocolo, se perdem, e não há como desfazer.`;

  useEffect(() => {
    if (open) {
      setNomes(Object.fromEntries(colunas.map((c) => [c.id, c.nome])));
      setNova('');
    }
  }, [open, colunas]);

  const acrescentar = async () => {
    const nome = nova.trim();
    if (!nome) return;
    await onAcrescentar(nome);
    setNova('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colunas do protocolo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              São os grupos que recebem. Use os nomes que a família usa na conversa, e não os
              nomes dos órgãos de governança.
            </p>

            <div className="space-y-2">
              {colunas.map((c) => {
                const mudou = (nomes[c.id] ?? '').trim() !== c.nome;
                const vazio = (nomes[c.id] ?? '').trim() === '';
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input
                      value={nomes[c.id] ?? ''}
                      onChange={(e) => setNomes((antes) => ({ ...antes, [c.id]: e.target.value }))}
                      aria-label={`Nome da coluna ${c.nome}`}
                    />
                    {/*
                      O botão de confirmar só aparece quando o nome mudou: sem
                      isso, três colunas viram três botões sempre acesos e não se
                      sabe qual foi editado.
                    */}
                    {mudou && !vazio && (
                      <ButtonTooltip text="Salvar o novo nome">
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={salvando}
                          aria-label="Salvar o novo nome"
                          onClick={() => onRenomear(c.id, c.nome, (nomes[c.id] ?? '').trim())}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </ButtonTooltip>
                    )}
                    <ButtonTooltip text={`Tirar a coluna ${c.nome}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={salvando}
                        aria-label={`Tirar a coluna ${c.nome}`}
                        onClick={() => setATirar(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ButtonTooltip>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              {/*
                O rotulo e visivel, e nao um placeholder com o nome do campo: o
                placeholder some quando a pessoa digita, e o campo preenchido fica
                sem dizer o que e (docs/geral/texto-explicativo-na-tela.md, §3).
              */}
              <Label htmlFor="protocolo-coluna-nova">Coluna nova</Label>
              <div className="flex items-center gap-2">
              <Input
                id="protocolo-coluna-nova"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void acrescentar();
                  }
                }}
              />
              <Button variant="outline" disabled={salvando || !nova.trim()} onClick={acrescentar}>
                <Plus className="mr-2 h-4 w-4" /> Acrescentar
              </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*
        Tirar uma coluna apaga, por cascade, TODAS as regras escritas nela, em
        todos os itens. É a perda mais cara desta tela, muito maior que tirar um
        item, e por isso o aviso diz o tamanho do estrago em vez de perguntar
        "tem certeza?".
      */}
      <AlertDialog open={!!aTirar} onOpenChange={(aberto) => !aberto && setATirar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tirar a coluna {aTirar?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              {perda} Se a ideia é só mudar o nome do grupo, edite o nome aqui mesmo em vez de tirar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aTirar) void onTirar(aTirar.id, aTirar.nome);
                setATirar(null);
              }}
            >
              Tirar a coluna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
