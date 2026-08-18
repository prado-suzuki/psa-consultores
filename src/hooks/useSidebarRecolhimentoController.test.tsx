import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ATRASO_RECOLHIMENTO_MS,
  useSidebarRecolhimentoController,
  useTelaDeTrabalhoLargo,
  type OpcoesSidebarRecolhimento,
} from './useSidebarRecolhimentoController';

/**
 * O contrato aprovado pela usuária, travado em teste: a barra ENTRA ABERTA,
 * recolhe sozinha depois de 450ms, e nunca recolhe por cima de quem mexeu nela.
 *
 * O layout e a tela são montados em `renderHook` separados de propósito — é
 * exatamente assim que eles se encontram em produção: sem parentesco, só pelo
 * registro do hook.
 */
const montarLayout = (opcoes?: OpcoesSidebarRecolhimento) =>
  renderHook(() => useSidebarRecolhimentoController(opcoes));

const montarTelaLarga = () => renderHook(() => useTelaDeTrabalhoLargo());

/** `matchMedia` não existe no jsdom; instalar/remover é o que liga o cenário. */
function pedirMenosMovimento(reduzido: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: reduzido, media: query }),
  });
}

describe('useSidebarRecolhimentoController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('não recolhe nada quando nenhuma tela se declarou de trabalho largo', () => {
    const layout = montarLayout();

    expect(layout.result.current.collapsed).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(layout.result.current.collapsed).toBe(false);
  });

  it('entra aberta e só recolhe depois do atraso, quando a tela pede', () => {
    const layout = montarLayout();
    montarTelaLarga();

    // O ponto do desenho: a barra existe aberta antes de recolher, senão o
    // usuário só veria um menu estreito e acharia que quebrou.
    expect(layout.result.current.collapsed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(ATRASO_RECOLHIMENTO_MS - 1);
    });
    expect(layout.result.current.collapsed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(layout.result.current.collapsed).toBe(true);
  });

  it('não atropela quem mexeu na barra durante a janela dos 450ms', () => {
    const layout = montarLayout();
    montarTelaLarga();

    act(() => {
      vi.advanceTimersByTime(100);
      layout.result.current.setCollapsed(true);
    });
    act(() => {
      vi.advanceTimersByTime(100);
      layout.result.current.setCollapsed(false);
    });

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(layout.result.current.collapsed).toBe(false);
  });

  it('não recolhe de novo depois que o usuário expande a barra recolhida', () => {
    const layout = montarLayout();
    montarTelaLarga();

    act(() => {
      vi.advanceTimersByTime(ATRASO_RECOLHIMENTO_MS);
    });
    expect(layout.result.current.collapsed).toBe(true);

    act(() => {
      layout.result.current.setCollapsed(false);
    });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(layout.result.current.collapsed).toBe(false);
  });

  it('com prefers-reduced-motion recolhe de imediato, sem o salto atrasado', () => {
    pedirMenosMovimento(true);
    const layout = montarLayout();
    montarTelaLarga();

    // Sem avançar timer nenhum: quem pediu menos movimento recebe a tela já
    // assentada em vez de um pulo sem animação meio segundo depois.
    expect(layout.result.current.collapsed).toBe(true);
  });

  it('devolve a barra aberta ao sair da tela larga', () => {
    const layout = montarLayout();
    const tela = montarTelaLarga();

    act(() => {
      vi.advanceTimersByTime(ATRASO_RECOLHIMENTO_MS);
    });
    expect(layout.result.current.collapsed).toBe(true);

    act(() => {
      tela.unmount();
    });
    expect(layout.result.current.collapsed).toBe(false);
  });

  it('preserva a barra recolhida à mão quando a tela larga sai', () => {
    const layout = montarLayout();
    const tela = montarTelaLarga();

    act(() => {
      layout.result.current.setCollapsed(true);
    });
    act(() => {
      tela.unmount();
    });
    // Quem recolheu foi o usuário: devolver a barra aberta seria desfazer a
    // escolha dele.
    expect(layout.result.current.collapsed).toBe(true);
  });

  describe('persistência', () => {
    const CHAVE = 'board-sidebar-collapsed';

    it('grava a escolha manual e lê de volta na montagem seguinte', () => {
      const layout = montarLayout({ persistKey: CHAVE });

      act(() => {
        layout.result.current.setCollapsed(true);
      });
      expect(localStorage.getItem(CHAVE)).toBe('true');

      layout.unmount();
      const outro = montarLayout({ persistKey: CHAVE });
      expect(outro.result.current.collapsed).toBe(true);
    });

    it('não grava o recolhimento automático da tela larga', () => {
      const layout = montarLayout({ persistKey: CHAVE });
      montarTelaLarga();

      act(() => {
        vi.advanceTimersByTime(ATRASO_RECOLHIMENTO_MS);
      });
      expect(layout.result.current.collapsed).toBe(true);
      // Fosse persistido, a barra nasceria estreita em todas as outras telas da
      // área para sempre — o recolhimento é da tela, não uma preferência.
      expect(localStorage.getItem(CHAVE)).toBeNull();
    });

    it('aceita o formato legado do mapeamento ("1"/"0")', () => {
      localStorage.setItem('sidebarCollapsed', '1');
      const layout = montarLayout({ persistKey: 'sidebarCollapsed' });
      expect(layout.result.current.collapsed).toBe(true);
    });
  });
});

describe('useTelaDeTrabalhoLargo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('não pede recolhimento quando declarada inativa', () => {
    const layout = montarLayout();
    renderHook(() => useTelaDeTrabalhoLargo(false));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(layout.result.current.collapsed).toBe(false);
  });

  it('atende a tela que só fica larga em parte da vida dela', () => {
    // É o caso do Gerar Documento e da Montagem: a tela abre numa galeria de
    // escolha e só vira bancada de três colunas quando algo é selecionado.
    const layout = montarLayout();
    const tela = renderHook(({ largo }) => useTelaDeTrabalhoLargo(largo), {
      initialProps: { largo: false },
    });

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(layout.result.current.collapsed).toBe(false);

    act(() => {
      tela.rerender({ largo: true });
    });
    act(() => {
      vi.advanceTimersByTime(ATRASO_RECOLHIMENTO_MS);
    });
    expect(layout.result.current.collapsed).toBe(true);

    // E ao voltar para a galeria a barra volta sozinha.
    act(() => {
      tela.rerender({ largo: false });
    });
    expect(layout.result.current.collapsed).toBe(false);
  });
});
