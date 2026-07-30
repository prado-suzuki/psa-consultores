import type { ReactNode } from 'react';

interface SectionHeadingProps {
  /** Ícone da seção, geralmente em `text-primary`. */
  icon?: ReactNode;
  /** Ação opcional alinhada à direita (ex.: "Adicionar"). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Título de seção dos modais de tarefa e de projeto: rótulo curto em caixa alta
 * com ícone à esquerda e, quando houver, uma ação discreta à direita.
 */
export function SectionHeading({ icon, action, children }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {children}
      </h3>
      {action}
    </div>
  );
}
