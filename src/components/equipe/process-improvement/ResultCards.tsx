import type { DomainProcessRoiResults } from '@/hooks/useDomainProcessImprovement';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface PreviewCardProps {
  baselineHours: number;
  improvedHours: number;
  savingsMonthly: number;
  savingsPercent: number;
}

export function PreviewCard({ baselineHours, improvedHours, savingsMonthly, savingsPercent }: PreviewCardProps) {
  const savedHours = baselineHours - improvedHours;
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-primary">Prévia dos Resultados</h4>
          <p className="text-xs text-muted-foreground">Os dados de "DEPOIS" serão salvos como novo baseline</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold text-primary">{savedHours}h</p><p className="text-xs text-muted-foreground">Horas economizadas/mês</p></div>
          <div><p className="text-2xl font-bold text-green-600">R$ {savingsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Economia mensal</p></div>
          <div><p className="text-2xl font-bold text-green-600">{savingsPercent.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Redução de custo</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{(savedHours / 176).toFixed(2)}</p><p className="text-xs text-muted-foreground">FTE liberados</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RoiResultCard({ results }: { results: DomainProcessRoiResults }) {
  return (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="pt-4">
        <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />ROI Calculado</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold">{results.time_saved_hours?.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Economia de tempo/mês</p></div>
          <div><p className="text-2xl font-bold text-green-600">R$ {results.cost_saved_monthly?.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Economia mensal</p></div>
          <div><p className="text-2xl font-bold text-primary">{results.roi_percentage?.toFixed(0)}%</p><p className="text-xs text-muted-foreground">ROI anual</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{results.payback_months?.toFixed(1)} meses</p><p className="text-xs text-muted-foreground">Payback</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
