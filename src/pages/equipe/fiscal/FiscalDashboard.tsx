import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const FiscalDashboard = () => {
  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área fiscal">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total de Pacotes</CardTitle>
              <Package className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">24</div>
              <p className="text-xs text-slate-500">+3 esta semana</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">12</div>
              <p className="text-xs text-slate-500">50% do total</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">8</div>
              <p className="text-xs text-slate-500">Este mês</p>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">2</div>
              <p className="text-xs text-slate-500">Requer atenção</p>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder para gráficos futuros */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900">Pacotes por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">Gráfico em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">Timeline em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FiscalLayout>
  );
};

export default FiscalDashboard;
