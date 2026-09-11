import { Activity, AlertTriangle, DollarSign, Gauge, ShieldAlert, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AnaliseInteligenteKpis as AnaliseInteligenteKpisData } from '@/lib/analiseInteligente';

interface AnaliseInteligenteKpisProps {
  kpis: AnaliseInteligenteKpisData;
  scoreColor: string;
  extraCostLabel: string;
}

export function AnaliseInteligenteKpis({
  kpis,
  scoreColor,
  extraCostLabel,
}: AnaliseInteligenteKpisProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Gauge className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Saúde</span>
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {kpis.score}
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <Progress value={kpis.score} className="h-1 mt-2" />
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Taxa Entrega</span>
          </div>
          <div className="text-2xl font-bold text-primary">{kpis.rate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.completed}/{kpis.totalDel}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-4 w-4 text-status-ajuste" />
            <span className="text-xs text-muted-foreground">Atrasados</span>
          </div>
          <div className="text-2xl font-bold text-status-ajuste">{kpis.overdue}</div>
          <p className="text-xs text-muted-foreground mt-1">itens vencidos</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="h-4 w-4 text-status-alerta" />
            <span className="text-xs text-muted-foreground">Bloqueios</span>
          </div>
          <div className="text-2xl font-bold text-status-alerta">{kpis.blockers}</div>
          <p className="text-xs text-muted-foreground mt-1">em {kpis.totalDailys} dailys</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-4 w-4 text-status-alerta" />
            <span className="text-xs text-muted-foreground">Scope Creep</span>
          </div>
          <div className="text-2xl font-bold text-status-alerta">{kpis.scopeCreep}</div>
          <p className="text-xs text-muted-foreground mt-1">fora do planejado</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-4 w-4 text-status-ajuste" />
            <span className="text-xs text-muted-foreground">Gasto Extra</span>
          </div>
          <div className="text-2xl font-bold text-status-ajuste">{extraCostLabel}</div>
          <p className="text-xs text-muted-foreground mt-1">estimado</p>
        </CardContent>
      </Card>
    </div>
  );
}
