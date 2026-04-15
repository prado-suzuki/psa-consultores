/**
 * Fallback exibido enquanto o bundle de uma rota lazy está carregando.
 *
 * Usa as mesmas cores e proporções dos loaders já existentes no sistema
 * (teal-600 / slate-50) para manter consistência visual.
 */
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div
      className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"
      role="status"
      aria-label="Carregando página"
    />
  </div>
);
