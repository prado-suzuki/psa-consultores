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
  /** Cor base teal — pode ser sobrescrita */
  baseColor?: string;
}

/**
 * Barra horizontal segmentada com padrão de hachuras (waffle-style),
 * inspirada no card de distribuição do dashboard Momentum.
 * Mostra tooltip flutuante no segmento dominante.
 */
export function HatchedBar({
  segments,
  height = 56,
  className,
  showLegend = true,
  baseColor = '#0d9488',
}: HatchedBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const [hovered, setHovered] = useState<number | null>(null);

  // Variantes de tom (do mais saturado ao mais claro)
  const tones = [baseColor, '#14b8a6', '#5eead4', '#99f6e4', '#ccfbf1'];

  // Determine dominant segment for default tooltip
  const dominantIdx = segments
    .map((s, i) => ({ i, v: s.value }))
    .sort((a, b) => b.v - a.v)[0]?.i ?? 0;

  const tooltipIdx = hovered ?? dominantIdx;
  const tooltipSeg = segments[tooltipIdx];

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <svg width="100%" height={height} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            {segments.map((_, i) => {
              const tone = tones[i % tones.length];
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
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                </pattern>
              );
            })}
          </defs>

          {(() => {
            let xCursor = 0;
            const totalWidth = 100;
            return segments.map((seg, i) => {
              const widthPct = (seg.value / total) * totalWidth;
              const fill = seg.hatched ? `url(#hatch-${i})` : tones[i % tones.length];
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
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              );
            });
          })()}
        </svg>

        {/* Tooltip flutuante sobre segmento dominante / hovered */}
        {tooltipSeg && tooltipSeg.value > 0 && (
          <div
            className="absolute -top-9 px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
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
                borderTop: '5px solid #0f172a',
              }}
            />
          </div>
        )}
      </div>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {segments.map((seg, i) => {
            const pct = ((seg.value / total) * 100).toFixed(1);
            const tone = tones[i % tones.length];
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{
                    background: seg.hatched
                      ? `repeating-linear-gradient(45deg, ${tone}, ${tone} 2px, #fff 2px, #fff 3px)`
                      : tone,
                  }}
                />
                <span className="text-[11px] text-slate-600">
                  {seg.label} <span className="text-slate-400">{pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
