import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Estado vazio no padrão da área OSG: moldura tracejada marrom-areia e ícone
 * dentro de um tile, igual ao da tela de checklist.
 */
export function OnboardingEmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  /** Saída opcional do estado vazio, quando existe uma além de sair da tela. */
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-osg-300/70 bg-white/60 px-6 py-16 text-center shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-osg-100 text-osg-moss">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-osg-700">{title}</h2>
        {children && (
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-osg-500/80">
            {children}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
