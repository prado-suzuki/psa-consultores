import { fireEvent, screen } from '@testing-library/react';

/**
 * Texto do balão (`ButtonTooltip`/`ElementTooltip`) de um gatilho, ou `null` sem balão.
 * O Radix só monta o conteúdo aberto; o foco abre sem a espera do hover.
 */
export function dicaDe(gatilho: HTMLElement): string | null {
  fireEvent.focus(gatilho);
  const texto = screen.queryByRole('tooltip')?.textContent ?? null;
  fireEvent.blur(gatilho);
  return texto;
}
