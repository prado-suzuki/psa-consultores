import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AreaLoader } from '@/components/equipe/AreaLoader';

/** O porquinho do Tax é identificado pela animação da moeda caindo. */
const isTaxGlyph = (container: HTMLElement) =>
  container.querySelectorAll('.animate-tax-coin-fall').length > 0;

describe('AreaLoader', () => {
  it('usa o glifo registrado da área — Tax é o porquinho', () => {
    const { container } = render(<AreaLoader area="tax" size={64} />);

    expect(isTaxGlyph(container)).toBe(true);
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('cai no spinner padrão nas áreas sem glifo próprio', () => {
    // OSG ainda não tem ícone — o dia em que registrar um, este caso muda com ela.
    for (const area of ['osg', 'board', 'digital'] as const) {
      const { container } = render(<AreoLoaderProbe area={area} />);
      expect(isTaxGlyph(container)).toBe(false);
      expect(container.querySelectorAll('.animate-spin').length).toBe(1);
    }
  });

  it('cai no spinner padrão quando o call site não sabe a área', () => {
    const { container } = render(<AreaLoader />);

    expect(isTaxGlyph(container)).toBe(false);
    expect(container.querySelectorAll('.animate-spin').length).toBe(1);
  });

  it('aplica o tamanho pedido nos dois glifos', () => {
    const { container: tax } = render(<AreaLoader area="tax" size={72} />);
    expect(tax.querySelector('svg')?.getAttribute('width')).toBe('72');

    const { container: padrao } = render(<AreaLoader area="osg" size={72} />);
    expect(padrao.querySelector('svg')?.style.width).toBe('72px');
  });

  it('classe do call site é layout: não apaga a cor própria do glifo do Tax', () => {
    const { container } = render(<AreaLoader area="tax" className="mx-auto block" />);

    // Em SVG, `className` é um SVGAnimatedString — a classe se lê pelo atributo.
    const classes = container.querySelector('svg')!.getAttribute('class') ?? '';
    expect(classes).toContain('mx-auto');
    // A cor base do porquinho sobrevive à className de layout.
    expect(classes).toContain('text-[#0e4b5a]');
  });

  it('anuncia o label customizado para leitores de tela', () => {
    render(<AreaLoader area="osg" label="Carregando comentários" />);

    expect(screen.getByRole('status', { name: 'Carregando comentários' })).toBeInTheDocument();
  });
});

// Wrapper só para deixar o laço acima legível no output do vitest.
function AreoLoaderProbe({ area }: { area: 'osg' | 'board' | 'digital' }) {
  return <AreaLoader area={area} />;
}
