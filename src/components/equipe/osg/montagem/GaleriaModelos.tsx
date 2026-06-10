import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, FileStack, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModeloComContagem } from '@/hooks/useModelosDocumento';

interface Props {
  modelos: ModeloComContagem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNovo: () => void;
}

export function GaleriaModelos({ modelos, isLoading, onSelect, onNovo }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card "Novo modelo" */}
      <button
        type="button"
        onClick={onNovo}
        className="group flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-osg-300/70 bg-osg-canvas/40 p-5 text-center transition-colors hover:border-osg-moss hover:bg-osg-moss/5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-osg-100 text-osg-600 transition-colors group-hover:bg-osg-moss group-hover:text-white">
          <Plus className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-osg-700">Novo modelo</span>
        <span className="text-xs text-muted-foreground">Comece um lego de contrato do zero</span>
      </button>

      {modelos.length === 0 ? (
        <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground sm:col-span-1 lg:col-span-2">
          <FileStack className="h-7 w-7 opacity-40" />
          Nenhum modelo ainda. Crie o primeiro com "Novo modelo".
        </div>
      ) : (
        modelos.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              'group relative flex min-h-[8.5rem] flex-col rounded-2xl border border-osg-300/60 bg-card p-4 text-left shadow-[0_1px_2px_hsl(var(--osg-700)/0.06)] transition-all hover:-translate-y-0.5 hover:border-osg-moss/50 hover:shadow-md',
              !m.ativo && 'opacity-60',
            )}
          >
            {/* Traço moss sob o título (linguagem visual OSG) */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold leading-tight text-osg-700">{m.nome}</h3>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-osg-moss/70" />
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-osg-50 text-osg-400 group-hover:text-osg-600">
                <Layers className="h-4 w-4" />
              </span>
            </div>

            {m.descricao && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>}

            <div className="mt-auto flex items-center gap-1.5 pt-3">
              <Badge variant="outline" className="text-[10px]">{m.num_blocos} bloco{m.num_blocos === 1 ? '' : 's'}</Badge>
              {m.tipo && <Badge variant="secondary" className="text-[10px]">{m.tipo}</Badge>}
              {!m.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
