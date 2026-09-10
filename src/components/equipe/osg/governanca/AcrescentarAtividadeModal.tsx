import { useEffect, useState } from 'react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { AtividadeDoCatalogo } from '@/hooks/useDomainMatrizAlcadas';

/**
 * Acrescenta linhas à matriz de um cliente.
 *
 * Dois caminhos, e os dois existem por medida. **Trazer do catálogo** cobre quem
 * tirou uma atividade e se arrependeu. **Criar uma nova** cobre o caso que a
 * comparação entre o modelo VF e a matriz do Grupo Mattei expôs: as duas listas
 * coincidem em 14 atividades e divergem em 17, e as que só o cliente real tem são
 * operacionais e rurais, como planejamento agropecuário e movimentação de insumos.
 * Sem este caminho, o catálogo seria fechado e o consultor ficaria sem onde pôr o
 * que usa.
 */
export function AcrescentarAtividadeModal({
  open,
  onOpenChange,
  disponiveis,
  salvando,
  onAcrescentar,
  onCriar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** As do catálogo que ainda não estão nesta matriz. */
  disponiveis: AtividadeDoCatalogo[];
  salvando: boolean;
  onAcrescentar: (ids: string[]) => Promise<unknown>;
  onCriar: (nome: string) => Promise<unknown>;
}) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [nova, setNova] = useState('');

  useEffect(() => {
    if (!open) return;
    setMarcadas([]);
    setNova('');
  }, [open]);

  const nomeNovo = nova.trim();
  const repetida = disponiveis.some(
    (a) => a.nome.trim().toLowerCase() === nomeNovo.toLowerCase(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Acrescentar atividade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ma-nova">Criar uma atividade que só existe neste cliente</Label>
            <Input
              id="ma-nova"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              placeholder="Planejamento Agropecuário"
            />
            {repetida && (
              <p className="text-xs font-medium text-destructive">
                Já existe uma atividade com esse nome na lista abaixo.
              </p>
            )}
          </div>

          {disponiveis.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Ou trazer uma que está fora desta matriz</Label>
                <div className="space-y-1.5">
                  {disponiveis.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={marcadas.includes(a.id)}
                        onCheckedChange={(v) =>
                          setMarcadas((atual) =>
                            v === true ? [...atual, a.id] : atual.filter((x) => x !== a.id),
                          )
                        }
                      />
                      <span>
                        {a.nome}
                        {a.cliente_id && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (deste cliente)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={salvando || repetida || (!nomeNovo && marcadas.length === 0)}
            onClick={async () => {
              if (nomeNovo) await onCriar(nomeNovo);
              if (marcadas.length > 0) await onAcrescentar(marcadas);
              onOpenChange(false);
            }}
          >
            {salvando ? 'Acrescentando…' : 'Acrescentar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
