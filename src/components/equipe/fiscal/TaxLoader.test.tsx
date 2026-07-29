import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TaxIcon from '@/components/equipe/fiscal/TaxIcon';
import TaxLoader from '@/components/equipe/fiscal/TaxLoader';
import {
  TAX_PIG_BODY_PATH,
  TAX_PIG_COIN_PATH,
  TAX_PIG_TAIL_PATH,
} from '@/components/equipe/fiscal/taxPiggyGlyph';

describe('TaxLoader', () => {
  it('anuncia o estado de carregamento e liga as quatro animações do ciclo', () => {
    const { container } = render(<TaxLoader />);

    const svg = screen.getByRole('status', { name: 'Carregando' });
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.getAttribute('height')).toBe('64');

    // Os nomes das classes são o contrato com os keyframes do tailwind.config —
    // renomear lá sem renomear aqui deixa o loader parado.
    for (const cls of ['tax-coin-fall', 'tax-coin-spin', 'tax-pig-bounce', 'tax-glint']) {
      expect(container.querySelectorAll(`.animate-${cls}`).length).toBeGreaterThan(0);
    }
    // Toda animação respeita prefers-reduced-motion.
    expect(container.querySelectorAll('.animate-tax-coin-fall, .animate-tax-coin-spin, .animate-tax-pig-bounce, .animate-tax-glint').length)
      .toBe(container.querySelectorAll('.motion-reduce\\:animate-none').length);
  });

  it('desenha a moeda ANTES do corpo, que é o que a faz entrar no cofre', () => {
    const { container } = render(<TaxLoader />);

    const desenhos = Array.from(container.querySelectorAll('circle, path'));
    const primeiraMoeda = desenhos.findIndex((el) => el.tagName.toLowerCase() === 'circle');
    const corpo = desenhos.findIndex((el) => el.getAttribute('d') === TAX_PIG_BODY_PATH);

    expect(primeiraMoeda).toBeGreaterThanOrEqual(0);
    expect(corpo).toBeGreaterThan(primeiraMoeda);
  });

  it('aceita tamanho e classe de cor customizados', () => {
    render(<TaxLoader size={32} className="text-teal-700" label="Apurando" />);

    const svg = screen.getByRole('status', { name: 'Apurando' });
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('class')).toContain('text-teal-700');
  });
});

describe('TaxIcon', () => {
  it('mantém o selo com os três paths do glyph (corpo, rabo e moeda estática)', () => {
    const { container } = render(<TaxIcon />);

    const ds = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    for (const path of [TAX_PIG_BODY_PATH, TAX_PIG_TAIL_PATH, TAX_PIG_COIN_PATH]) {
      // Duas vezes: o componente repete o selo nas versões light e dark.
      expect(ds.filter((d) => d === path)).toHaveLength(2);
    }
    // O ícone estático não anima.
    expect(container.querySelectorAll('[class*="animate-tax"]')).toHaveLength(0);
  });
});
