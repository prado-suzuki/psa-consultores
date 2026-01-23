import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Clock, DollarSign, Users, Target, Zap } from 'lucide-react';
import { CHART_COLORS, LINE_CHART_COLORS } from '@/constants/brandColors';

interface ImpactMetrics {
  totalProcesses: number;
  improvedProcesses: number;
  totalTimeSaved: number;
  totalCostSaved: number;
  avgRoi: number;
  fteSaved: number;
}

interface TopImprovement {
  id: string;
  process_name: string;
  time_saved_percent: number;
  cost_saved_monthly: number;
  roi_percentage: number;
}

interface ProjectImpact {
  project_name: string;
  improvements_count: number;
  total_savings: number;
  avg_roi: number;
}

// Using centralized CHART_COLORS from brandColors

export function ImpactDashboard() {
  const [metrics, setMetrics] = useState<ImpactMetrics>({
    totalProcesses: 0,
    improvedProcesses: 0,
    totalTimeSaved: 0,
    totalCostSaved: 0,
    avgRoi: 0,
    fteSaved: 0
  });
  const [topImprovements, setTopImprovements] = useState<TopImprovement[]>([]);
  const [projectImpacts, setProjectImpacts] = useState<ProjectImpact[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      // Buscar total de processos
      const { count: totalProcesses } = await supabase
        .from('processes')
        .select('*', { count: 'exact', head: true });

      // Buscar melhorias completadas
      const { data: improvements, error: improvementsError } = await supabase
        .from('process_improvements')
        .select(`
          *,
          process:processes(name, area),
          project:projects(name)
        `)
        .eq('evaluation_status', 'completed');

      if (improvementsError) throw improvementsError;

      const completedImprovements = improvements || [];

      // Calcular métricas
      const totalTimeSaved = completedImprovements.reduce((sum, i) => sum + (i.time_saved_hours || 0), 0);
      const totalCostSaved = completedImprovements.reduce((sum, i) => sum + (i.cost_saved_monthly || 0), 0);
      const avgRoi = completedImprovements.length > 0
        ? completedImprovements.reduce((sum, i) => sum + (i.roi_percentage || 0), 0) / completedImprovements.length
        : 0;
      const fteSaved = totalTimeSaved / 176; // 176 horas úteis mensais

      setMetrics({
        totalProcesses: totalProcesses || 0,
        improvedProcesses: completedImprovements.length,
        totalTimeSaved,
        totalCostSaved,
        avgRoi,
        fteSaved
      });

      // Top 5 melhorias
      const top5 = completedImprovements
        .sort((a, b) => (b.cost_saved_monthly || 0) - (a.cost_saved_monthly || 0))
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          process_name: i.process?.name || 'Processo',
          time_saved_percent: i.time_saved_percent || 0,
          cost_saved_monthly: i.cost_saved_monthly || 0,
          roi_percentage: i.roi_percentage || 0
        }));
      setTopImprovements(top5);

      // Impacto por projeto
      const projectMap = new Map<string, ProjectImpact>();
      completedImprovements.forEach(i => {
        const projectName = i.project?.name || 'Sem projeto';
        const existing = projectMap.get(projectName) || {
          project_name: projectName,
          improvements_count: 0,
          total_savings: 0,
          avg_roi: 0
        };
        existing.improvements_count++;
        existing.total_savings += i.cost_saved_monthly || 0;
        existing.avg_roi = (existing.avg_roi * (existing.improvements_count - 1) + (i.roi_percentage || 0)) / existing.improvements_count;
        projectMap.set(projectName, existing);
      });
      setProjectImpacts(Array.from(projectMap.values()).sort((a, b) => b.total_savings - a.total_savings));

      // Dados mensais (simulados para demonstração)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      let accumulated = 0;
      setMonthlyData(months.map((month, index) => {
        accumulated += totalCostSaved / 6;
        return {
          month,
          economia: Math.round(totalCostSaved / 6),
          acumulado: Math.round(accumulated)
        };
      }));

      // Dados por área
      const areaMap = new Map<string, number>();
      completedImprovements.forEach(i => {
        const area = i.process?.area || 'Outras';
        areaMap.set(area, (areaMap.get(area) || 0) + (i.time_saved_hours || 0));
      });
      setAreaData(Array.from(areaMap.entries()).map(([name, hours]) => ({
        name,
        hours,
        fte: (hours / 176).toFixed(2)
      })));

    } catch (error) {
      console.error('Error fetching impact data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-gray-500" />
              <p className="text-xs text-gray-500">Processos</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalProcesses}</p>
            <p className="text-xs text-gray-500">mapeados</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-green-500" />
              <p className="text-xs text-gray-500">Melhorados</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics.improvedProcesses}</p>
            <p className="text-xs text-gray-500">processos</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-500">Tempo</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{metrics.totalTimeSaved.toFixed(0)}h</p>
            <p className="text-xs text-gray-500">economizadas/mês</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <p className="text-xs text-gray-500">Economia</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {metrics.totalCostSaved.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500">/mês</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-gray-500">ROI Médio</p>
            </div>
            <p className="text-2xl font-bold text-primary">{metrics.avgRoi.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">anual</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-gray-500">FTE</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{metrics.fteSaved.toFixed(1)}</p>
            <p className="text-xs text-gray-500">liberados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economia Acumulada */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-900 text-base font-medium">
              Economia Acumulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="acumulado" 
                    stroke={LINE_CHART_COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: LINE_CHART_COLORS.primary, strokeWidth: 2 }}
                    name="Economia Acumulada"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* FTE por Área */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-900 text-base font-medium">
              FTE Liberados por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="hours"
                    nameKey="name"
                    label={({ name, fte }) => `${name} (${fte} FTE)`}
                    labelLine={false}
                  >
                    {areaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
                    formatter={(value: number) => [`${value}h/mês`, 'Horas economizadas']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI por Projeto */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-900 text-base font-medium">
            ROI por Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectImpacts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="project_name" type="category" width={120} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }}
                  formatter={(value: number, name: string) => [
                    name === 'avg_roi' ? `${value.toFixed(0)}%` : `R$ ${value.toLocaleString('pt-BR')}`,
                    name === 'avg_roi' ? 'ROI' : 'Economia'
                  ]}
                />
                <Bar dataKey="avg_roi" fill={LINE_CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Melhorias */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-900 text-base font-medium">
            Top 5 Melhorias por Impacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topImprovements.length > 0 ? (
            <div className="space-y-3">
              {topImprovements.map((improvement, index) => (
                <div 
                  key={improvement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-teal-100 text-teal-700 border-0 w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-gray-900 font-medium">{improvement.process_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      -{improvement.time_saved_percent.toFixed(0)}% tempo
                    </Badge>
                    <span className="text-green-600 font-semibold">
                      R$ {improvement.cost_saved_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                    </span>
                    <Badge className="bg-teal-100 text-teal-700 border-0">
                      ROI {improvement.roi_percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nenhuma melhoria avaliada ainda. Complete avaliações de processos para ver o impacto aqui.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
