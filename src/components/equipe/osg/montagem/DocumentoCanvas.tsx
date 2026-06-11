import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Loader2, MousePointerSquareDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rotulosNumeracao } from '@/lib/templates';
import {
  useRemoverDocumentoBloco, useAtualizarDocumentoBloco, useReordenarBlocos, useAdicionarBloco,
  type DocumentoBlocoComBloco,
} from '@/hooks/useModelosDocumento';
import { BlocoMontadoCard } from './BlocoMontadoCard';

interface Props {
  modeloId: string;
  docBlocos: DocumentoBlocoComBloco[];
  isLoading: boolean;
  onEditarBloco?: (blocoId: string) => void;
}

const ehCapitulo = (d: DocumentoBlocoComBloco) => d.bloco?.tipo === 'capitulo';

/**
 * O aninhamento é posicional: cada capítulo forma um segmento com os blocos
 * seguintes até o próximo capítulo; blocos antes do primeiro capítulo são
 * segmentos soltos de um item só.
 */
function segmentar(lista: DocumentoBlocoComBloco[]): DocumentoBlocoComBloco[][] {
  const segs: DocumentoBlocoComBloco[][] = [];
  let emCapitulo = false;
  for (const d of lista) {
    if (ehCapitulo(d)) { segs.push([d]); emCapitulo = true; }
    else if (emCapitulo) segs[segs.length - 1].push(d);
    else segs.push([d]);
  }
  return segs;
}

export function DocumentoCanvas({ modeloId, docBlocos, isLoading, onEditarBloco }: Props) {
  const remover = useRemoverDocumentoBloco();
  const atualizar = useAtualizarDocumentoBloco();
  const reordenar = useReordenarBlocos();
  const adicionar = useAdicionarBloco();

  // Ordem local controlada pelo Reorder; ressincroniza quando o servidor muda
  // (adicionar/remover/refetch). O commit no banco acontece ao soltar.
  const [ordem, setOrdem] = useState<DocumentoBlocoComBloco[]>(docBlocos);
  const [dragOver, setDragOver] = useState(false);
  // Enquanto um capítulo é arrastado, seus filhos saem da lista e viajam "dentro" dele.
  const [capArrastado, setCapArrastado] = useState<{ id: string; filhos: DocumentoBlocoComBloco[] } | null>(null);
  useEffect(() => { setOrdem(docBlocos); }, [docBlocos]);

  const segs = useMemo(() => segmentar(ordem), [ordem]);

  const meta = useMemo(() => {
    const rotulos = rotulosNumeracao(ordem.map((d) => ({ id: d.id, tipo: d.bloco?.tipo, conteudo: d.bloco?.conteudo ?? '' })));
    const m = new Map<string, { rotulo: string | null; numero: number; aninhado: boolean }>();
    let dentro = false;
    ordem.forEach((d, i) => {
      if (ehCapitulo(d)) dentro = true;
      m.set(d.id, { rotulo: rotulos[i], numero: i + 1, aninhado: dentro && !ehCapitulo(d) });
    });
    return m;
  }, [ordem]);

  const visiveis = useMemo(() => {
    if (!capArrastado) return ordem;
    const ocultos = new Set(capArrastado.filhos.map((f) => f.id));
    return ordem.filter((d) => !ocultos.has(d.id));
  }, [ordem, capArrastado]);

  const handleReorder = (novos: DocumentoBlocoComBloco[]) => {
    if (!capArrastado) { setOrdem(novos); return; }
    setOrdem(novos.flatMap((d) => (d.id === capArrastado.id ? [d, ...capArrastado.filhos] : [d])));
  };

  const iniciarArrasto = (db: DocumentoBlocoComBloco) => {
    if (!ehCapitulo(db)) return;
    const filhos = segs.find((s) => s[0].id === db.id)?.slice(1) ?? [];
    if (filhos.length) setCapArrastado({ id: db.id, filhos });
  };

  const commitReorder = () => {
    setCapArrastado(null);
    const ids = ordem.map((d) => d.id);
    if (ids.join('|') !== docBlocos.map((d) => d.id).join('|')) {
      reordenar.mutate({ documentoId: modeloId, idsOrdenados: ids });
    }
  };

  const moverPorClique = (id: string, dir: -1 | 1) => {
    const index = ordem.findIndex((d) => d.id === id);
    if (index < 0) return;
    let nova: DocumentoBlocoComBloco[];
    if (ehCapitulo(ordem[index])) {
      // Capítulo se desloca como segmento inteiro, pulando o segmento vizinho.
      const k = segs.findIndex((s) => s[0].id === id);
      const j = k + dir;
      if (j < 0 || j >= segs.length) return;
      const novosSegs = [...segs];
      [novosSegs[k], novosSegs[j]] = [novosSegs[j], novosSegs[k]];
      nova = novosSegs.flat();
    } else {
      const j = index + dir;
      if (j < 0 || j >= ordem.length) return;
      nova = [...ordem];
      [nova[index], nova[j]] = [nova[j], nova[index]];
    }
    setOrdem(nova);
    reordenar.mutate({ documentoId: modeloId, idsOrdenados: nova.map((d) => d.id) });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const blocoId = e.dataTransfer.getData('blocoId');
    if (blocoId) adicionar.mutate({ documentoId: modeloId, blocoId });
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
      className={cn(
        'min-h-[60vh] rounded-2xl border-2 border-dashed p-3 transition-colors sm:p-4',
        dragOver ? 'border-osg-moss bg-osg-moss/5' : 'border-osg-200 bg-osg-canvas/40',
      )}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
        </div>
      ) : ordem.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className={cn('rounded-full p-4 transition-colors', dragOver ? 'bg-osg-moss/10 text-osg-moss' : 'bg-osg-100 text-osg-400')}>
            <MousePointerSquareDashed className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-osg-700">Documento vazio</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Arraste blocos da <span className="font-medium text-osg-600">Biblioteca</span> para cá — ou clique no
              <span className="font-medium"> + </span> de cada bloco para adicioná-lo à sequência.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Reorder.Group axis="y" values={visiveis} onReorder={handleReorder} className="space-y-2">
            {visiveis.map((db) => {
              const m = meta.get(db.id)!;
              const capitulo = ehCapitulo(db);
              const segIdx = capitulo ? segs.findIndex((s) => s[0].id === db.id) : -1;
              return (
                <BlocoMontadoCard
                  key={db.id}
                  db={db}
                  rotulo={m.rotulo}
                  numero={m.numero}
                  aninhado={m.aninhado}
                  carregados={capArrastado?.id === db.id ? capArrastado.filhos.length : 0}
                  podeSubir={capitulo ? segIdx > 0 : m.numero > 1}
                  podeDescer={capitulo ? segIdx < segs.length - 1 : m.numero < ordem.length}
                  onMove={(dir) => moverPorClique(db.id, dir)}
                  onRemove={() => remover.mutate({ id: db.id, documentoId: modeloId })}
                  onToggleObrigatorio={() => atualizar.mutate({ id: db.id, documentoId: modeloId, patch: { obrigatorio: !db.obrigatorio } })}
                  onSaveObservacao={(v) => atualizar.mutate({ id: db.id, documentoId: modeloId, patch: { observacao: v } })}
                  onEditar={db.bloco && onEditarBloco ? () => onEditarBloco(db.bloco_id) : undefined}
                  onDragStart={() => iniciarArrasto(db)}
                  onCommitReorder={commitReorder}
                />
              );
            })}
          </Reorder.Group>
          <div className={cn(
            'mt-2 rounded-lg border border-dashed py-2.5 text-center text-xs transition-colors',
            dragOver ? 'border-osg-moss text-osg-moss' : 'border-osg-200 text-muted-foreground/70',
          )}>
            Solte aqui para adicionar ao fim
          </div>
        </>
      )}
    </div>
  );
}
