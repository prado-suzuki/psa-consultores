/**
 * Fallback exibido enquanto o chunk de uma rota `lazy` está carregando.
 *
 * COR POR TOKEN, e aqui isso não é detalhe: este é o primeiro pixel de TODA
 * troca de rota, então é a superfície que mais aparece no sistema. As cores
 * originais eram `slate-50` e `teal-600` cruas — e `teal-600` é a primitiva da
 * escala institucional, que mora no `:root` e nenhum tema sobrescreve. O
 * carregamento sairia teal no Dev grafite, na OSG musgo, em todas as áreas.
 *
 * `bg-background` e `border-primary` deixam a área resolver o tom, que é o
 * contrato de `docs/geral/paleta-por-area.md`: o componente nomeia o papel.
 */
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div
      className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
      role="status"
      aria-label="Carregando página"
    />
  </div>
);
