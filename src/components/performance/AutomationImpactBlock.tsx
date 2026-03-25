import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, TrendingUp, Settings } from 'lucide-react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  roiData: any[];
  isLoading: boolean;
}

export const AutomationImpactBlock = ({ roiData, isLoading }: Props) => {
  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  if (roiData.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impacto das Automações</h2>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p>Dados de ROI serão exibidos conforme as automações forem ativadas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSavings = roiData.reduce((a, r) => a + (r.annual_savings || 0), 0);
  const avgRoi = roiData.length > 0 ? Math.round(roiData.reduce((a, r) => a + (r.roi_percentage || 0), 0) / roiData.length) : 0;

  // Build cumulative ROI chart data by month
  const now = new Date();
  const months: { start: Date; end: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i);
    months.push({
      start: startOfMonth(m),
      end: endOfMonth(m),
      label: format(m, 'MMM', { locale: ptBR }),
    });
  }

  let cumulative = 0;
  const chartData = months.map(m => {
    const monthSavings = roiData.reduce((acc, r) => {
      const createdAt = r.created_at ? parseISO(r.created_at) : null;
      if (createdAt && isWithinInterval(createdAt, { start: m.start, end: m.end })) {
        return acc + (r.annual_savings || 0) / 12;
      }
      // If created before this month, it contributes monthly savings
      if (createdAt && createdAt < m.start) {
        return acc + (r.annual_savings || 0) / 12;
      }
      return acc;
    }, 0);
    cumulative += monthSavings;
    return { month: m.label, acumulado: Math.round(cumulative) };
  });

  const hasChartData = chartData.length >= 2 && chartData.some(d => d.acumulado > 0);
  const projectedTarget = totalSavings > 0 ? Math.round(totalSavings / 2) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impacto das Automações</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">R$ {totalSavings.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">Economia total gerada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{avgRoi}%</p>
            <p className="text-xs text-muted-foreground">ROI médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Settings className="h-5 w-5 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{roiData.length}</p>
            <p className="text-xs text-muted-foreground">Automações ativas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead className="text-right">Economia (R$/ano)</TableHead>
              <TableHead className="text-right">ROI (%)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roiData.map((r: any, i: number) => (
              <TableRow key={r.id || i}>
                <TableCell className="font-medium">{r.description || r.title || `Automação ${i + 1}`}</TableCell>
                <TableCell className="text-right">{(r.annual_savings || 0).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right">{r.roi_percentage || 0}%</TableCell>
                <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {hasChartData && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">ROI acumulado — últimos 6 meses</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Acumulado']} />
                  <Area type="monotone" dataKey="acumulado" stroke="#10B981" strokeWidth={2} fill="url(#roiGradient)" />
                  {projectedTarget && (
                    <ReferenceLine y={projectedTarget} stroke="#6B7280" strokeDasharray="5 5" label={{ value: 'Meta projetada', position: 'right', fontSize: 11, fill: '#6B7280' }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
