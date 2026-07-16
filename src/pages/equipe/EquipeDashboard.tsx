import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import { ImpactDashboard } from '@/components/equipe/ImpactDashboard';
import { DashboardMetrics } from '@/components/equipe/DashboardMetrics';
import { useDomainEquipeDashboard } from '@/hooks/useDomainEquipeDashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { parseDate } from '@/lib/dateUtils';
import { CHART_COLORS, STATUS_CHART_COLORS } from '@/constants/brandColors';

const EquipeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    activeSprint,
    stats,
    myDeliverables,
    areaData,
    isLoading: loading,
  } = useDomainEquipeDashboard(user?.id);
  const [activeTab, setActiveTab] = useState<string>('sprint');

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: 'A Fazer',
      in_progress: 'Em Progresso',
      completed: 'Concluído'
    };
    return labels[status ?? ''] || status;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-0';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-0';
      default: return 'bg-blue-100 text-blue-700 border-0';
    }
  };

  const progressPercent = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const volumeData = [
    { name: 'A Fazer', value: stats.pending, fill: STATUS_CHART_COLORS.pending },
    { name: 'Em Progresso', value: stats.in_progress, fill: STATUS_CHART_COLORS.in_progress },
    { name: 'Concluídas', value: stats.completed, fill: STATUS_CHART_COLORS.completed },
  ];

  return (
    <EquipeLayout 
      title="Dashboard" 
      subtitle="Visão geral do seu trabalho"
    >
      <Tabs defaultValue="sprint" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sprint">Sprint</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="impacto">Impacto Digital</TabsTrigger>
        </TabsList>

        <TabsContent value="sprint">
          {activeSprint ? (
            <Card className="border-border shadow-sm mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{activeSprint.name}</h2>
                    <Badge className="bg-teal-100 text-teal-700 border-0">Ativa</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {parseDate(activeSprint.start_date).toLocaleDateString('pt-BR')} - {parseDate(activeSprint.end_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {activeSprint.goal && (
                  <p className="text-muted-foreground mb-4 text-sm">{activeSprint.goal}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-foreground font-semibold">{progressPercent}%</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm mb-6">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Nenhuma sprint ativa</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/equipe/sprints')}
                >
                  Criar Sprint
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">A Fazer</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Em Progresso</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-primary">{stats.completed}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-base font-semibold">
                  Volume de Entregas por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ className: 'fill-muted-foreground', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} entregas`, 'Quantidade']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {volumeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-base font-semibold">
                  Processos por Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                      {areaData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} processos`, 'Quantidade']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <HorasAcumuladas 
              sprintId={activeSprint?.id}
              showRoutines={true}
              title="Horas Alocadas por Pessoa"
              maxHoursPerWeek={40}
            />
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold">
                Meus Entregáveis da Sprint
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myDeliverables.length > 0 ? (
                <div className="space-y-2">
                  {myDeliverables.map((deliverable) => (
                    <div 
                      key={deliverable.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate('/equipe/sprints')}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(deliverable.status)}>
                          {parseDate(deliverable.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </Badge>
                        <span className="text-foreground">{deliverable.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {deliverable.estimated_hours && (
                          <span className="text-xs text-muted-foreground">{deliverable.estimated_hours}h</span>
                        )}
                        <Badge variant="outline">
                          {getStatusLabel(deliverable.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum entregável atribuído a você</p>
              )}
              
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary/80"
                onClick={() => navigate('/equipe/sprints')}
              >
                Ver sprint ativa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metricas">
          <DashboardMetrics />
        </TabsContent>

        <TabsContent value="impacto">
          <ImpactDashboard />
        </TabsContent>
      </Tabs>
    </EquipeLayout>
  );
};

export default EquipeDashboard;
