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
}

export function DocumentoCanvas({ modeloId, docBlocos, isLoading }: Props) {
  const remover = useRemoverDocumentoBloco();
  const atualizar = useAtualizarDocumentoBloco();
  const reordenar = useReordenarBlocos();
  const adicionar = useAdicionarBloco();

  // Ordem local controlada pelo Reorder; ressincroniza quando o servidor muda
  // (adicionar/remover/refetch). O commit no banco acontece ao soltar.
  const [ordem, setOrdem] = useState<DocumentoBlocoComBloco[]>(docBlocos);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => { setOrdem(docBlocos); }, [docBlocos]);

  const rotulos = useMemo(
    () => rotulosNumeracao(ordem.map((d) => ({ id: d.id, tipo: d.bloco?.tipo, conteudo: d.bloco?.conteudo ?? '' }))),
    [ordem],
  );

  const commitReorder = () => {
    const ids = ordem.map((d) => d.id);
    if (ids.join('|') !== docBlocos.map((d) => d.id).join('|')) {
      reordenar.mutate({ documentoId: modeloId, idsOrdenados: ids });
    }
  };

  const moverPorClique = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= ordem.length) return;
    const nova = [...ordem];
    [nova[index], nova[j]] = [nova[j], nova[index]];
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
          <Reorder.Group axis="y" values={ordem} onReorder={setOrdem} className="space-y-2">
            {ordem.map((db, i) => (
              <BlocoMontadoCard
                key={db.id}
                db={db}
                rotulo={rotulos[i]}
                index={i}
                total={ordem.length}
                onMove={(dir) => moverPorClique(i, dir)}
                onRemove={() => remover.mutate({ id: db.id, documentoId: modeloId })}
                onToggleObrigatorio={() => atualizar.mutate({ id: db.id, documentoId: modeloId, patch: { obrigatorio: !db.obrigatorio } })}
                onSaveObservacao={(v) => atualizar.mutate({ id: db.id, documentoId: modeloId, patch: { observacao: v } })}
                onCommitReorder={commitReorder}
              />
            ))}
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
