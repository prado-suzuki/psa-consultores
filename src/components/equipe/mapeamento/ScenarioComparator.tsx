import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { ProcessScenario } from '@/hooks/useProcessScenarios';

interface ScenarioComparatorProps {
  open: boolean;
  onClose: () => void;
  scenarios: ProcessScenario[];
}

const KIND_LABEL: Record<string, string> = {
  scale: 'Escala',
  efficiency: 'Eficiência',
  investment: 'Investimento',
};

const KIND_COLOR: Record<string, string> = {
  scale: 'bg-blue-100 text-blue-700',
  efficiency: 'bg-amber-100 text-amber-700',
  investment: 'bg-teal-100 text-teal-700',
};

interface MetricRow {
  label: string;
  pick: (s: ProcessScenario) => number | null;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const METRICS: MetricRow[] = [
  {
    label: 'ROI anual',
    pick: s => s.computed_metrics?.roi_percentage ?? null,
    format: v => `${v.toFixed(0)}%`,
    higherIsBetter: true,
  },
  {
    label: 'Economia mensal',
    pick: s => s.computed_metrics?.cost_saved_monthly ?? null,
    format: v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
    higherIsBetter: true,
  },
  {
    label: 'Economia anual',
    pick: s => s.computed_metrics?.annual_savings ?? null,
    format: v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
    higherIsBetter: true,
  },
  {
    label: 'Payback',
    pick: s => s.computed_metrics?.payback_months ?? null,
    format: v => v > 0 ? `${v.toFixed(1)} meses` : '—',
    higherIsBetter: false,
  },
  {
    label: 'Tempo economizado/mês',
    pick: s => s.computed_metrics?.time_saved_hours ?? null,
    format: v => `${v.toFixed(1)}h`,
    higherIsBetter: true,
  },
  {
    label: 'FTE liberado',
    pick: s => s.computed_metrics?.fte_saved ?? null,
    format: v => v.toFixed(2),
    higherIsBetter: true,
  },
  {
    label: 'Custo de implementação',
    pick: s => s.computed_metrics?.implementation_cost ?? null,
    format: v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
    higherIsBetter: false,
  },
];

export function ScenarioComparator({ open, onClose, scenarios }: ScenarioComparatorProps) {
  if (scenarios.length === 0) {
    return null;
  }

  const findBest = (metric: MetricRow): number | null => {
    const values = scenarios
      .map(s => metric.pick(s))
      .filter((v): v is number => v !== null && !isNaN(v));
    if (values.length === 0) return null;
    return metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
  };

  const allSameBasis = scenarios.every(s => s.unit_basis === scenarios[0].unit_basis);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparador de cenários</DialogTitle>
          <DialogDescription>
            {scenarios.length} cenários lado a lado · O melhor valor de cada métrica está destacado em verde.
          </DialogDescription>
        </DialogHeader>

        {!allSameBasis && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ Cenários com bases de cálculo diferentes ({Array.from(new Set(scenarios.map(s => s.unit_basis))).join(', ')}).
            Compare com cautela — os valores podem não ser diretamente equivalentes.
          </div>
        )}

        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))` }}>
          {scenarios.map(s => (
            <Card key={s.id} className="border-2">
              <CardContent className="p-3 space-y-2">
                <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={KIND_COLOR[s.scenario_kind]}>
                    {KIND_LABEL[s.scenario_kind]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.unit_basis === 'per_unit' ? 'por unidade' : s.unit_basis === 'per_year' ? 'anual' : 'mensal'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variável testada: <strong>{s.varied_field}</strong>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Métrica</th>
                {scenarios.map(s => (
                  <th key={s.id} className="text-right p-3 text-xs font-medium text-slate-700 truncate max-w-[200px]">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(metric => {
                const best = findBest(metric);
                return (
                  <tr key={metric.label} className="border-t">
                    <td className="p-3 text-xs text-muted-foreground flex items-center gap-1">
                      {metric.label}
                      {metric.higherIsBetter ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-blue-600" />
                      )}
                    </td>
                    {scenarios.map(s => {
                      const v = metric.pick(s);
                      const isBest = v !== null && best !== null && v === best && scenarios.length > 1;
                      return (
                        <td
                          key={s.id}
                          className={`text-right p-3 font-medium ${
                            isBest ? 'bg-emerald-50 text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {v === null ? '—' : metric.format(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 rounded-md p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3" />
            <span>
              <strong>Como ler:</strong> verde = melhor valor para a métrica. Ícone de subida (↑) = maior é melhor;
              descida (↓) = menor é melhor (ex.: payback e custo de implementação).
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
