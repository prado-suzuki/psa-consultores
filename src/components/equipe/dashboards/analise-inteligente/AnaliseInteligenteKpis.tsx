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
            <Gauge className="h-4 w-4 text-teal-600" />
            <span className="text-xs text-slate-500">Saúde</span>
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {kpis.score}
            <span className="text-sm text-slate-400">/100</span>
          </div>
          <Progress value={kpis.score} className="h-1 mt-2" />
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-4 w-4 text-teal-600" />
            <span className="text-xs text-slate-500">Taxa Entrega</span>
          </div>
          <div className="text-2xl font-bold text-teal-700">{kpis.rate}%</div>
          <p className="text-xs text-slate-400 mt-1">
            {kpis.completed}/{kpis.totalDel}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-slate-500">Atrasados</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{kpis.overdue}</div>
          <p className="text-xs text-slate-400 mt-1">itens vencidos</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-500">Bloqueios</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{kpis.blockers}</div>
          <p className="text-xs text-slate-400 mt-1">em {kpis.totalDailys} dailys</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-slate-500">Scope Creep</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{kpis.scopeCreep}</div>
          <p className="text-xs text-slate-400 mt-1">fora do planejado</p>
        </CardContent>
      </Card>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-4 w-4 text-red-500" />
            <span className="text-xs text-slate-500">Gasto Extra</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{extraCostLabel}</div>
          <p className="text-xs text-slate-400 mt-1">estimado</p>
        </CardContent>
      </Card>
    </div>
  );
}
