import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface HatchedBarSegment {
  label: string;
  value: number;
  hatched?: boolean;
}

interface HatchedBarProps {
  segments: HatchedBarSegment[];
  height?: number;
  className?: string;
  showLegend?: boolean;
}

/**
 * Rampa de tons da barra: um degrau por segmento, todos derivados do MESMO
 * `--primary` do tema da área, variando só a opacidade sobre o `--card`.
 *
 * É de propósito que não exista uma lista de cores aqui. Este arquivo trazia cinco
 * hexadecimais da rampa teal da Tax, e rampa fixa sai igual em qualquer área: a
 * barra ficava teal mesmo dentro do `OsgLayout`. Derivando de `--primary`, a Tax
 * sai teal, a OSG sai musgo e a próxima área sai no tom dela sem tocar aqui.
 */
const NIVEIS = [1, 0.76, 0.55, 0.36, 0.2];

/** Tom do i-ésimo segmento, já no formato que SVG e CSS aceitam. */
function tomDaArea(indice: number): string {
  return `hsl(var(--primary) / ${NIVEIS[indice % NIVEIS.length]})`;
}

/**
 * Barra horizontal segmentada com padrão de hachuras (waffle-style),
 * inspirada no card de distribuição do dashboard Momentum.
 * Mostra tooltip flutuante apenas no segmento sob o cursor.
 *
 * As cores entram por atributo SVG (`fill`, `stroke`), não por classe do Tailwind
 * — `fill="bg-primary"` não existe. Como o SVG é inline, as custom properties
 * postas no `<html>` pelo layout da área cascateiam até aqui, então
 * `hsl(var(--primary))` resolve sozinho no tema vigente, sem ler nada em runtime.
 */
export function HatchedBar({
  segments,
  height = 56,
  className,
  showLegend = true,
}: HatchedBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const [hovered, setHovered] = useState<number | null>(null);

  const tooltipIdx = hovered;
  const tooltipSeg = tooltipIdx !== null ? segments[tooltipIdx] : null;

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <svg width="100%" height={height} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            {segments.map((_, i) => {
              const tone = tomDaArea(i);
              return (
                <pattern
                  key={`hatch-${i}`}
                  id={`hatch-${i}`}
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" fill={tone} />
                  {/* O risco da hachura é a própria superfície do card, não branco
                      fixo: na OSG o card é areia, não branco. */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="hsl(var(--card))"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                </pattern>
              );
            })}
          </defs>

          {(() => {
            let xCursor = 0;
            const totalWidth = 100;
            return segments.map((seg, i) => {
              const widthPct = (seg.value / total) * totalWidth;
              const fill = seg.hatched ? `url(#hatch-${i})` : tomDaArea(i);
              const x = xCursor;
              xCursor += widthPct;
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={`${x}%`}
                    y="6"
                    width={`${widthPct}%`}
                    height={height - 12}
                    rx="6"
                    ry="6"
                    fill={fill}
                    stroke="hsl(var(--card))"
                    strokeWidth="2"
                  />
                </g>
              );
            });
          })()}
        </svg>

        {/* Tooltip flutuante sobre segmento hovered */}
        {tooltipSeg && tooltipIdx !== null && tooltipSeg.value > 0 && (
          <div
            className="absolute -top-9 px-3 py-1.5 bg-foreground text-background rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              left: `${(() => {
                let acc = 0;
                for (let i = 0; i < tooltipIdx; i++) acc += (segments[i].value / total) * 100;
                acc += ((tooltipSeg.value / total) * 100) / 2;
                return Math.min(Math.max(acc, 8), 92);
              })()}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] font-medium opacity-80">{tooltipSeg.label}</div>
            <div className="text-sm font-semibold tabular-nums">
              {tooltipSeg.value.toLocaleString('pt-BR')}
            </div>
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                // A seta acompanha o `bg-foreground` do balão em qualquer tema.
                borderTop: '5px solid hsl(var(--foreground))',
              }}
            />
          </div>
        )}
      </div>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {segments.map((seg, i) => {
            const pct = ((seg.value / total) * 100).toFixed(1);
            const tone = tomDaArea(i);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{
                    background: seg.hatched
                      ? `repeating-linear-gradient(45deg, ${tone}, ${tone} 2px, hsl(var(--card)) 2px, hsl(var(--card)) 3px)`
                      : tone,
                  }}
                />
                <span className="text-[11px] text-muted-foreground">
                  {seg.label} <span className="text-muted-foreground">{pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
