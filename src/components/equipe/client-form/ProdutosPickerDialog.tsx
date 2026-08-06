// Escolha de produtos contratados por caixa de seleção, em vez de adicionar um
// a um pela lista suspensa.
//
// Os produtos são separados por área. Isso sai do cluster de cada produto, e não
// de um mapa escrito à mão: conferido em 05/08/2026, TAX tem 20 produtos e OSG
// tem 8, e nenhum outro cluster tem produto. Cluster novo com produto aparece
// como grupo próprio, sem precisar mexer aqui.
//
// O diálogo trabalha numa seleção interna e só devolve no "Confirmar": fechar no
// X ou no Cancelar não mexe na OS.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcentoArea } from './acentoArea';

export interface ProdutoEscolhivel {
  id: string;
  codigo: string;
  nome: string;
  cluster_id: string | null;
  estrutura_clusters: { name: string; nome_empresa?: string | null } | null;
}

export interface ProdutoMarcado {
  produto_segmento_id: string;
  horas_contratadas?: number;
}

export interface ProdutosPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoEscolhivel[];
  /** O que já está contratado nesta OS, com as horas. */
  selecionados: ProdutoMarcado[];
  onConfirmar: (escolhidos: ProdutoMarcado[]) => void;
}

/** Comparação tolerante a acento e caixa, igual à busca do balde de documentos. */
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function ProdutosPickerDialog({
  open,
  onOpenChange,
  produtos,
  selecionados,
  onConfirmar,
}: ProdutosPickerDialogProps) {
  const acento = useAcentoArea();
  const [marcados, setMarcados] = useState<ProdutoMarcado[]>(selecionados);
  const [busca, setBusca] = useState('');

  // Reabrir sempre parte do que está contratado hoje, e não do rascunho anterior.
  useEffect(() => {
    if (open) {
      setMarcados(selecionados);
      setBusca('');
    }
  }, [open, selecionados]);

  const grupos = useMemo(() => {
    const termo = normalizar(busca);
    const filtrados = termo
      ? produtos.filter((p) => normalizar(`${p.codigo} ${p.nome}`).includes(termo))
      : produtos;

    const porArea = new Map<string, ProdutoEscolhivel[]>();
    for (const p of filtrados) {
      const area = p.estrutura_clusters?.name?.trim() || 'Sem área';
      const lista = porArea.get(area) ?? [];
      lista.push(p);
      porArea.set(area, lista);
    }
    return [...porArea.entries()]
      .map(([area, itens]) => ({
        area,
        itens: itens.slice().sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }))
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [produtos, busca]);

  const alternar = (id: string) =>
    setMarcados((atual) =>
      atual.some((m) => m.produto_segmento_id === id)
        ? atual.filter((m) => m.produto_segmento_id !== id)
        : [...atual, { produto_segmento_id: id }]);

  const definirHoras = (id: string, valor: string) => {
    const num = parseFloat(valor);
    setMarcados((atual) =>
      atual.map((m) =>
        m.produto_segmento_id === id
          ? { ...m, horas_contratadas: isNaN(num) ? undefined : num }
          : m));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Produtos contratados</DialogTitle>
          <DialogDescription>
            Marque os produtos desta OS. A alteração só vale ao confirmar, e a gravação continua
            sendo no "Salvar Alterações".
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou nome"
            className="h-9 pl-8"
            aria-label="Buscar produto"
          />
        </div>

        <ScrollArea className="h-[46vh] min-h-[260px] pr-3">
          {grupos.length === 0 ? (
            <p className="py-6 text-center text-sm italic text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.area} className="mb-4 last:mb-0">
                <p className={cn('mb-1.5 text-[11px] font-bold uppercase tracking-wide', acento.positivoTexto)}>
                  {grupo.area}
                </p>
                <ul className="space-y-1">
                  {grupo.itens.map((p) => {
                    const marcado = marcados.find((m) => m.produto_segmento_id === p.id);
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors',
                            marcado ? cn('border-current', acento.positivoFundo, acento.texto) : 'hover:bg-muted/60',
                          )}
                        >
                          <Checkbox
                            checked={!!marcado}
                            onCheckedChange={() => alternar(p.id)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 break-words text-sm">
                            <span className="font-semibold text-foreground">{p.codigo}</span>
                            <span className="text-muted-foreground"> — {p.nome}</span>
                          </span>
                          {marcado && (
                            <span
                              className="flex shrink-0 items-center gap-1.5"
                              onClick={(e) => e.preventDefault()}
                            >
                              <span className="text-[10px] uppercase text-muted-foreground">Horas</span>
                              <Input
                                type="number" min={0} step="any"
                                aria-label={`Horas contratadas de ${p.codigo}`}
                                value={marcado.horas_contratadas ?? ""}
                                onChange={(e) => definirHoras(p.id, e.target.value)}
                                className="h-7 w-20 text-right"
                              />
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </ScrollArea>

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {marcados.length} {marcados.length === 1 ? 'produto marcado' : 'produtos marcados'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              className={acento.botao}
              onClick={() => { onConfirmar(marcados); onOpenChange(false); }}
            >
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
