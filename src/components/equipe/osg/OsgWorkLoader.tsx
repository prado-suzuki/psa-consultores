import React, { useId } from 'react';
import {
  OSG_LEGS,
  OSG_ROCK,
  OSG_SEAL_HEX_PATH,
  OSG_SEAL_INNER_PATH,
  OSG_SISYPHUS_PATH,
  OSG_SISYPHUS_TRANSFORM,
} from '@/components/equipe/osg/osgWorkGlyph';
import { cn } from '@/lib/utils';

interface OsgWorkLoaderProps {
  /** Lado do quadrado do loader, em px. Default 64. */
  size?: number;
  /** Classes extras — layout, normalmente. O selo tem cores próprias. */
  className?: string;
  /** Texto lido por leitores de tela. */
  label?: string;
}

// Cores do selo, iguais às do OsgWorkIcon.
const SEAL_FILL = '#141a36';
const SEAL_SHADOW = '#0a1024';
const SEAL_EDGE = '#c49a6c';
const SISYPHUS_FILL = '#ffffff';

// Crateras da pedra: navy do selo sobre o disco branco, em posições assimétricas
// para o giro ficar legível. Sem elas a pedra é um círculo e rodar não aparece.
const CRATERS = [
  { cx: 292.4, cy: 199.7, r: 12 },
  { cx: 336.1, cy: 187.9, r: 8 },
  { cx: 318.8, cy: 239.7, r: 6 },
];

/** O contorno inteiro do Sísifo. Cada peça da cena o desenha e recorta a sua parte. */
const Glyph: React.FC = () => (
  <g transform={OSG_SISYPHUS_TRANSFORM} fill={SISYPHUS_FILL}>
    <path d={OSG_SISYPHUS_PATH} />
  </g>
);

/**
 * Uma perna: o contorno recortado na região dela e girado no quadril.
 *
 * O eixo do giro vem dos dois translates em volta — com `transform-origin: 0 0` o
 * giro acontece na origem local, que o translate externo levou para o quadril.
 * (`transform-origin` em px dentro de um grupo já escalado resolveria diferente
 * entre navegadores; 0 0 não tem essa ambiguidade.)
 */
const Leg: React.FC<{
  pivotX: number;
  pivotY: number;
  clipId: string;
  groundClipId: string;
  animationClass: string;
}> = ({ pivotX, pivotY, clipId, groundClipId, animationClass }) => (
  <g transform={`translate(${pivotX} ${pivotY})`}>
    <g
      className={`${animationClass} motion-reduce:animate-none`}
      style={{ transformOrigin: '0 0' }}
    >
      <g transform={`translate(${-pivotX} ${-pivotY})`}>
        {/* Corte do chão ANTES do giro (tira o fio de rampa que gira junto) e de
            novo depois, no grupo de fora (planta a sola). */}
        <g clipPath={`url(#${groundClipId})`}>
          <g clipPath={`url(#${clipId})`}>
            <Glyph />
          </g>
        </g>
      </g>
    </g>
  </g>
);

/**
 * Loader da área OSG Work: o Sísifo do ícone empurra a pedra sem sair do lugar —
 * as pernas dão passada (2s) e a pedra gira (uma volta a cada 6s). Por não haver
 * deslocamento, o loop não tem emenda: nada precisa voltar ao ponto de partida.
 *
 * A figura fica exatamente na posição e no tamanho do ícone, e a ladeira que
 * aparece é a do próprio glyph. As pernas são recortadas do mesmo contorno e giram
 * no quadril; as crateras giram recortadas no disco da pedra. O porquê de cada
 * manha está em `osgWorkGlyph`.
 *
 * Com `prefers-reduced-motion` tudo para e a cena assenta no ícone estático.
 */
const OsgWorkLoader: React.FC<OsgWorkLoaderProps> = ({
  size = 64,
  className,
  label = 'Carregando',
}) => {
  // Um id por instância — dois loaders na mesma tela não podem colidir os clips.
  const uid = useId().replace(/:/g, '');
  const hexClip = `osg-loader-hex-${uid}`;
  const rockClip = `osg-loader-rock-${uid}`;
  const groundClip = `osg-loader-ground-${uid}`;
  const groundInnerClip = `osg-loader-ground-in-${uid}`;
  const bodyClip = `osg-loader-body-${uid}`;
  const rearLegClip = `osg-loader-leg-rear-${uid}`;
  const frontLegClip = `osg-loader-leg-front-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="status"
      aria-label={label}
      className={cn('inline-block shrink-0', className)}
    >
      <defs>
        <clipPath id={hexClip}>
          <path d={OSG_SEAL_HEX_PATH} />
        </clipPath>
        <clipPath id={rockClip}>
          <circle cx={OSG_ROCK.cx} cy={OSG_ROCK.cy} r={OSG_ROCK.clipR} />
        </clipPath>
        <clipPath id={groundClip}>
          <polygon points={OSG_LEGS.groundPolygon} />
        </clipPath>
        <clipPath id={groundInnerClip}>
          <polygon points={OSG_LEGS.groundPolygonInner} />
        </clipPath>
        {/* Clip do tronco = união dos dois polígonos: o contorno com o vão das
            pernas recortado, mais a faixa da rampa que passa dentro desse vão. */}
        <clipPath id={bodyClip}>
          <polygon points={OSG_LEGS.bodyPolygon} />
          <polygon points={OSG_LEGS.rampPolygon} />
        </clipPath>
        <clipPath id={rearLegClip}>
          <polygon points={OSG_LEGS.rear.polygon} />
        </clipPath>
        <clipPath id={frontLegClip}>
          <polygon points={OSG_LEGS.front.polygon} />
        </clipPath>
      </defs>

      <path d={OSG_SEAL_HEX_PATH} fill={SEAL_SHADOW} opacity="0.2" transform="translate(0, 5)" />
      <path
        d={OSG_SEAL_HEX_PATH}
        fill={SEAL_FILL}
        stroke={SEAL_EDGE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Clip do selo por garantia: nada da cena deveria passar da borda, mas uma
          perna girada não pode vazar o hexágono se um dia o ângulo crescer. */}
      <g clipPath={`url(#${hexClip})`}>
        {/* Tronco, cabeça, braço, pedra e a ladeira: tudo menos as pernas. Parado. */}
        <g clipPath={`url(#${bodyClip})`}>
          <Glyph />
        </g>

        {/* As pernas, recortadas do MESMO contorno e giradas no quadril. O clip do
            chão fica por fora do giro: é ele que planta o pé (girando para frente o
            pé afunda e é cortado) e o solta (girando para trás sobe). */}
        <g clipPath={`url(#${groundClip})`}>
          <Leg
            pivotX={OSG_LEGS.rear.pivotX}
            pivotY={OSG_LEGS.rear.pivotY}
            clipId={rearLegClip}
            groundClipId={groundInnerClip}
            animationClass="animate-osg-sisyphus-leg-rear"
          />
          <Leg
            pivotX={OSG_LEGS.front.pivotX}
            pivotY={OSG_LEGS.front.pivotY}
            clipId={frontLegClip}
            groundClipId={groundInnerClip}
            animationClass="animate-osg-sisyphus-leg-front"
          />
        </g>

        <g clipPath={`url(#${rockClip})`}>
          <g
            className="animate-osg-sisyphus-roll motion-reduce:animate-none"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            fill={SEAL_FILL}
            opacity="0.3"
          >
            {/* Círculo sem pintura: não aparece, mas centra a caixa do grupo no
                disco, e é dela que sai o eixo do giro (fill-box + center). */}
            <circle cx={OSG_ROCK.cx} cy={OSG_ROCK.cy} r={OSG_ROCK.clipR} fill="none" />
            {CRATERS.map((c) => (
              <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} />
            ))}
          </g>
        </g>
      </g>

      <path d={OSG_SEAL_INNER_PATH} fill="none" stroke={SEAL_EDGE} strokeWidth="1.5" opacity="0.4" />
      <circle cx="256" cy="40" r="9" fill="#0d9488" opacity="0.12" />
      <circle cx="256" cy="40" r="2.5" fill="#0d9488" opacity="0.5" />
    </svg>
  );
};

export default OsgWorkLoader;
