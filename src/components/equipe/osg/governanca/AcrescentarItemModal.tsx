import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ItemDoCatalogo, TemaDoCatalogo } from '@/hooks/useDomainProtocoloRemuneracao';

/**
 * Traz itens de volta para o protocolo, ou cria os que faltam.
 *
 * **Tem as duas metades porque o catálogo tem duas.** Os 52 itens padrão cobrem
 * o modelo da casa e quase tudo o que os clientes usam, mas não tudo: o Potrich
 * escreve "Tratamento odontológico, oftmológicos, psicológicos etc." onde o
 * modelo diz só "Tratamento odontológico", e o Jacobowski tem "Regime de
 * casamento e/ou união estável", que o modelo não tem em tema nenhum. Por isso
 * dá para criar item dentro de um tema, e também um tema novo.
 *
 * Item e tema criados aqui ficam guardados para este cliente, e não somem quando
 * alguém tirar a linha do protocolo.
 */
export function AcrescentarItemModal({
  open,
  onOpenChange,
  disponiveis,
  temas,
  salvando,
  onAcrescentar,
  onCriarItem,
  onCriarTema,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  disponiveis: ItemDoCatalogo[];
  temas: TemaDoCatalogo[];
  salvando: boolean;
  onAcrescentar: (ids: string[]) => Promise<unknown>;
  onCriarItem: (temaId: string, nome: string) => Promise<unknown>;
  onCriarTema: (nome: string) => Promise<unknown>;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [novoItem, setNovoItem] = useState('');
  const [temaDoNovoItem, setTemaDoNovoItem] = useState('');
  const [novoTema, setNovoTema] = useState('');

  useEffect(() => {
    if (open) {
      setMarcados(new Set());
      setNovoItem('');
      setNovoTema('');
      setTemaDoNovoItem('');
    }
  }, [open]);

  const nomeDoTema = useMemo(() => new Map(temas.map((t) => [t.id, t.nome])), [temas]);

  /* Agrupados por tema, na ordem do catálogo, que é a ordem da planilha. */
  const porTema = useMemo(() => {
    const grupos = new Map<string, ItemDoCatalogo[]>();
    for (const item of [...disponiveis].sort((a, b) => a.ordem - b.ordem)) {
      if (!grupos.has(item.tema_id)) grupos.set(item.tema_id, []);
      grupos.get(item.tema_id)!.push(item);
    }
    return [...grupos.entries()].sort(
      (a, b) =>
        (temas.find((t) => t.id === a[0])?.ordem ?? 0) -
        (temas.find((t) => t.id === b[0])?.ordem ?? 0),
    );
  }, [disponiveis, temas]);

  const alternar = (id: string) =>
    setMarcados((antes) => {
      const depois = new Set(antes);
      if (depois.has(id)) depois.delete(id);
      else depois.add(id);
      return depois;
    });

  const acrescentarMarcados = async () => {
    if (marcados.size === 0) return;
    await onAcrescentar([...marcados]);
    onOpenChange(false);
  };

  const criarItem = async () => {
    const nome = novoItem.trim();
    if (!nome || !temaDoNovoItem) return;
    await onCriarItem(temaDoNovoItem, nome);
    setNovoItem('');
  };

  const criarTema = async () => {
    const nome = novoTema.trim();
    if (!nome) return;
    await onCriarTema(nome);
    setNovoTema('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acrescentar item</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto py-1">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {porTema.length > 0
                ? 'Itens do catálogo que ainda não estão neste protocolo.'
                : 'Todos os itens do catálogo já estão neste protocolo. Crie um novo abaixo.'}
            </p>

            {porTema.map(([temaId, itens]) => (
              <div key={temaId} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-osg-700">
                  {nomeDoTema.get(temaId) ?? 'Sem tema'}
                </p>
                {itens.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={marcados.has(item.id)}
                      onCheckedChange={() => alternar(item.id)}
                    />
                    <span>{item.nome}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="novo-item">Criar um item que não está na lista</Label>
              <div className="flex gap-2">
                <Select value={temaDoNovoItem} onValueChange={setTemaDoNovoItem}>
                  <SelectTrigger className="w-[45%]" aria-label="Tema do item novo">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...temas]
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  id="novo-item"
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                />
                <ButtonTooltip text="Criar o item">
                  <Button
                    variant="outline"
                    disabled={salvando || !novoItem.trim() || !temaDoNovoItem}
                    onClick={criarItem}
                    aria-label="Criar o item"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </ButtonTooltip>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novo-tema">Criar um tema novo</Label>
              <div className="flex gap-2">
                <Input
                  id="novo-tema"
                  value={novoTema}
                  onChange={(e) => setNovoTema(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={salvando || !novoTema.trim()}
                  onClick={criarTema}
                >
                  <Plus className="mr-2 h-4 w-4" /> Criar tema
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O tema novo aparece na lista acima e passa a receber itens deste cliente.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button disabled={salvando || marcados.size === 0} onClick={acrescentarMarcados}>
            {marcados.size === 0
              ? 'Acrescentar'
              : `Acrescentar ${marcados.size} ${marcados.size === 1 ? 'item' : 'itens'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
