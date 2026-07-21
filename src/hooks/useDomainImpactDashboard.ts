import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ImpactMetrics {
  totalProcesses: number;
  improvedProcesses: number;
  totalTimeSaved: number;
  totalCostSaved: number;
  avgRoi: number;
  fteSaved: number;
}

export interface TopImprovement {
  id: string;
  process_name: string;
  time_saved_percent: number;
  cost_saved_monthly: number;
  roi_percentage: number;
}

export interface ProjectImpact {
  project_name: string;
  improvements_count: number;
  total_savings: number;
  avg_roi: number;
}

export interface ImprovementDetail {
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

export interface ImpactFilterOption {
  id: string;
  name: string;
}

export interface ImpactProfileOption {
  id: string;
  first_name: string;
  last_name: string;
}

export interface MonthlyImpactData {
  month: string;
  economia: number;
  acumulado: number;
}

export interface AreaImpactData {
  name: string;
  hours: number;
  fte: string;
}

export interface DomainImpactDashboardData {
  metrics: ImpactMetrics;
  topImprovements: TopImprovement[];
  projectImpacts: ProjectImpact[];
  monthlyData: MonthlyImpactData[];
  areaData: AreaImpactData[];
  processes: ImpactFilterOption[];
  projects: ImpactFilterOption[];
  profiles: ImpactProfileOption[];
  allImprovements: ImprovementDetail[];
}

const domainImpactDashboardQueryKey = ['domain-impact-dashboard'] as const;

const createDefaultDashboardData = (): DomainImpactDashboardData => ({
  metrics: {
    totalProcesses: 0,
    improvedProcesses: 0,
    totalTimeSaved: 0,
    totalCostSaved: 0,
    avgRoi: 0,
    fteSaved: 0,
  },
  topImprovements: [],
  projectImpacts: [],
  monthlyData: [],
  areaData: [],
  processes: [],
  projects: [],
  profiles: [],
  allImprovements: [],
});

export function useDomainImpactDashboard() {
  const dashboardQuery = useQuery<DomainImpactDashboardData>({
    queryKey: domainImpactDashboardQueryKey,
    queryFn: async () => {
      const dashboardData = createDefaultDashboardData();

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
        dashboardData.processes = processesData || [];

        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        dashboardData.projects = projectsData || [];

        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .order('first_name');
        dashboardData.profiles = profilesData || [];

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
        dashboardData.allImprovements = completedImprovements.map((improvement) => ({
          id: improvement.id,
          process_id: improvement.process_id,
          process_name: improvement.process?.name || 'Processo',
          project_id: improvement.project_id,
          project_name: improvement.project?.name || null,
          area: improvement.process?.area || null,
          roi_percentage: improvement.roi_percentage || 0,
          cost_saved_monthly: improvement.cost_saved_monthly || 0,
          time_saved_hours: improvement.time_saved_hours || 0,
          baseline_time_hours: improvement.baseline_time_hours || 0,
          improved_time_hours: improvement.improved_time_hours || 0,
          evaluated_by: improvement.evaluated_by,
          evaluated_by_name: improvement.evaluator
            ? `${improvement.evaluator.first_name} ${improvement.evaluator.last_name}`
            : null,
          created_at: improvement.created_at,
        }));

        // Calcular métricas
        const totalTimeSaved = completedImprovements.reduce(
          (sum, improvement) => sum + (improvement.time_saved_hours || 0),
          0,
        );
        const totalCostSaved = completedImprovements.reduce(
          (sum, improvement) => sum + (improvement.cost_saved_monthly || 0),
          0,
        );
        const avgRoi =
          completedImprovements.length > 0
            ? completedImprovements.reduce(
                (sum, improvement) => sum + (improvement.roi_percentage || 0),
                0,
              ) / completedImprovements.length
            : 0;
        const fteSaved = totalTimeSaved / 176; // 176 horas úteis mensais

        dashboardData.metrics = {
          totalProcesses: totalProcesses || 0,
          improvedProcesses: completedImprovements.length,
          totalTimeSaved,
          totalCostSaved,
          avgRoi,
          fteSaved,
        };

        // Top 5 melhorias
        dashboardData.topImprovements = completedImprovements
          .sort(
            (first, second) =>
              (second.cost_saved_monthly || 0) - (first.cost_saved_monthly || 0),
          )
          .slice(0, 5)
          .map((improvement) => ({
            id: improvement.id,
            process_name: improvement.process?.name || 'Processo',
            time_saved_percent: improvement.time_saved_percent || 0,
            cost_saved_monthly: improvement.cost_saved_monthly || 0,
            roi_percentage: improvement.roi_percentage || 0,
          }));

        // Impacto por projeto
        const projectMap = new Map<string, ProjectImpact>();
        completedImprovements.forEach((improvement) => {
          const projectName = improvement.project?.name || 'Sem projeto';
          const existing = projectMap.get(projectName) || {
            project_name: projectName,
            improvements_count: 0,
            total_savings: 0,
            avg_roi: 0,
          };
          existing.improvements_count++;
          existing.total_savings += improvement.cost_saved_monthly || 0;
          existing.avg_roi =
            (existing.avg_roi * (existing.improvements_count - 1) +
              (improvement.roi_percentage || 0)) /
            existing.improvements_count;
          projectMap.set(projectName, existing);
        });
        dashboardData.projectImpacts = Array.from(projectMap.values()).sort(
          (first, second) => second.total_savings - first.total_savings,
        );

        // Dados mensais (simulados para demonstração)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        let accumulated = 0;
        dashboardData.monthlyData = months.map((month) => {
          accumulated += totalCostSaved / 6;
          return {
            month,
            economia: Math.round(totalCostSaved / 6),
            acumulado: Math.round(accumulated),
          };
        });

        // Dados por área
        const areaMap = new Map<string, number>();
        completedImprovements.forEach((improvement) => {
          const area = improvement.process?.area || 'Outras';
          areaMap.set(area, (areaMap.get(area) || 0) + (improvement.time_saved_hours || 0));
        });
        dashboardData.areaData = Array.from(areaMap.entries()).map(([name, hours]) => ({
          name,
          hours,
          fte: (hours / 176).toFixed(2),
        }));
      } catch (error) {
        console.error('Error fetching impact data:', error);
      }

      return dashboardData;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    ...(dashboardQuery.data ?? createDefaultDashboardData()),
    isLoading: dashboardQuery.isFetching,
  };
}
