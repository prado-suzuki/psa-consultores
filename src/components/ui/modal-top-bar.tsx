import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface ModalTopBarProps {
  /** Ícone da entidade, geralmente em `text-primary`. */
  icon: ReactNode;
  /** Rótulo curto do modo (ex.: "Novo Projeto", "Editar Tarefa"). */
  title: string;
  /** Descrição para leitores de tela — o Radix exige uma por diálogo. */
  description: string;
  /** Botões de ação alinhados à direita, antes do fechar. */
  actions?: ReactNode;
}

/**
 * Barra fixa no topo dos modais de tarefa e de projeto: rótulo do modo à
 * esquerda, ações e fechar à direita.
 *
 * O título aqui é discreto de propósito — nos dois modais o protagonista é o
 * campo de nome/título logo abaixo, em corpo grande. A barra existe para as
 * ações não fugirem da vista quando o conteúdo rola.
 */
export function ModalTopBar({ icon, title, description, actions }: ModalTopBarProps) {
  return (
    <div className="sticky top-0 z-20 -mx-6 flex items-center justify-between gap-3 border-b bg-background/95 px-6 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-primary" aria-hidden>
          {icon}
        </span>
        <DialogTitle className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
        <DialogClose
          className="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </DialogClose>
      </div>
    </div>
  );
}
