/** Limiar (ms) acima do qual consideramos que o usuário "pressionou" em vez de clicar. */
const HOLD_MS = 200;
/** Movimento (px) acima do qual consideramos arraste/seleção, não clique. */
const MOVE_PX = 5;

// Só existe um mousedown→click ativo por vez, então um estado compartilhado basta
// (evita chamar hooks dentro de .map(), o que violaria as regras de hooks).
let pressStart: { x: number; y: number; t: number } | null = null;

/**
 * Retorna props para aplicar a uma linha de tabela (`<TableRow>`) que abre algo
 * ao clicar, mas NÃO ao pressionar (segurar) ou arrastar o mouse — preservando
 * seleção de texto e evitando aberturas acidentais.
 *
 * Cliques originados de elementos interativos internos (botões, links, inputs,
 * triggers de dialog) são ignorados para não conflitar com as ações da linha.
 *
 * PASSE A SUA CLASSE AQUI, no segundo argumento, e não no `className` do
 * elemento. O objeto devolvido JÁ TEM `className`, então espalhá-lo depois de um
 * `className` seu substitui o seu por inteiro, sem erro de tipo e sem aviso de
 * lint. Foi o que apagou o `group` da linha de exploração rural, deixando os
 * botões de ação invisíveis no hover, e a moldura dos cartões do Acordo de
 * Quotistas. Espalhar ANTES também funciona, mas depende de ordem e some na
 * primeira refatoração; o argumento não.
 */
export function rowActivateProps(onActivate: () => void, className?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    className: className ? `cursor-pointer ${className}` : 'cursor-pointer',
    onMouseDown: (e: React.MouseEvent) => {
      pressStart = e.button === 0 ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
    },
    onClick: (e: React.MouseEvent) => {
      const start = pressStart;
      pressStart = null;
      if (!start) return;
      // Ignora cliques originados de elementos interativos dentro da linha
      // (botões de ação, links, inputs). A própria linha tem role="button",
      // por isso restringimos a busca a esses elementos, não a [role="button"].
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) {
        return;
      }
      const moved = Math.abs(e.clientX - start.x) > MOVE_PX || Math.abs(e.clientY - start.y) > MOVE_PX;
      const held = Date.now() - start.t > HOLD_MS;
      if (moved || held) return;
      onActivate();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
