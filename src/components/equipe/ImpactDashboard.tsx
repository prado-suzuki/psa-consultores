import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { TrendingUp, Clock, DollarSign, Users, Target, Zap, X, LayoutGrid, Table as TableIcon } from 'lucide-react';
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

interface ImprovementDetail {
  id: string;
  process_id: string;
  process_name: string;
  project_id: string | null;
  project_name: string | null;
  area: string | null;
  roi_percentage: number;
  cost_saved_monthly: number;
  time_saved_hours: number;
  baseline_time_hours: number;
  improved_time_hours: number;
  evaluated_by: string | null;
  evaluated_by_name: string | null;
  created_at: string;
}

interface FilterOption {
  id: string;
  name: string;
}

interface ProfileOption {
  id: string;
  first_name: string;
  last_name: string;
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

  // Filter states
  const [filters, setFilters] = useState({
    processId: '',
    projectId: '',
    responsibleId: '',
    area: ''
  });

  // Data for filters
  const [processes, setProcesses] = useState<FilterOption[]>([]);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const areas = ['Fiscal', 'Fixos', 'Transversal', 'Consultoria'];

  // View mode toggle
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // All improvements for table
  const [allImprovements, setAllImprovements] = useState<ImprovementDetail[]>([]);

  useEffect(() => {
    fetchImpactData();
  }, []);

  // Filter improvements based on selected filters
  const filteredImprovements = useMemo(() => {
    return allImprovements.filter(imp => {
      if (filters.processId && imp.process_id !== filters.processId) return false;
      if (filters.projectId && imp.project_id !== filters.projectId) return false;
      if (filters.responsibleId && imp.evaluated_by !== filters.responsibleId) return false;
      if (filters.area && imp.area !== filters.area) return false;
      return true;
    });
  }, [allImprovements, filters]);

  // Recalculate metrics based on filtered data
  const filteredMetrics = useMemo(() => {
    const totalTimeSaved = filteredImprovements.reduce((sum, i) => sum + (i.time_saved_hours || 0), 0);
    const totalCostSaved = filteredImprovements.reduce((sum, i) => sum + (i.cost_saved_monthly || 0), 0);
    const avgRoi = filteredImprovements.length > 0
      ? filteredImprovements.reduce((sum, i) => sum + (i.roi_percentage || 0), 0) / filteredImprovements.length
      : 0;
    const fteSaved = totalTimeSaved / 176;
    const totalBaselineHours = filteredImprovements.reduce((sum, i) => sum + (i.baseline_time_hours || 0), 0);
    const totalImprovedHours = filteredImprovements.reduce((sum, i) => sum + (i.improved_time_hours || 0), 0);

    return {
      improvedProcesses: filteredImprovements.length,
      totalTimeSaved,
      totalCostSaved,
      avgRoi,
      fteSaved,
      totalBaselineHours,
      totalImprovedHours
    };
  }, [filteredImprovements]);

  const fetchImpactData = async () => {
    try {
      // Buscar total de processos
      const { count: totalProcesses } = await supabase
        .from('processes')
        .select('*', { count: 'exact', head: true });

      // Fetch filter options
      const { data: processesData } = await supabase
        .from('processes')
        .select('id, name')
        .order('name');
      setProcesses(processesData || []);

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      setProjects(projectsData || []);

      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');
      setProfiles(profilesData || []);

      // Buscar melhorias completadas
      const { data: improvements, error: improvementsError } = await supabase
        .from('process_improvements')
        .select(`
          *,
          process:processes(name, area),
          project:projects(name),
          evaluator:profiles!process_improvements_evaluated_by_fkey(first_name, last_name)
        `)
        .eq('evaluation_status', 'completed');

      if (improvementsError) throw improvementsError;

      const completedImprovements = improvements || [];

      // Map to ImprovementDetail for table
      const improvementDetails: ImprovementDetail[] = completedImprovements.map(i => ({
        id: i.id,
        process_id: i.process_id,
        process_name: i.process?.name || 'Processo',
        project_id: i.project_id,
        project_name: i.project?.name || null,
        area: i.process?.area || null,
        roi_percentage: i.roi_percentage || 0,
        cost_saved_monthly: i.cost_saved_monthly || 0,
        time_saved_hours: i.time_saved_hours || 0,
        baseline_time_hours: i.baseline_time_hours || 0,
        improved_time_hours: i.improved_time_hours || 0,
        evaluated_by: i.evaluated_by,
        evaluated_by_name: i.evaluator ? `${i.evaluator.first_name} ${i.evaluator.last_name}` : null,
        created_at: i.created_at
      }));
      setAllImprovements(improvementDetails);

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

  const clearFilters = () => {
    setFilters({ processId: '', projectId: '', responsibleId: '', area: '' });
  };

  const hasActiveFilters = filters.processId || filters.projectId || filters.responsibleId || filters.area;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={filters.processId} onValueChange={(v) => setFilters({...filters, processId: v === 'all' ? '' : v})}>
              <SelectTrigger>
                <SelectValue placeholder="Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os processos</SelectItem>
                {processes.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.projectId} onValueChange={(v) => setFilters({...filters, projectId: v === 'all' ? '' : v})}>
              <SelectTrigger>
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.responsibleId} onValueChange={(v) => setFilters({...filters, responsibleId: v === 'all' ? '' : v})}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.area} onValueChange={(v) => setFilters({...filters, area: v === 'all' ? '' : v})}>
              <SelectTrigger>
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {areas.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-2xl font-bold text-green-600">{hasActiveFilters ? filteredMetrics.improvedProcesses : metrics.improvedProcesses}</p>
            <p className="text-xs text-gray-500">processos</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-500">Tempo</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{(hasActiveFilters ? filteredMetrics.totalTimeSaved : metrics.totalTimeSaved).toFixed(0)}h</p>
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
              R$ {(hasActiveFilters ? filteredMetrics.totalCostSaved : metrics.totalCostSaved).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
            <p className="text-2xl font-bold text-primary">{(hasActiveFilters ? filteredMetrics.avgRoi : metrics.avgRoi).toFixed(0)}%</p>
            <p className="text-xs text-gray-500">anual</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-gray-500">FTE</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{(hasActiveFilters ? filteredMetrics.fteSaved : metrics.fteSaved).toFixed(1)}</p>
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

      {/* Comparativo de Horas */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-900 text-base font-medium">
            Comparativo de Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredImprovements.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Antes</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {filteredMetrics.totalBaselineHours.toFixed(0)}h
                  </p>
                  <p className="text-xs text-gray-500">/mês</p>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    -{filteredMetrics.totalBaselineHours > 0 
                      ? ((1 - filteredMetrics.totalImprovedHours / filteredMetrics.totalBaselineHours) * 100).toFixed(0) 
                      : 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Depois</p>
                  <p className="text-2xl font-bold text-primary">
                    {filteredMetrics.totalImprovedHours.toFixed(0)}h
                  </p>
                  <p className="text-xs text-gray-500">/mês</p>
                </div>
              </div>

              {/* Process-level breakdown */}
              <div className="space-y-2">
                {filteredImprovements
                  .filter(i => i.baseline_time_hours > 0)
                  .sort((a, b) => (b.baseline_time_hours - b.improved_time_hours) - (a.baseline_time_hours - a.improved_time_hours))
                  .slice(0, 8)
                  .map((imp) => {
                    const reduction = imp.baseline_time_hours > 0 
                      ? ((1 - imp.improved_time_hours / imp.baseline_time_hours) * 100) 
                      : 0;
                    const barWidthBefore = 100;
                    const barWidthAfter = imp.baseline_time_hours > 0 
                      ? (imp.improved_time_hours / imp.baseline_time_hours) * 100 
                      : 0;
                    
                    return (
                      <div key={imp.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">
                            {imp.process_name}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">{imp.baseline_time_hours.toFixed(0)}h</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-primary font-medium">{imp.improved_time_hours.toFixed(0)}h</span>
                            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                              -{reduction.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-gray-400 rounded-full transition-all"
                            style={{ width: `${barWidthBefore}%` }}
                          />
                          <div 
                            className="absolute h-full bg-primary rounded-full transition-all"
                            style={{ width: `${barWidthAfter}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {filteredImprovements.filter(i => i.baseline_time_hours > 0).length > 8 && (
                <p className="text-center text-xs text-gray-500">
                  +{filteredImprovements.filter(i => i.baseline_time_hours > 0).length - 8} processos com dados de horas
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 text-sm">
              Nenhuma melhoria com dados de horas registrados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Melhorias Implementadas - Cards/Table View */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 text-base font-medium">
              Melhorias Implementadas ({filteredImprovements.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'cards' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredImprovements.length > 0 ? (
            viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processo</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Economia/mês</TableHead>
                      <TableHead className="text-right">Tempo/mês</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImprovements.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="font-medium">{imp.process_name}</TableCell>
                        <TableCell>{imp.project_name || '-'}</TableCell>
                        <TableCell>
                          {imp.area ? (
                            <Badge variant="outline">{imp.area}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {imp.roi_percentage?.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {imp.cost_saved_monthly?.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {imp.time_saved_hours?.toFixed(0)}h
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {imp.evaluated_by_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(imp.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredImprovements
                  .sort((a, b) => (b.cost_saved_monthly || 0) - (a.cost_saved_monthly || 0))
                  .slice(0, 10)
                  .map((improvement, index) => (
                    <div 
                      key={improvement.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-teal-100 text-teal-700 border-0 w-6 h-6 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <span className="text-gray-900 font-medium">{improvement.process_name}</span>
                          {improvement.area && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {improvement.area}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-green-600 font-semibold">
                          R$ {improvement.cost_saved_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                        </span>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          {improvement.time_saved_hours?.toFixed(0)}h/mês
                        </Badge>
                        <Badge className="bg-teal-100 text-teal-700 border-0">
                          ROI {improvement.roi_percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                {filteredImprovements.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    +{filteredImprovements.length - 10} melhorias. Use a visão de tabela para ver todas.
                  </p>
                )}
              </div>
            )
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
