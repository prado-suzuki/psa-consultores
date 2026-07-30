import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AreaLoader } from '@/components/equipe/AreaLoader';

/** O porquinho do Tax é identificado pela animação da moeda caindo. */
const isTaxGlyph = (container: HTMLElement) =>
  container.querySelectorAll('.animate-tax-coin-fall').length > 0;

/** O Sísifo da OSG é identificado pela passada da perna dianteira. */
const isOsgGlyph = (container: HTMLElement) =>
  container.querySelectorAll('.animate-osg-sisyphus-hip-front').length > 0;

describe('AreaLoader', () => {
  it('usa o glifo registrado da área — Tax é o porquinho', () => {
    const { container } = render(<AreaLoader area="tax" size={64} />);

    expect(isTaxGlyph(container)).toBe(true);
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('usa o glifo registrado da área — OSG é o Sísifo', () => {
    const { container } = render(<AreaLoader area="osg" size={64} />);

    expect(isOsgGlyph(container)).toBe(true);
    // E não sobra spinner genérico junto, senão a troca ficou pela metade.
    expect(container.querySelectorAll('.animate-spin').length).toBe(0);
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('cai no spinner padrão nas áreas sem glifo próprio', () => {
    for (const area of ['board', 'digital'] as const) {
      const { container } = render(<AreoLoaderProbe area={area} />);
      expect(isTaxGlyph(container)).toBe(false);
      expect(isOsgGlyph(container)).toBe(false);
      expect(container.querySelectorAll('.animate-spin').length).toBe(1);
    }
  });

  it('cai no spinner padrão quando o call site não sabe a área', () => {
    const { container } = render(<AreaLoader />);

    expect(isTaxGlyph(container)).toBe(false);
    expect(isOsgGlyph(container)).toBe(false);
    expect(container.querySelectorAll('.animate-spin').length).toBe(1);
  });

  it('aplica o tamanho pedido nos glifos de área', () => {
    for (const area of ['tax', 'osg'] as const) {
      const { container } = render(<AreaLoader area={area} size={72} />);
      expect(container.querySelector('svg')?.getAttribute('width'), area).toBe('72');
    }
  });

  it('classe do call site é layout: não apaga a cor própria de cada glifo', () => {
    // Em SVG, `className` é um SVGAnimatedString — a classe se lê pelo atributo.
    const read = (container: HTMLElement) =>
      container.querySelector('svg')!.getAttribute('class') ?? '';

    const tax = read(render(<AreaLoader area="tax" className="mx-auto block" />).container);
    expect(tax).toContain('mx-auto');
    expect(tax).toContain('text-[#0e4b5a]');

    const osg = read(render(<AreaLoader area="osg" className="mx-auto block" />).container);
    expect(osg).toContain('mx-auto');
    // Mesmo navy do fundo do selo hexagonal do ícone.
    expect(osg).toContain('text-[#141a36]');
  });

  it('anuncia o label customizado para leitores de tela', () => {
    render(<AreaLoader area="osg" label="Carregando comentários" />);

    expect(screen.getByRole('status', { name: 'Carregando comentários' })).toBeInTheDocument();
  });
});

// Wrapper só para deixar o laço acima legível no output do vitest.
function AreoLoaderProbe({ area }: { area: 'board' | 'digital' }) {
  return <AreaLoader area={area} />;
}
