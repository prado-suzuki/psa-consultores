import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tipos locais — tabela process_scenarios ainda não está nos types gerados do Supabase

export type ScenarioKind = 'scale' | 'efficiency' | 'investment';
export type ScenarioType = 'baseline' | 'variant' | 'target';
export type ScenarioUnitBasis = 'per_unit' | 'per_month' | 'per_year';
export type ScenarioStatus = 'draft' | 'analyzing' | 'approved' | 'promoted' | 'archived';

export interface TeamMemberAlloc {
  hours_allocated: number;
  hourly_rate: number;
  is_baseline: boolean;
}

export interface ScenarioParameters {
  baseline_time_hours: number;
  baseline_cost_monthly?: number;
  baseline_volume: number;
  baseline_people_involved: number;
  improved_time_hours: number;
  improved_cost_monthly?: number;
  improved_volume: number;
  improved_people_involved: number;
  implementation_hours: number;
  team_members?: TeamMemberAlloc[];
  system_savings_monthly?: number;
  build_vs_buy_savings?: number;
  other_savings_monthly?: number;
}

export interface ScenarioComputedMetrics {
  time_saved_hours: number;
  time_saved_percent: number;
  cost_saved_monthly: number;
  cost_saved_percent: number;
  labor_savings_monthly: number;
  system_savings_monthly: number;
  other_savings_monthly: number;
  build_vs_buy_savings: number;
  implementation_cost: number;
  annual_savings: number;
  roi_percentage: number;
  payback_months: number;
  fte_saved: number;
  baseline_cost_monthly: number;
  improved_cost_monthly: number;
  unit_basis: string;
  views: {
    per_unit?: { cost_saved: number; time_saved_hours: number };
    per_month: { cost_saved: number; time_saved_hours: number };
    per_year: { cost_saved: number; time_saved_hours: number };
  };
}

export interface ProcessScenario {
  id: string;
  process_id: string;
  parent_scenario_id: string | null;
  improvement_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  scenario_kind: ScenarioKind;
  scenario_type: ScenarioType;
  unit_basis: ScenarioUnitBasis;
  status: ScenarioStatus;
  varied_field: string;
  locked_fields: string[];
  parameters: ScenarioParameters;
  computed_metrics: ScenarioComputedMetrics | null;
  is_locked: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComputePayload extends ScenarioParameters {
  unit_basis: ScenarioUnitBasis;
  avg_hourly_cost_implementation?: number;
  hours_per_month?: number;
}

const TABLE = 'process_scenarios' as const;

export function useProcessScenarios(processId?: string) {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<ProcessScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    if (!processId) {
      setScenarios([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setScenarios((data as ProcessScenario[]) ?? []);
    } catch (e: any) {
      console.error('[useProcessScenarios] fetch:', e);
      setError(e?.message ?? 'Erro ao carregar cenários');
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Chamada à edge function para cálculo puro (sem persistir)
  const compute = useCallback(async (payload: ComputePayload): Promise<ScenarioComputedMetrics> => {
    const { data, error: err } = await supabase.functions.invoke('calculate-process-roi', {
      body: { mode: 'compute', scenario_payload: payload },
    });
    if (err) throw err;
    if (!data?.results) throw new Error('Edge function não retornou results');
    return data.results as ScenarioComputedMetrics;
  }, []);

  const create = useCallback(async (input: {
    process_id: string;
    parent_scenario_id?: string | null;
    name: string;
    description?: string;
    scenario_kind: ScenarioKind;
    scenario_type?: ScenarioType;
    unit_basis: ScenarioUnitBasis;
    varied_field: string;
    locked_fields: string[];
    parameters: ScenarioParameters;
    computed_metrics?: ScenarioComputedMetrics | null;
  }): Promise<ProcessScenario> => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    const insert = {
      process_id: input.process_id,
      parent_scenario_id: input.parent_scenario_id ?? null,
      name: input.name,
      description: input.description ?? null,
      scenario_kind: input.scenario_kind,
      scenario_type: input.scenario_type ?? 'variant',
      unit_basis: input.unit_basis,
      status: 'draft' as ScenarioStatus,
      varied_field: input.varied_field,
      locked_fields: input.locked_fields,
      parameters: input.parameters,
      computed_metrics: input.computed_metrics ?? null,
      is_locked: false,
      created_by: user.id,
    };
    const { data, error: err } = await (supabase as any)
      .from(TABLE)
      .insert(insert)
      .select()
      .single();
    if (err) throw err;
    await fetchScenarios();
    return data as ProcessScenario;
  }, [user?.id, fetchScenarios]);

  const updateStatus = useCallback(async (id: string, status: ScenarioStatus): Promise<void> => {
    const { error: err } = await (supabase as any)
      .from(TABLE)
      .update({ status })
      .eq('id', id);
    if (err) throw err;
    await fetchScenarios();
  }, [fetchScenarios]);

  const lock = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await (supabase as any)
      .from(TABLE)
      .update({ is_locked: true })
      .eq('id', id);
    if (err) throw err;
    await fetchScenarios();
  }, [fetchScenarios]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await (supabase as any)
      .from(TABLE)
      .delete()
      .eq('id', id);
    if (err) throw err;
    await fetchScenarios();
  }, [fetchScenarios]);

  // Promover cenário a projeto: cria projects + project_processes + atualiza scenario.status/project_id
  const promoteToProject = useCallback(async (scenario: ProcessScenario, projectName: string): Promise<string> => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    // Buscar nome do processo para descrição do projeto
    const { data: proc } = await supabase
      .from('processes')
      .select('name, client_id, area')
      .eq('id', scenario.process_id)
      .single();

    const description = `Projeto criado a partir do cenário "${scenario.name}". Tipo: ${scenario.scenario_kind}. Variável testada: ${scenario.varied_field}.`;

    const { data: newProject, error: pErr } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        description,
        status: 'active',
        client_id: proc?.client_id ?? null,
        created_by: user.id,
      } as any)
      .select()
      .single();
    if (pErr) throw pErr;

    const projectId = (newProject as any).id;

    // Linka processo ao projeto via project_processes
    const { error: jErr } = await (supabase as any)
      .from('project_processes')
      .insert({
        project_id: projectId,
        process_id: scenario.process_id,
        impact_type: 'principal',
      });
    if (jErr) console.warn('[promoteToProject] falha ao linkar project_processes:', jErr);

    // Atualiza cenário
    const { error: sErr } = await (supabase as any)
      .from(TABLE)
      .update({
        status: 'promoted' as ScenarioStatus,
        project_id: projectId,
      })
      .eq('id', scenario.id);
    if (sErr) throw sErr;

    await fetchScenarios();
    return projectId;
  }, [user?.id, fetchScenarios]);

  return {
    scenarios,
    loading,
    error,
    refresh: fetchScenarios,
    compute,
    create,
    updateStatus,
    lock,
    remove,
    promoteToProject,
  };
}
