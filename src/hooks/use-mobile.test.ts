import { afterEach, describe, expect, it } from 'vitest';

import { renderHook } from '@testing-library/react';

import { MOBILE_BREAKPOINT, telaEstreita, useIsMobile } from './use-mobile';

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
    delete (globalThis as { window?: unknown }).window;
    try {
      expect(telaEstreita()).toBe(false);
    } finally {
      globalThis.window = janela;
    }
  });
});

describe('useIsMobile', () => {
  afterEach(() => {
    definirLargura(1024);
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('já nasce com a resposta certa, sem um quadro de desktop antes', () => {
    // O valor inicial era `undefined`, que virava `false` no primeiro render:
    // quem decide LAYOUT por ele desenhava um quadro de desktop e corrigia
    // depois — num celular esse quadro pisca. É o caso da coluna de nomes do
    // Gantt, que mede 300px no desktop e 132px no celular.
    definirLargura(390);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('sem `matchMedia` responde pela largura, em vez de derrubar quem o usa', () => {
    // O jsdom não implementa `matchMedia`, e Safari antigo devolve
    // MediaQueryList sem `addEventListener`. O hook derrubava a tela nesses
    // ambientes — o pior que pode acontecer aqui é não acompanhar o resize.
    definirLargura(390);
    expect(window.matchMedia).toBeUndefined();

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
