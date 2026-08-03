import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { fileIconOf } from '@/components/equipe/osg/documentos/docMeta';
import { cn } from '@/lib/utils';

// Peças visuais da árvore de pastas do modo Organizar (ícone do arquivo, linha da
// árvore e a animação de recolher). Saíram da página junto com o modo, sem
// alteração de comportamento.

export function FileIcon({ nome, mime }: { nome: string; mime: string | null }) {
  const { Icon, className } = fileIconOf(nome, mime);
  return <Icon className={cn('h-4 w-4 shrink-0', className)} />;
}

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  // Mesma animação do agrupador "Oficina de Contratos" (grid-rows 0fr↔1fr +
  // overflow-hidden). `open` é dirigido por hover (ou pelo item selecionado).
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export function TreeRow({
  active, onClick, Icon, label, count, depth = 0, expandable, expanded,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  count: number;
  depth?: number;
  expandable?: boolean;
  expanded?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        depth === 2 ? 'ml-8' : depth === 1 ? 'ml-4' : '',
        active
          ? 'bg-osg-100 font-medium text-osg-700'
          : 'text-slate-600 hover:bg-osg-50 hover:text-osg-700',
      )}
    >
      {expandable ? (
        <span className="shrink-0 text-slate-400">
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none',
              expanded && 'rotate-90',
            )}
          />
        </span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 text-[11px] tabular-nums',
          active ? 'bg-osg-200/70 text-osg-700' : 'bg-slate-100 text-slate-500',
        )}
      >
        {count}
      </span>
    </div>
  );
}
