import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgWorkLoader from '@/components/equipe/osg/OsgWorkLoader';
import {
  OSG_LEGS,
  OSG_RAMP_AXIS,
  OSG_ROCK,
  OSG_SEAL_HEX_PATH,
  OSG_SISYPHUS_PATH,
} from '@/components/equipe/osg/osgWorkGlyph';

describe('OsgWorkLoader', () => {
  it('anuncia o carregamento e liga as três animações do ciclo', () => {
    const { container } = render(<OsgWorkLoader />);

    const svg = screen.getByRole('status', { name: 'Carregando' });
    expect(svg.getAttribute('width')).toBe('64');

    // Nomes das classes são o contrato com os keyframes do tailwind.config.
    const animacoes = [
      'osg-sisyphus-roll',
      'osg-sisyphus-leg-rear',
      'osg-sisyphus-leg-front',
    ];
    for (const cls of animacoes) {
      expect(container.querySelectorAll(`.animate-${cls}`).length).toBe(1);
    }
    expect(container.querySelectorAll('.motion-reduce\\:animate-none').length).toBe(
      animacoes.length,
    );
  });

  it('recorta as duas pernas do mesmo contorno e as gira em torno do quadril', () => {
    const { container } = render(<OsgWorkLoader />);

    // Uma peça por perna, cada uma com o contorno inteiro recortado na região dela
    // — mais o tronco, que é o terceiro desenho do mesmo path.
    expect(container.querySelectorAll(`path[d="${OSG_SISYPHUS_PATH}"]`)).toHaveLength(3);

    for (const [cls, pivot] of [
      ['osg-sisyphus-leg-rear', OSG_LEGS.rear],
      ['osg-sisyphus-leg-front', OSG_LEGS.front],
    ] as const) {
      const perna = container.querySelector(`.animate-${cls}`) as SVGGElement;
      // O eixo do giro vem do translate do pai + transformOrigin 0 0. Se alguém
      // trocar por um transformOrigin em px, a perna gira fora do quadril.
      expect(perna.style.transformOrigin).toBe('0 0');
      expect(perna.parentElement!.getAttribute('transform')).toBe(
        `translate(${pivot.pivotX} ${pivot.pivotY})`,
      );
      // Dois cortes de chão: um dentro do giro (tira o fio da rampa) e um fora
      // (planta a sola). Sem o de dentro sobra uma lâmina branca girando.
      expect(perna.querySelector('[clip-path]')!.getAttribute('clip-path')).toContain('ground-in');
    }
    const foraDoGiro = container.querySelector('[clip-path*="osg-loader-ground-"]');
    expect(foraDoGiro!.querySelector(`.animate-osg-sisyphus-leg-rear`)).not.toBeNull();
  });

  it('não desloca a cena e desenha a ladeira pelo próprio glyph', () => {
    const { container } = render(<OsgWorkLoader />);

    // Nada de translação: é o que faz o loop fechar sem emenda. Se alguém
    // reintroduzir um empurrão, o Sísifo volta a andar e o ciclo ganha costura.
    expect(container.querySelector('[class*="animate-osg-sisyphus-push"]')).toBeNull();
    expect(container.querySelector('line')).toBeNull();

    // O clip do tronco precisa dos DOIS polígonos: sem a faixa da rampa, o trecho
    // de ladeira que passa pelo vão das pernas não é desenhado por peça nenhuma.
    const bodyClip = container.querySelector(`clipPath[id*="body"]`)!;
    expect(bodyClip.querySelectorAll('polygon')).toHaveLength(2);

    // O corte do chão acompanha o aclive 2:1 medido no desenho.
    const ground = container.querySelector('clipPath[id*="ground-"]')!.querySelector('polygon')!;
    const [p1, p2] = ground.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
    expect((p2[1] - p1[1]) / (p2[0] - p1[0])).toBeCloseTo(OSG_RAMP_AXIS.slope, 2);
  });

  it('recorta as crateras no disco da pedra e gira em torno do centro dele', () => {
    const { container } = render(<OsgWorkLoader />);

    const roll = container.querySelector('.animate-osg-sisyphus-roll') as SVGGElement;
    // Círculo sem pintura que centra a caixa do grupo — sem ele o eixo do giro sai do lugar.
    const anchor = roll.querySelector('circle');
    expect(anchor!.getAttribute('fill')).toBe('none');
    expect(Number(anchor!.getAttribute('cx'))).toBe(OSG_ROCK.cx);
    expect(Number(anchor!.getAttribute('r'))).toBe(OSG_ROCK.clipR);
    expect(roll.style.transformBox).toBe('fill-box');
    expect(roll.style.transformOrigin).toBe('center');

    // As crateras (fora o círculo-âncora) cabem dentro do disco.
    const craters = Array.from(roll.querySelectorAll('circle')).slice(1);
    expect(craters.length).toBeGreaterThan(0);
    for (const c of craters) {
      const dist = Math.hypot(
        Number(c.getAttribute('cx')) - OSG_ROCK.cx,
        Number(c.getAttribute('cy')) - OSG_ROCK.cy,
      );
      expect(dist + Number(c.getAttribute('r'))).toBeLessThanOrEqual(OSG_ROCK.r);
    }
  });

  it('dá ids de clip próprios a cada instância', () => {
    const { container } = render(
      <>
        <OsgWorkLoader />
        <OsgWorkLoader />
      </>,
    );

    // 7 clips por loader (hexágono, pedra, chão externo, chão interno, tronco e as
    // duas pernas) e nenhum id repetido entre as instâncias.
    const ids = Array.from(container.querySelectorAll('clipPath')).map((c) => c.id);
    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(14);
  });
});

describe('OsgWorkIcon', () => {
  it('mantém o selo e o glyph vindos de osgWorkGlyph', () => {
    const { container } = render(<OsgWorkIcon />);

    const ds = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    // Duas vezes cada um: o componente repete o selo nas versões light e dark.
    expect(ds.filter((d) => d === OSG_SISYPHUS_PATH)).toHaveLength(2);
    expect(ds.filter((d) => d === OSG_SEAL_HEX_PATH)).toHaveLength(4); // sombra + selo, × 2
    // O ícone estático não anima nem recorta nada.
    expect(container.querySelectorAll('[class*="animate-osg-sisyphus"]')).toHaveLength(0);
    expect(container.querySelectorAll('clipPath')).toHaveLength(0);
  });
});
