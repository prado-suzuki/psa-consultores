import { afterEach, describe, expect, it } from 'vitest';

import { MOBILE_BREAKPOINT, telaEstreita } from './use-mobile';

/**
 * `telaEstreita()` é consultada no estado INICIAL de duas coisas: a barra
 * lateral (nasce gaveta fechada ou coluna aberta) e a visão em que o painel de
 * tarefas abre. Nos dois casos o primeiro quadro é o que a pessoa vê a cada
 * navegação, então a resposta tem de ser síncrona — e é por isso que ela existe
 * ao lado do `useIsMobile`, que só sabe a largura depois do primeiro efeito.
 */
function definirLargura(px: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  });
}

describe('telaEstreita', () => {
  afterEach(() => {
    definirLargura(1024);
  });

  it('o breakpoint é exclusivo: 767 é estreita, 768 não é', () => {
    definirLargura(MOBILE_BREAKPOINT - 1);
    expect(telaEstreita()).toBe(true);

    definirLargura(MOBILE_BREAKPOINT);
    expect(telaEstreita()).toBe(false);
  });

  it('é o mesmo número que o `max-md:` do Tailwind usa', () => {
    // As classes de gaveta em `sidebarMedidas` são `max-md:*`, que o Tailwind
    // compila para `max-width: 767px`. Se este número divergir, a barra nasce
    // num estado que o CSS não desenha — e não há erro de build para avisar.
    expect(MOBILE_BREAKPOINT).toBe(768);
  });

  it('responde false sem window, para não quebrar renderização fora do navegador', () => {
    const janela = globalThis.window;
    // @ts-expect-error — simulando ambiente sem DOM
    delete globalThis.window;
    try {
      expect(telaEstreita()).toBe(false);
    } finally {
      globalThis.window = janela;
    }
  });
});
