/**
 * O fundo escuro por baixo da barra lateral quando ela está aberta como gaveta.
 *
 * Existe porque a gaveta cobre o conteúdo: sem um lugar para tocar fora dela, o
 * único jeito de fechar seria acertar o hambúrguer, que fica POR BAIXO da
 * gaveta. Fechar tocando ao lado é o gesto que todo aplicativo de celular
 * ensina, e é o que faltava nas nove áreas — o Board era a única que tinha,
 * porque usava `<Sheet>`.
 *
 * `md:hidden` e não desmontagem por `useIsMobile`: quem decide que a barra é
 * gaveta é a media query, no CSS, junto de `classesGavetaBarra()`. Duas fontes
 * (uma no CSS, uma em JavaScript) discordariam por um quadro a cada resize.
 *
 * `z-40` fica abaixo do `z-50` da gaveta e acima do resto da página. Diálogo e
 * popover continuam por cima: eles montam em portal, depois na árvore.
 */
export function SidebarFundoGaveta({
  aberta,
  onFechar,
}: {
  /** A gaveta está aberta. No desktop isso é a barra aberta, e o fundo não aparece. */
  aberta: boolean;
  onFechar: () => void;
}) {
  if (!aberta) return null;

  return (
    <button
      type="button"
      aria-label="Fechar menu"
      onClick={onFechar}
      className="fixed inset-0 z-40 cursor-default bg-foreground/40 md:hidden"
    />
  );
}

export default SidebarFundoGaveta;
