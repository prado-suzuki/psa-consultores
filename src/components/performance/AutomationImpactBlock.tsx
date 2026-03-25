import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, TrendingUp, Settings } from 'lucide-react';

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
    </div>
  );
};
