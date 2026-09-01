import { Loader2 } from 'lucide-react';

/**
 * Cobertura animada exibida POR CIMA do iframe enquanto o relatório do Looker
 * carrega/renderiza (~4s), pra o usuário não ver o dashboard "se montando".
 * Reutilizável: use junto de qualquer iframe de dashboard.
 */
export function DashboardLoadingOverlay({ label = 'Carregando relatório…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
        <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-teal-500 opacity-0" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">Isso pode levar alguns segundos</p>
      </div>
      <div className="mt-1 w-64 space-y-2" aria-hidden>
        <div className="h-2 rounded bg-slate-100 animate-pulse" />
        <div className="h-2 w-4/5 rounded bg-slate-100 animate-pulse [animation-delay:150ms]" />
        <div className="h-2 w-3/5 rounded bg-slate-100 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}
