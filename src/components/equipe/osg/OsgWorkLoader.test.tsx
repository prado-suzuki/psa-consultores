import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import tailwindConfig from '../../../../tailwind.config';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgWorkLoader from '@/components/equipe/osg/OsgWorkLoader';
import {
  OSG_CRATERS,
  OSG_FIGURE_VIEWBOX,
  OSG_LEGS,
  OSG_SCENE,
  OSG_SEAL_HEX_PATH,
  OSG_SISYPHUS_PATH,
  type OsgLegJoints,
  type OsgPoint,
} from '@/components/equipe/osg/osgWorkGlyph';

const ANIMATIONS = [
  'osg-sisyphus-hip-rear',
  'osg-sisyphus-knee-rear',
  'osg-sisyphus-hip-front',
  'osg-sisyphus-knee-front',
  'osg-sisyphus-bob',
  'osg-sisyphus-roll',
];

const LEG_TRACKS = ANIMATIONS.slice(0, 4);

type Track = Record<string, { transform?: string }>;

const keyframes = tailwindConfig.theme.extend.keyframes as unknown as Record<string, Track>;

/** Ângulos por parada, com o '0%, 100%' do tailwind expandido nas duas pontas. */
function readTrack(name: string): Map<number, number> {
  const out = new Map<number, number>();
  for (const [selector, decl] of Object.entries(keyframes[name])) {
    const degrees = Number(/rotate\((-?[\d.]+)deg\)/.exec(decl.transform ?? '')?.[1]);
    for (const stop of selector.split(',')) out.set(Number(stop.trim().replace('%', '')), degrees);
  }
  return out;
}

function rotateAbout([px, py]: OsgPoint, degrees: number, [x, y]: OsgPoint): OsgPoint {
  const a = (degrees * Math.PI) / 180;
  const dx = x - px;
  const dy = y - py;
  return [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)];
}

/**
 * Onde o tornozelo cai, dada a rotação do quadril e do joelho.
 *
 * Reproduz o aninhamento do SVG: o giro do joelho acontece no sistema ANTES do
 * giro do quadril, e o do quadril é aplicado por fora.
 */
function ankleAt(joints: OsgLegJoints, hipDeg: number, kneeDeg: number): OsgPoint {
  return rotateAbout(joints.hip, hipDeg, rotateAbout(joints.knee, kneeDeg, joints.ankle));
}

/** Distância perpendicular do ponto ao eixo da ladeira (positivo = acima dela). */
function heightOverRamp([x, y]: OsgPoint): number {
  const [[x1, y1], [x2, y2]] = [OSG_SCENE.ramp.from, OSG_SCENE.ramp.to];
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = y1 - slope * x1;
  return (slope * x + intercept - y) / Math.hypot(slope, 1);
}

describe('keyframes da passada', () => {
  it('fecha o ciclo sem emenda nas quatro trilhas', () => {
    for (const name of LEG_TRACKS) {
      const track = readTrack(name);
      expect(track.get(0), name).toBeCloseTo(track.get(100)!, 5);
    }
  });

  it('põe uma parada no vértice do ciclo, onde o pé descola', () => {
    // Fora da grade, a interpolação corta a curva no canto e o erro CRESCE ao
    // adicionar paradas. 62,5% é o instante em que o apoio vira recuperação.
    for (const name of LEG_TRACKS) {
      expect(readTrack(name).has(62.5), name).toBe(true);
    }
  });

  it('usa a mesma grade de paradas nas quatro trilhas', () => {
    const grids = LEG_TRACKS.map((name) => [...readTrack(name).keys()].sort((a, b) => a - b));
    for (const grid of grids) expect(grid).toEqual(grids[0]);
    expect(grids[0]).toHaveLength(17);
  });

  it('nunca deixa o pé furar por baixo da ladeira', () => {
    // O pé pode AFUNDAR na faixa da rampa (mesma cor, não aparece), mas passar da
    // face de baixo dela apareceria como uma lâmina saindo do aclive.
    const footRadius = OSG_SCENE.legWidth / 2;
    const rampHalf = OSG_SCENE.ramp.width / 2;

    for (const [side, joints, hipTrack, kneeTrack] of [
      ['rear', OSG_LEGS.rear, 'osg-sisyphus-hip-rear', 'osg-sisyphus-knee-rear'],
      ['front', OSG_LEGS.front, 'osg-sisyphus-hip-front', 'osg-sisyphus-knee-front'],
    ] as const) {
      const hips = readTrack(hipTrack);
      const knees = readTrack(kneeTrack);
      for (const stop of hips.keys()) {
        const ankle = ankleAt(joints, hips.get(stop)!, knees.get(stop)!);
        // -4 é o sobe-e-desce do corpo, que empurra o quadril para baixo.
        const sole = heightOverRamp([ankle[0], ankle[1] + 4]) - footRadius;
        expect(sole, `${side} em ${stop}%`).toBeGreaterThan(-rampHalf);
      }
    }
  });

  it('mantém cada pé apoiado na ladeira na maior parte do ciclo', () => {
    // O que estava quebrado antes: girar o quadril arrasta o pé num arco, não ao
    // longo do aclive, e ele saía flutuando. Apoiado = sola dentro da faixa da
    // rampa, onde ela se funde com o aclive porque a cor é a mesma.
    const soles = Object.fromEntries(
      (
        [
          ['rear', OSG_LEGS.rear, 'osg-sisyphus-hip-rear', 'osg-sisyphus-knee-rear'],
          ['front', OSG_LEGS.front, 'osg-sisyphus-hip-front', 'osg-sisyphus-knee-front'],
        ] as const
      ).map(([side, joints, hipTrack, kneeTrack]) => {
        const hips = readTrack(hipTrack);
        const knees = readTrack(kneeTrack);
        return [
          side,
          [...hips.keys()]
            .filter((stop) => stop < 100)
            .map((stop) => {
              const ankle = ankleAt(joints, hips.get(stop)!, knees.get(stop)!);
              // +4 é o sobe-e-desce, que empurra o quadril para baixo.
              return heightOverRamp([ankle[0], ankle[1] + 4]) - OSG_SCENE.legWidth / 2;
            }),
        ] as const;
      }),
    );

    for (const [side, values] of Object.entries(soles)) {
      const planted = values.filter((sole) => Math.abs(sole) <= OSG_SCENE.ramp.width / 2);
      expect(planted.length, `${side}: paradas com o pé apoiado`).toBeGreaterThan(
        values.length / 2,
      );
      // E sai do chão em algum momento, senão o pé arrasta e não há passada.
      expect(Math.max(...values) - Math.min(...values), `${side}: elevação`).toBeGreaterThan(5);
    }

    // Assimetria proposital: a perna de trás faz arrasto baixo porque está
    // desenhada quase esticada, e é a da frente que dá a passada legível.
    expect(Math.max(...soles.front)).toBeGreaterThan(Math.max(...soles.rear) + 10);
  });
});

describe('OsgWorkLoader', () => {
  it('anuncia o carregamento, sem selo e pintando com currentColor', () => {
    const { container } = render(<OsgWorkLoader />);

    const svg = screen.getByRole('status', { name: 'Carregando' });
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.getAttribute('viewBox')).toBe(OSG_FIGURE_VIEWBOX);
    expect(svg.getAttribute('fill')).toBe('currentColor');
    // Selo é crachá de cor própria: vira mancha ilegível nos 16-20px dos spinners
    // embutidos em botão. Ele fica só no ícone estático.
    expect(container.querySelector(`[d="${OSG_SEAL_HEX_PATH}"]`)).toBeNull();
    // E o loader monta das peças, não do path fundido do potrace.
    expect(container.querySelector(`[d="${OSG_SISYPHUS_PATH}"]`)).toBeNull();
  });

  it('deixa a figura ocupar o quadro inteiro, para sobreviver a 16px', () => {
    // Dentro do selo a figura ficava em 280 de 512. O viewBox justo é o que dá o
    // ganho de ~1,8× no mesmo `size` — sem ele o glifo não lê nos spinners.
    const [minX, minY, width, height] = OSG_FIGURE_VIEWBOX.split(' ').map(Number);
    expect(width).toBe(height);
    // Nenhuma peça estática pode escapar do quadro.
    for (const [x, y] of [
      OSG_SCENE.ramp.from,
      OSG_SCENE.ramp.to,
      [OSG_SCENE.head.cx, OSG_SCENE.head.cy],
      [OSG_SCENE.rock.cx, OSG_SCENE.rock.cy],
    ] as const) {
      expect(x).toBeGreaterThanOrEqual(minX);
      expect(x).toBeLessThanOrEqual(minX + width);
      expect(y).toBeGreaterThanOrEqual(minY);
      expect(y).toBeLessThanOrEqual(minY + height);
    }
  });

  it('fura as crateras na pedra em vez de pintá-las por cima', () => {
    // Sem selo não há cor de fundo para pintar cratera: elas têm que vazar.
    const { container } = render(<OsgWorkLoader />);

    const rock = container.querySelector('[fill-rule="evenodd"]')!;
    expect(rock).not.toBeNull();
    // Um subpath para o disco e um para cada cratera.
    expect(rock.getAttribute('d')!.match(/M /g)).toHaveLength(OSG_CRATERS.length + 1);
    expect(container.querySelectorAll('mask, clipPath')).toHaveLength(0);
  });

  it('liga as seis animações do ciclo e todas param em reduced-motion', () => {
    const { container } = render(<OsgWorkLoader />);

    for (const name of ANIMATIONS) {
      expect(container.querySelectorAll(`.animate-${name}`), name).toHaveLength(1);
    }
    expect(container.querySelectorAll('.motion-reduce\\:animate-none')).toHaveLength(
      ANIMATIONS.length,
    );
  });

  it('gira quadril e joelho em torno das juntas medidas', () => {
    const { container } = render(<OsgWorkLoader />);

    for (const [joints, hipClass, kneeClass] of [
      [OSG_LEGS.rear, 'osg-sisyphus-hip-rear', 'osg-sisyphus-knee-rear'],
      [OSG_LEGS.front, 'osg-sisyphus-hip-front', 'osg-sisyphus-knee-front'],
    ] as const) {
      for (const [joint, className] of [
        [joints.hip, hipClass],
        [joints.knee, kneeClass],
      ] as const) {
        const spinner = container.querySelector(`.animate-${className}`) as SVGElement;
        // transform-origin em px dentro de um grupo escalado é ambíguo entre
        // navegadores: o eixo vem dos translates em volta, com origem em 0 0.
        expect((spinner as unknown as HTMLElement).style.transformOrigin).toBe('0 0');
        expect(spinner.parentElement!.getAttribute('transform')).toBe(
          `translate(${joint[0]} ${joint[1]})`,
        );
        expect(spinner.firstElementChild!.getAttribute('transform')).toBe(
          `translate(${-joint[0]} ${-joint[1]})`,
        );
      }
    }
  });

  it('deixa a ladeira fora do sobe-e-desce do corpo', () => {
    const { container } = render(<OsgWorkLoader />);

    const bob = container.querySelector('.animate-osg-sisyphus-bob')!;
    const ramp = container.querySelector(
      `line[x1="${OSG_SCENE.ramp.from[0]}"][stroke-width="${OSG_SCENE.ramp.width}"]`,
    )!;
    expect(ramp).not.toBeNull();
    expect(bob.contains(ramp)).toBe(false);
  });

  it('dispensa clip e id, então duas instâncias não colidem', () => {
    const { container } = render(
      <>
        <OsgWorkLoader />
        <OsgWorkLoader />
      </>,
    );

    expect(container.querySelectorAll('clipPath')).toHaveLength(0);
    expect(container.querySelectorAll('[id]')).toHaveLength(0);
  });

  it('mantém as crateras dentro da pedra em qualquer ângulo', () => {
    for (const crater of OSG_CRATERS) {
      const reach = Math.hypot(crater.dx, crater.dy) + crater.r;
      expect(reach).toBeLessThanOrEqual(OSG_SCENE.rock.r);
    }
  });
});

describe('OsgWorkIcon', () => {
  it('mantém o selo e o glyph estáticos originais', () => {
    const { container } = render(<OsgWorkIcon />);

    const ds = Array.from(container.querySelectorAll('path')).map((path) => path.getAttribute('d'));
    expect(ds.filter((d) => d === OSG_SISYPHUS_PATH)).toHaveLength(2);
    expect(ds.filter((d) => d === OSG_SEAL_HEX_PATH)).toHaveLength(4);
    expect(container.querySelectorAll('[class*="osg-sisyphus-"]')).toHaveLength(0);
  });
});
