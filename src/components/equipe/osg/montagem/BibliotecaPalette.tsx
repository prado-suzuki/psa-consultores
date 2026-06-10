import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Check, ChevronRight, GripVertical, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { useBlocos } from '@/hooks/useBibliotecaModelos';
import { useAdicionarBloco } from '@/hooks/useModelosDocumento';
import { LABEL_TIPO_BLOCO, type TipoBloco } from '@/lib/templates';

const SEM_CATEGORIA = 'Sem categoria';

interface Props {
  documentoId: string;
  idsNoModelo: Set<string>;
}

export function BibliotecaPalette({ documentoId, idsNoModelo }: Props) {
  const { data: blocos = [] } = useBlocos();
  const adicionar = useAdicionarBloco();
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const [novoBlocoOpen, setNovoBlocoOpen] = useState(false);

  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtrados = blocos
      .filter((b) => b.ativo)
      .filter((b) => !q || b.nome.toLowerCase().includes(q) || (b.categoria ?? '').toLowerCase().includes(q));
    const mapa = new Map<string, typeof filtrados>();
    for (const b of filtrados) {
      const cat = b.categoria || SEM_CATEGORIA;
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(b);
    }
    return [...mapa.entries()].sort(([a], [c]) => a.localeCompare(c));
  }, [blocos, busca]);

  const toggleGrupo = (cat: string) =>
    setFechados((s) => {
      const n = new Set(s);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-osg-300/60 bg-card shadow-[0_1px_2px_hsl(var(--osg-700)/0.06)]">
      <div className="flex items-center gap-2 border-b border-osg-100 px-3 py-2.5">
        <Library className="h-4 w-4 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-700">Biblioteca de blocos</h3>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1 px-2 text-xs"
          onClick={() => setNovoBlocoOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Novo bloco
        </Button>
      </div>

      <div className="p-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar bloco" className="h-8 pl-8 text-sm" />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 pb-3">
        {grupos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum bloco encontrado.</p>
        ) : (
          grupos.map(([cat, itens]) => {
            const fechado = fechados.has(cat);
            return (
              <div key={cat}>
                <button
                  type="button"
                  onClick={() => toggleGrupo(cat)}
                  className="flex w-full items-center gap-1.5 rounded-md px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-osg-500 hover:text-osg-700"
                >
                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', !fechado && 'rotate-90')} />
                  {cat}
                  <span className="ml-auto font-normal normal-case text-muted-foreground">{itens.length}</span>
                </button>

                {!fechado && (
                  <div className="space-y-1.5 pb-1.5">
                    {itens.map((b) => {
                      const adicionado = idsNoModelo.has(b.id);
                      return (
                        <div
                          key={b.id}
                          draggable={!adicionado}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('blocoId', b.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => { if (!adicionado && !adicionar.isPending) adicionar.mutate({ documentoId, blocoId: b.id }); }}
                          className={cn(
                            'group flex items-center gap-1.5 rounded-lg border p-2 transition-all',
                            adicionado
                              ? 'cursor-default border-osg-100 bg-osg-50/50 opacity-60'
                              : 'cursor-grab border-osg-200 bg-card hover:border-osg-moss/50 hover:shadow-sm active:cursor-grabbing',
                          )}
                        >
                          {!adicionado && <GripVertical className="h-3.5 w-3.5 shrink-0 text-osg-300 group-hover:text-osg-500" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{b.nome}</span>
                              {b.tipo && b.tipo !== 'livre' && (
                                <Badge className="bg-osg-100 px-1 text-[9px] text-osg-700 hover:bg-osg-100">
                                  {LABEL_TIPO_BLOCO[(b.tipo as TipoBloco) ?? 'livre']}
                                </Badge>
                              )}
                            </div>
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">{b.versao_atual?.conteudo}</p>
                          </div>
                          {adicionado ? (
                            <Check className="h-4 w-4 shrink-0 text-osg-moss" aria-label="Já no documento" />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-osg-600 transition-colors group-hover:bg-osg-moss group-hover:text-white" aria-label="Adicionar">
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <EditorBlocoDialog open={novoBlocoOpen} onOpenChange={setNovoBlocoOpen} />
    </div>
  );
}
