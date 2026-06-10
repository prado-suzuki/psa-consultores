import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical, ChevronDown, Trash2, Lock, LockOpen, AlertTriangle,
  ChevronUp, Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentoBlocoComBloco } from '@/hooks/useModelosDocumento';
import type { TipoBloco } from '@/lib/templates';

/** Cor do chip de numeração conforme a hierarquia estrutural do bloco. */
const CHIP_POR_TIPO: Record<Exclude<TipoBloco, 'livre'>, string> = {
  capitulo: 'bg-osg-moss text-white',
  clausula: 'bg-osg-600 text-white',
  paragrafo: 'border border-osg-300 text-osg-700 bg-osg-50',
};

interface Props {
  db: DocumentoBlocoComBloco;
  rotulo: string | null;
  numero: number;
  /** Bloco pertence a um capítulo — indenta e desenha o trilho lateral. */
  aninhado: boolean;
  /** Qtde. de filhos viajando junto enquanto este capítulo é arrastado. */
  carregados: number;
  podeSubir: boolean;
  podeDescer: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onToggleObrigatorio: () => void;
  onSaveObservacao: (valor: string | null) => void;
  onDragStart: () => void;
  onCommitReorder: () => void;
}

export function BlocoMontadoCard({
  db, rotulo, numero, aninhado, carregados, podeSubir, podeDescer,
  onMove, onRemove, onToggleObrigatorio, onSaveObservacao, onDragStart, onCommitReorder,
}: Props) {
  const controls = useDragControls();
  const [aberto, setAberto] = useState(false);

  const bloco = db.bloco;
  const removido = !bloco;
  const inativo = bloco && !bloco.ativo;
  const tipo = bloco?.tipo ?? 'livre';
  const flags = bloco?.flags ?? [];

  return (
    <Reorder.Item
      value={db}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onCommitReorder}
      whileDrag={{ scale: 1.015, boxShadow: '0 12px 28px -8px hsl(var(--osg-700) / 0.25)' }}
      className={cn(
        'group relative rounded-xl border bg-card/90 backdrop-blur-sm transition-colors',
        'border-osg-300/60 shadow-[0_1px_2px_hsl(var(--osg-700)/0.06)]',
        aninhado && "ml-7 before:absolute before:-left-4 before:-top-2 before:bottom-0 before:w-px before:bg-osg-moss/70 before:content-['']",
        removido && 'border-destructive/40',
      )}
    >
      <div className="flex items-stretch">
        {/* Alça de arrastar */}
        <button
          type="button"
          aria-label="Arrastar para reordenar"
          onPointerDown={(e) => controls.start(e)}
          className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-osg-300 transition-colors hover:bg-osg-50 hover:text-osg-600 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 py-2.5 pr-2">
          {/* Linha principal */}
          <div className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{numero}</span>
            {rotulo && tipo !== 'livre' && (
              <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none', CHIP_POR_TIPO[tipo as Exclude<TipoBloco, 'livre'>])}>
                {rotulo}
              </span>
            )}
            <span className={cn('truncate text-sm font-medium', removido && 'italic text-destructive')}>
              {bloco?.nome ?? '— bloco removido —'}
            </span>
            {carregados > 0 && (
              <span className="shrink-0 rounded-md bg-osg-moss/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-osg-moss">
                +{carregados} {carregados === 1 ? 'bloco' : 'blocos'}
              </span>
            )}

            {/* Indicadores compactos (estado recolhido) */}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onToggleObrigatorio}
                title={db.obrigatorio ? 'Obrigatório — sempre incluído (clique p/ tornar condicional)' : 'Condicional — incluído conforme as flags (clique p/ tornar obrigatório)'}
                aria-label={db.obrigatorio ? 'Obrigatório' : 'Condicional'}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-osg-50',
                  db.obrigatorio ? 'text-osg-700' : 'text-osg-700/50 hover:text-osg-700',
                )}
              >
                {db.obrigatorio ? <Lock className="h-4 w-4" strokeWidth={1.5} /> : <LockOpen className="h-4 w-4" strokeWidth={1.5} />}
              </button>
              {flags.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Flag className="h-3 w-3" />{flags.length}
                </span>
              )}
              {inativo && (
                <Badge variant="outline" className="h-5 gap-0.5 border-amber-300 px-1 text-[10px] text-amber-600">
                  <AlertTriangle className="h-2.5 w-2.5" /> inativo
                </Badge>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => setAberto((v) => !v)}
                aria-label={aberto ? 'Recolher' : 'Expandir'}
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
              </Button>
            </div>
          </div>

          {/* Prévia do conteúdo */}
          {bloco?.conteudo && (
            <p className={cn('mt-1 pl-7 text-xs text-muted-foreground', aberto ? 'line-clamp-4' : 'line-clamp-1')}>
              {bloco.conteudo}
            </p>
          )}

          {/* Detalhes (disclosure progressivo) */}
          {aberto && (
            <div className="mt-2.5 space-y-2.5 border-t border-osg-100 pl-7 pt-2.5">
              {flags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {flags.map((f) => (
                    <Badge key={f} variant="secondary" className="gap-0.5 text-[10px]">
                      <Flag className="h-2.5 w-2.5" />{f}
                    </Badge>
                  ))}
                </div>
              )}

              <Input
                defaultValue={db.observacao ?? ''}
                placeholder="observação (opcional)"
                className="h-7 text-xs"
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== (db.observacao ?? null)) onSaveObservacao(v);
                }}
              />

              <div className="flex items-center justify-between">
                {/* Fallback de reordenação por teclado/clique */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" disabled={!podeSubir} onClick={() => onMove(-1)} aria-label="Mover para cima">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-6 w-6" disabled={!podeDescer} onClick={() => onMove(1)} aria-label="Mover para baixo">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10" onClick={onRemove}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}
