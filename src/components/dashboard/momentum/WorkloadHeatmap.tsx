import { cn } from '@/lib/utils';

export interface HeatmapRow {
  /** Label exibido no eixo Y (ex: nome ou iniciais do membro) */
  label: string;
  /** Valores diários — array de números (intensidade) */
  cells: number[];
}

interface WorkloadHeatmapProps {
  rows: HeatmapRow[];
  /** Labels do eixo X (ex: dias do mês ['18', '19', ...]) */
  columnLabels: string[];
  /** Valor que representa "Fully Occupied" (100%) — define a escala */
  maxValue?: number;
  className?: string;
  showLegend?: boolean;
  /** Cor base teal para o gradiente */
  baseColor?: string;
}

/**
 * Heatmap matricial estilo "GitHub contribution graph".
 * Eixo Y = membros/recursos, Eixo X = dias.
 * Células com gradiente de intensidade em 4 tons da cor base.
 */
export function WorkloadHeatmap({
  rows,
  columnLabels,
  maxValue,
  className,
  showLegend = true,
  baseColor = '#0d9488',
}: WorkloadHeatmapProps) {
  const computedMax =
    maxValue ??
    Math.max(1, ...rows.flatMap(r => r.cells));

  const tones = [
    '#f1f5f9', // empty/Low (gray)
    '#99f6e4', // teal-200
    '#5eead4', // teal-300
    '#14b8a6', // teal-500
    baseColor, // teal-600 (Fully Occupied)
  ];

  const intensity = (v: number): number => {
    if (v <= 0) return 0;
    const ratio = v / computedMax;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.85) return 3;
    return 4;
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="w-12" />
              {columnLabels.map((d, i) => (
                <th
                  key={i}
                  className="text-[10px] font-medium text-slate-400 px-0.5 text-center min-w-[18px]"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="text-[10px] font-semibold text-slate-600 pr-2 text-right uppercase tracking-wide">
                  {row.label}
                </td>
                {row.cells.map((cell, cIdx) => {
                  const lvl = intensity(cell);
                  return (
                    <td key={cIdx}>
                      <div
                        className="h-5 w-5 rounded-[3px] transition-transform hover:scale-110 cursor-default"
                        style={{ background: tones[lvl] }}
                        title={`${row.label} · ${columnLabels[cIdx]}: ${cell.toFixed(1)}h`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLegend && (
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-500">
          <span>Low</span>
          {tones.slice(1).map((t, i) => (
            <span key={i} className="h-3 w-3 rounded-sm" style={{ background: t }} />
          ))}
          <span>Fully Occupied</span>
        </div>
      )}
    </div>
  );
}
