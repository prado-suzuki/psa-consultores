// Peças visuais do modal de tarefa: a da sprint (criar/editar entregável) e a do
// backlog usam o mesmo casco — faixa de cor no topo, cartão de conteúdo com a
// descrição rica à esquerda e painel de propriedades tingido à direita.
import { ClipboardList, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { cn } from '@/lib/utils';

/** Selo antes do título: recorte claro dentro da faixa, para o ícone respirar. */
export function TitleSeal({ icon: Icon }: { icon: typeof ClipboardList }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Rótulo de seção com o traço do accent da área (teal): é o que dá cor ao
// formulário sem mexer no fundo dos cartões.
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
      <span className="h-[3px] w-5 shrink-0 rounded-full bg-primary" aria-hidden />
      {children}
    </h3>
  );
}

export function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-primary/35 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface DescricaoDaTarefaProps {
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

/** Descrição rica com o botão de "tela cheia"; quem controla o estado é o modal. */
export function DescricaoDaTarefa({ value, onChange, expanded, onToggle }: DescricaoDaTarefaProps) {
  return (
    <div className={cn('space-y-3', expanded && 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex items-center justify-between gap-2">
        {/* Sem htmlFor: o editor rico não é um <textarea>, o rótulo vai por aria-label. */}
        <div>
          <Label className="text-sm font-semibold">Descrição</Label>
          {!expanded && (
            <p className="text-xs text-muted-foreground">
              Detalhe o objetivo, critérios de aceite e contexto da entrega.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-primary"
          onClick={onToggle}
        >
          {expanded ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              Reduzir
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir
            </>
          )}
        </Button>
      </div>
      <TarefaRichTextEditor
        value={value}
        onChange={onChange}
        ariaLabel="Descrição"
        // Sombra suave e tonal: destaca o campo de descrição dentro do cartão.
        className="shadow-md shadow-primary/15"
        fillHeight={expanded}
        minHeight={expanded ? 'min-h-[360px]' : 'min-h-[280px]'}
        maxHeight={expanded ? undefined : 'max-h-[420px]'}
      />
    </div>
  );
}

/** Modo "tela cheia" da descrição: só o título de referência e o editor. */
export function DescricaoExpandida({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="truncate text-sm font-medium text-foreground">{title || 'Tarefa sem título'}</p>
      {children}
      <p className="text-xs text-muted-foreground">
        Pressione Esc ou clique em “Reduzir” para voltar aos demais campos.
      </p>
    </div>
  );
}
