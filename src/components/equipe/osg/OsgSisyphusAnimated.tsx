import React, { useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/utils';

interface OsgSisyphusAnimatedProps {
  /** Largura da cena, em px. A altura acompanha o viewBox. */
  size?: number;
  className?: string;
  /** Texto lido por leitores de tela. */
  label?: string;
  paused?: boolean;
}

const STEP_DURATION = '1.6s';
const STEP_TIMES = '0; 0.25; 0.5; 0.75; 1';
const STEP_SPLINES = '0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1';

// Cinco poses por passada. Cada perna mantém quatro pontos anatômicos na mesma
// ordem: quadril, joelho, tornozelo e ponta do pé.
const REAR_LEG_POSES = [
  'M204 173 L181 215 L157 263 L139 272',
  'M204 173 L194 207 L181 240 L166 248',
  'M204 173 L230 187 L235 218 L256 208',
  'M204 173 L214 204 L204 234 L224 224',
  'M204 173 L181 215 L157 263 L139 272',
].join('; ');

const FRONT_LEG_POSES = [
  'M211 173 L239 187 L237 218 L258 208',
  'M211 173 L220 202 L207 234 L227 224',
  'M211 173 L185 215 L160 263 L142 272',
  'M211 173 L197 207 L184 240 L169 248',
  'M211 173 L239 187 L237 218 L258 208',
].join('; ');

const OsgSisyphusAnimated: React.FC<OsgSisyphusAnimatedProps> = ({
  size = 128,
  className,
  label = 'Carregando',
  paused = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const rockClipId = `osg-sisyphus-rock-${uid}`;
  const rampGradientId = `osg-sisyphus-ramp-${uid}`;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const syncPlayback = () => {
      if (!svg.pauseAnimations || !svg.unpauseAnimations) return;
      if (paused || reducedMotion?.matches) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };

    syncPlayback();
    reducedMotion?.addEventListener('change', syncPlayback);
    return () => reducedMotion?.removeEventListener('change', syncPlayback);
  }, [paused]);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 360"
      width={size}
      height={(size * 360) / 512}
      role="status"
      aria-label={label}
      className={cn('inline-block shrink-0', className)}
      data-testid="osg-sisyphus"
    >
      <defs>
        <clipPath id={rockClipId}>
          <circle cx="367" cy="99" r="63" />
        </clipPath>
        <linearGradient id={rampGradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8b633f" />
          <stop offset="1" stopColor="#c49a6c" />
        </linearGradient>
      </defs>

      {/* A ladeira não participa da animação: os pés se reposicionam sobre ela. */}
      <path
        d="M 32 330 L 480 106"
        fill="none"
        stroke="#141a36"
        strokeWidth="17"
        strokeLinecap="round"
        opacity="0.14"
        transform="translate(0 7)"
      />
      <path
        data-part="ramp"
        d="M 32 330 L 480 106"
        fill="none"
        stroke={`url(#${rampGradientId})`}
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* O contorno da pedra fica parado; as marcas internas tornam o giro visível. */}
      <circle cx="367" cy="99" r="65" fill="#141a36" opacity="0.15" transform="translate(3 5)" />
      <circle data-part="rock" cx="367" cy="99" r="63" fill="#141a36" />
      <g clipPath={`url(#${rockClipId})`}>
        <g className="osg-sisyphus-rock-detail" data-part="rock-detail">
          <path
            d="M329 67 L341 58 L353 63"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.12"
          />
          <circle cx="341" cy="83" r="11" fill="#c49a6c" opacity="0.72" />
          <circle cx="396" cy="73" r="8" fill="#c49a6c" opacity="0.58" />
          <circle cx="383" cy="126" r="14" fill="#c49a6c" opacity="0.5" />
          <circle cx="331" cy="126" r="6" fill="#c49a6c" opacity="0.62" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 367 99"
            to="360 367 99"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </g>
      </g>

      <g data-part="human">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 2; 0 0; 0 2; 0 0"
          keyTimes={STEP_TIMES}
          dur={STEP_DURATION}
          repeatCount="indefinite"
        />

        {/* Perna posterior: passa de apoio estendido para busca de apoio acima. */}
        <path
          className="osg-sisyphus-rear-leg"
          data-part="rear-leg"
          d="M204 173 L181 215 L157 263 L139 272"
          fill="none"
          stroke="#141a36"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.58"
        >
          <animate
            attributeName="d"
            values={REAR_LEG_POSES}
            keyTimes={STEP_TIMES}
            keySplines={STEP_SPLINES}
            calcMode="spline"
            dur={STEP_DURATION}
            repeatCount="indefinite"
          />
        </path>

        {/* Tronco alto: o esforço vem da inclinação, não de deitar sobre a rampa. */}
        <g className="osg-sisyphus-body" data-part="body" fill="#141a36">
          <path d="M191 177 C194 151 207 125 226 106 C236 96 251 100 255 112 C259 124 249 138 238 150 L220 179 Z" />
          <path d="M204 107 C193 100 187 88 191 76 C195 63 208 55 222 59 C235 63 243 76 239 89 C235 102 221 110 204 107 Z" />
          <path
            d="M193 77 C199 61 215 54 229 61 C235 64 240 70 242 78 C227 70 211 70 193 77 Z"
            opacity="0.9"
          />
          <path d="M191 169 C182 179 184 190 195 194 C206 198 217 190 220 177 Z" />
        </g>

        {/* Braços com cotovelos visíveis e mãos apoiadas em dois pontos da pedra. */}
        <g
          className="osg-sisyphus-arms"
          data-part="arms"
          fill="none"
          stroke="#141a36"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M232 111 L269 105 L305 86" strokeWidth="15" opacity="0.68" />
          <path d="M238 121 L271 131 L306 116" strokeWidth="17" />
          <circle cx="305" cy="86" r="8" fill="#141a36" stroke="none" />
          <circle cx="306" cy="116" r="9" fill="#141a36" stroke="none" />
        </g>

        {/* Perna dianteira em contrafase: quando uma sustenta, a outra avança. */}
        <path
          className="osg-sisyphus-front-leg"
          data-part="front-leg"
          d="M211 173 L239 187 L237 218 L258 208"
          fill="none"
          stroke="#141a36"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animate
            attributeName="d"
            values={FRONT_LEG_POSES}
            keyTimes={STEP_TIMES}
            keySplines={STEP_SPLINES}
            calcMode="spline"
            dur={STEP_DURATION}
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
};

export default OsgSisyphusAnimated;
