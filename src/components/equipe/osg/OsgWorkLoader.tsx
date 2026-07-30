import React from 'react';

import {
  OSG_CRATERS,
  OSG_FIGURE_VIEWBOX,
  OSG_HIP_DISCS,
  OSG_LEGS,
  OSG_SCENE,
  type OsgBone,
  type OsgLegJoints,
  type OsgPoint,
} from '@/components/equipe/osg/osgWorkGlyph';
import { cn } from '@/lib/utils';

interface OsgWorkLoaderProps {
  /** Lado do quadrado do loader, em px. Default 64. */
  size?: number;
  /**
   * Classes extras — normalmente só layout (margem, alinhamento). A cor da figura
   * vem de `currentColor` sobre a classe base abaixo; passar uma `text-*` aqui
   * sobrescreve a cor base (twMerge resolve o conflito).
   */
  className?: string;
  /** Texto lido por leitores de tela. */
  label?: string;
}

/**
 * Cor base — mesclada com a `className` do call site, não trocada por ela.
 *
 * O navy é o MESMO do fundo do selo hexagonal (`OsgWorkIcon`), então o loader e o
 * ícone da navegação são a mesma tinta, com a figura invertida: no selo ela é o
 * vazio branco sobre o navy, aqui é o navy sobre a página. No escuro esse navy
 * desapareceria no fundo, então vira quase-branco, como faz o `TaxLoader`.
 */
const OSG_LOADER_COLOR = 'text-[#141a36] dark:text-slate-200';

/** Círculo como subpath, para furar a pedra com `fill-rule: evenodd`. */
const circlePath = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

/**
 * A pedra e suas crateras num path só, com as crateras viradas BURACO.
 *
 * Sem o selo por trás não existe cor de fundo para pintar cratera em cima: elas
 * têm que vazar. Um path com `evenodd` resolve sem `mask` nem id — e girar o path
 * inteiro é seguro porque o disco é um círculo, logo invariante ao giro. Só as
 * crateras se mexem, que é exatamente o que faz a pedra rolar.
 */
const ROCK_PATH = [
  circlePath(OSG_SCENE.rock.cx, OSG_SCENE.rock.cy, OSG_SCENE.rock.r),
  ...OSG_CRATERS.map((crater) =>
    circlePath(OSG_SCENE.rock.cx + crater.dx, OSG_SCENE.rock.cy + crater.dy, crater.r),
  ),
].join(' ');

/** Osso: traço de ponta redonda. Herda a cor do grupo. */
const Bone: React.FC<OsgBone> = ({ from, to, width }) => (
  <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} strokeWidth={width} strokeLinecap="round" />
);

/**
 * Giro em torno de um ponto, animado por classe.
 *
 * O eixo vem dos dois translates em volta, e não de `transform-origin` em px:
 * px em `transform-origin` dentro de SVG resolve diferente entre navegadores.
 * Com `0 0` não há ambiguidade — a origem local já foi levada ao ponto pelo
 * translate de fora.
 */
const Pivot: React.FC<{
  at: OsgPoint;
  animationClass: string;
  children: React.ReactNode;
}> = ({ at: [x, y], animationClass, children }) => (
  <g transform={`translate(${x} ${y})`}>
    <g
      className={`${animationClass} motion-reduce:animate-none`}
      style={{ transformOrigin: '0 0' }}
    >
      <g transform={`translate(${-x} ${-y})`}>{children}</g>
    </g>
  </g>
);

/** Coxa e canela, girando no quadril e no joelho. O joelho é aninhado no quadril. */
const Leg: React.FC<{
  joints: OsgLegJoints;
  hipClass: string;
  kneeClass: string;
}> = ({ joints, hipClass, kneeClass }) => (
  <Pivot at={joints.hip} animationClass={hipClass}>
    <Bone from={joints.hip} to={joints.knee} width={OSG_SCENE.legWidth} />
    <Pivot at={joints.knee} animationClass={kneeClass}>
      <Bone from={joints.knee} to={joints.ankle} width={OSG_SCENE.legWidth} />
    </Pivot>
  </Pivot>
);

/** Bacia, tronco, braço e cabeça: tudo que não articula. */
const Torso: React.FC = () => (
  <>
    <Bone {...OSG_SCENE.pelvis} />
    {OSG_HIP_DISCS.map((disc) => (
      <circle key={`${disc.cx}-${disc.cy}`} cx={disc.cx} cy={disc.cy} r={disc.r} stroke="none" />
    ))}
    <path d={OSG_SCENE.torso} stroke="none" />
    <Bone {...OSG_SCENE.arm} />
    <circle cx={OSG_SCENE.head.cx} cy={OSG_SCENE.head.cy} r={OSG_SCENE.head.r} stroke="none" />
  </>
);

/**
 * Loader da área OSG: o Sísifo do `OsgWorkIcon` sobe a ladeira sem sair do lugar.
 *
 * SEM O SELO HEXAGONAL, de propósito, e pintado com `currentColor` — igual ao
 * `TaxLoader`. É o que o contrato do `AreaLoaderGlyphProps` exige, e por um motivo
 * prático: o selo é um crachá opaco de cor própria, que a 16-20px (spinner dentro
 * de botão, ao lado de texto) vira uma mancha navy ilegível. O selo continua sendo
 * do ícone estático, que vive a 40px+ na navegação.
 *
 * A cena é a MESMA do ícone, mas remontada em peças (`OSG_SCENE`, `OSG_LEGS`) para
 * que quadril e joelho girem de verdade — o path do potrace do ícone é um contorno
 * fundido e não tem perna para articular.
 *
 * O MOVIMENTO NÃO É O QUADRIL GIRANDO À SORTE. Os ângulos dos keyframes
 * `osg-sisyphus-hip-*` / `osg-sisyphus-knee-*` saíram de cinemática inversa: para
 * cada instante do ciclo definiu-se ONDE O PÉ DEVE ESTAR — colado na ladeira
 * durante o apoio, descrevendo um arco no ar durante a recuperação — e resolveu-se
 * o par de ângulos que leva o tornozelo até lá. Sem isso o pé sai da rampa e
 * flutua, porque girar o quadril arrasta o pé num arco, não ao longo do aclive.
 * Mexer num ângulo à mão desfaz essa garantia: refaça a conta.
 *
 * O ciclo é de 1 s (duas passadas) e fecha sem emenda — os valores em 0% e 100%
 * das quatro trilhas são idênticos, e nada se desloca, então não há volta ao ponto
 * de partida para disfarçar. O sobe-e-desce do corpo tem meio ciclo (um por passo)
 * e NÃO se aplica à rampa; os pés não sobem com ele porque a cinemática inversa
 * já contou o quadril deslocado.
 *
 * Não usa `clipPath` nem id nenhum: as peças são todas da mesma cor (sobreposição
 * não deixa emenda) e as crateras furam a pedra por `evenodd`. Duas instâncias na
 * mesma tela não têm o que colidir.
 *
 * Com `prefers-reduced-motion` tudo para e a cena assenta numa pose de pé.
 */
const OsgWorkLoader: React.FC<OsgWorkLoaderProps> = ({
  size = 64,
  className,
  label = 'Carregando',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={OSG_FIGURE_VIEWBOX}
      width={size}
      height={size}
      role="status"
      aria-label={label}
      className={cn('inline-block shrink-0', OSG_LOADER_COLOR, className)}
      fill="currentColor"
      stroke="currentColor"
    >
      {/* Sobe-e-desce: pega figura e pedra, nunca a ladeira. */}
      <g className="animate-osg-sisyphus-bob motion-reduce:animate-none">
        <Leg
          joints={OSG_LEGS.rear}
          hipClass="animate-osg-sisyphus-hip-rear"
          kneeClass="animate-osg-sisyphus-knee-rear"
        />
        <Torso />
        <Leg
          joints={OSG_LEGS.front}
          hipClass="animate-osg-sisyphus-hip-front"
          kneeClass="animate-osg-sisyphus-knee-front"
        />
        <Pivot
          at={[OSG_SCENE.rock.cx, OSG_SCENE.rock.cy]}
          animationClass="animate-osg-sisyphus-roll"
        >
          <path d={ROCK_PATH} fillRule="evenodd" stroke="none" />
        </Pivot>
      </g>

      {/* A ladeira por cima: o pé pode afundar na faixa dela sem aparecer. */}
      <Bone {...OSG_SCENE.ramp} />
    </svg>
  );
};

export default OsgWorkLoader;
