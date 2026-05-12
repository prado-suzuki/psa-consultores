import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mapeamento de stage para "status operacional" do dashboard
export const STAGE_TO_STATUS: Record<string, 'not_started' | 'in_progress' | 'completed'> = {
  discovery: 'not_started',
  mapping: 'in_progress',
  analysis: 'in_progress',
  improvement: 'in_progress',
  automation: 'in_progress',
  completed: 'completed',
};

export const STAGE_LABEL: Record<string, string> = {
  discovery: 'Descoberta',
  mapping: 'Mapeamento',
  analysis: 'Análise',
  improvement: 'Melhoria',
  automation: 'Automação',
  completed: 'Concluído',
};

export interface MappingProcess {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  area: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_executions: number | null;
  volume_month: number | null;
  time_spent_hours: number | null;
  people_involved: number | null;
  complexity_level: string | null;
  financial_impact: string | null;
  client_id: string | null;
  equipe_id: string | null;
  sop_link: string | null;
  sop_document_path: string | null;
  last_roi_percentage: number | null;
  last_cost_saved_monthly: number | null;
  last_time_saved_hours: number | null;
  last_improvement_date: string | null;
  created_at: string;
  catalog_client: { id: string; name: string; color: string } | null;
  equipe: { id: string; name: string } | null;
  // Rótulo final usado na UI — equipe quando existe, senão catalog_client.name
  display_group_id: string;
  display_group_name: string;
  display_group_color: string;
  stages_count: number;
  completeness_score: number; // 0 a 1
  has_mapping: boolean;
  has_roi: boolean;
  has_sop: boolean;
  has_volume_time: boolean;
  has_responsibles: boolean;
}

export interface AreaSummary {
  group_id: string;
  area_name: string;
  color: string;
  total: number;
  not_started: number;
  in_progress: number;
  completed: number;
  completion_percent: number;
  processes: MappingProcess[];
}

export interface ProcessMetrics {
  total: number;
  not_started: number;
  in_progress: number;
  completed: number;
  mapped: number;
  with_roi: number;
  with_sop: number;
  fully_complete: number;
  overall_progress_percent: number;
}

/**
 * Hook único que carrega todos os processos com dados agregados para a tela de mapeamento.
 * Calcula completude, métricas globais e agrupamento por área em memória, reduzindo round-trips.
 */
export function useProcessMapping() {
  const [processes, setProcesses] = useState<MappingProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Query principal — só campos básicos. Joins são feitos em segunda etapa
      // para sermos resilientes a estados parciais de migration (equipe_id pode não existir).
      const baseSelect = `
        id, code, name, description, area, stage, priority, frequency,
        volume_executions, volume_month, time_spent_hours, people_involved,
        complexity_level, financial_impact, client_id,
        sop_link, sop_document_path,
        last_roi_percentage, last_cost_saved_monthly, last_time_saved_hours, last_improvement_date,
        created_at,
        catalog_client:catalog_clients!processes_client_id_fkey ( id, name, color )
      `;

      // Tenta com equipe_id; se a coluna ainda não existe (migration pendente), refaz sem ela.
      let processData: any[] | null = null;
      let pErr: any = null;
      {
        const res = await (supabase as any)
          .from('processes')
          .select(`${baseSelect}, equipe_id`)
          .order('created_at', { ascending: false });
        if (res.error) {
          // PostgREST 42703 = column does not exist
          const msg = String(res.error.message ?? '').toLowerCase();
          const colMissing = msg.includes('equipe_id') || res.error.code === '42703';
          if (colMissing) {
            const res2 = await (supabase as any)
              .from('processes')
              .select(baseSelect)
              .order('created_at', { ascending: false });
            processData = res2.data;
            pErr = res2.error;
          } else {
            pErr = res.error;
          }
        } else {
          processData = res.data;
        }
      }

      if (pErr) throw pErr;

      // Hidrata estrutura_equipes em separado (pode falhar silenciosamente se tabela vazia/inexistente)
      const equipeIds = Array.from(
        new Set((processData ?? []).map((p: any) => p.equipe_id).filter(Boolean))
      ) as string[];
      const equipesMap = new Map<string, { id: string; name: string; area_id: string | null; area_name: string | null }>();
      if (equipeIds.length > 0) {
        try {
          const { data: eqData } = await (supabase as any)
            .from('estrutura_equipes')
            .select('id, name, area_id, area:estrutura_areas!estrutura_equipes_area_id_fkey(id, name)')
            .in('id', equipeIds);
          for (const eq of (eqData as any[]) ?? []) {
            equipesMap.set(eq.id, {
              id: eq.id,
              name: eq.name,
              area_id: eq.area_id ?? null,
              area_name: eq.area?.name ?? null,
            });
          }
        } catch {
          // ignora — fallback será catalog_client
        }
      }

      const ids = (processData ?? []).map(p => p.id);
      const stagesCountMap = new Map<string, number>();

      if (ids.length > 0) {
        const { data: stagesData, error: sErr } = await supabase
          .from('process_stages')
          .select('process_id')
          .in('process_id', ids);
        if (sErr) throw sErr;
        for (const s of stagesData ?? []) {
          if (!s.process_id) continue;
          stagesCountMap.set(s.process_id, (stagesCountMap.get(s.process_id) ?? 0) + 1);
        }
      }

      // Buscar quantos responsáveis cada processo tem (via process_team_members se existir,
      // ou cair em people_involved como heurística). Fazemos try/catch silencioso pois a tabela
      // pode não existir ainda em todos os ambientes.
      const responsiblesMap = new Map<string, number>();
      try {
        const { data: teamData } = await supabase
          .from('process_team_members' as any)
          .select('process_id')
          .in('process_id', ids.length > 0 ? ids : ['__none__']);
        for (const t of (teamData as any[]) ?? []) {
          if (!t.process_id) continue;
          responsiblesMap.set(t.process_id, (responsiblesMap.get(t.process_id) ?? 0) + 1);
        }
      } catch {
        // Tabela inexistente — completude usa people_involved como proxy
      }

      const enriched: MappingProcess[] = (processData ?? []).map((p: any) => {
        const stages_count = stagesCountMap.get(p.id) ?? 0;
        const responsibles_count = responsiblesMap.get(p.id) ?? p.people_involved ?? 0;
        const equipeRecord = p.equipe_id ? equipesMap.get(p.equipe_id) ?? null : null;

        const has_mapping = stages_count > 0;
        const has_roi = p.last_roi_percentage !== null && p.last_roi_percentage !== undefined;
        const has_sop = Boolean(p.sop_link || p.sop_document_path);
        const has_volume_time =
          Boolean((p.volume_executions ?? p.volume_month) && p.time_spent_hours);
        const has_responsibles = responsibles_count > 0;

        const checks = [has_mapping, has_roi, has_sop, has_volume_time, has_responsibles];
        const completeness_score = checks.filter(Boolean).length / checks.length;

        const equipe = equipeRecord;
        const catalog = p.catalog_client
          ? { id: p.catalog_client.id, name: p.catalog_client.name, color: p.catalog_client.color }
          : null;

        // Agrupamento por ÁREA da estrutura organizacional (estrutura_areas via equipe).
        // Fallback: texto legado em processes.area; por fim "Sem área".
        const areaIdFromEquipe = equipe?.area_id ?? null;
        const areaNameFromEquipe = equipe?.area_name ?? null;
        const display_group_id = areaIdFromEquipe ?? (p.area ? `legacy:${p.area}` : '__no_group__');
        const display_group_name = areaNameFromEquipe ?? p.area ?? 'Sem área';
        const display_group_color = '#94a3b8';

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          area: p.area,
          stage: p.stage,
          priority: p.priority,
          frequency: p.frequency,
          volume_executions: p.volume_executions,
          volume_month: p.volume_month,
          time_spent_hours: p.time_spent_hours,
          people_involved: p.people_involved,
          complexity_level: p.complexity_level,
          financial_impact: p.financial_impact,
          client_id: p.client_id,
          equipe_id: p.equipe_id ?? null,
          sop_link: p.sop_link,
          sop_document_path: p.sop_document_path,
          last_roi_percentage: p.last_roi_percentage,
          last_cost_saved_monthly: p.last_cost_saved_monthly,
          last_time_saved_hours: p.last_time_saved_hours,
          last_improvement_date: p.last_improvement_date,
          created_at: p.created_at,
          catalog_client: catalog,
          equipe,
          display_group_id,
          display_group_name,
          display_group_color,
          stages_count,
          completeness_score,
          has_mapping,
          has_roi,
          has_sop,
          has_volume_time,
          has_responsibles,
        };
      });

      setProcesses(enriched);
    } catch (err: any) {
      console.error('[useProcessMapping] Error:', err);
      setError(err?.message ?? 'Erro ao carregar processos');
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const metrics: ProcessMetrics = useMemo(() => {
    const total = processes.length;
    let not_started = 0;
    let in_progress = 0;
    let completed = 0;
    let mapped = 0;
    let with_roi = 0;
    let with_sop = 0;
    let fully_complete = 0;

    for (const p of processes) {
      const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
      if (status === 'not_started') not_started++;
      else if (status === 'in_progress') in_progress++;
      else completed++;
      if (p.has_mapping) mapped++;
      if (p.has_roi) with_roi++;
      if (p.has_sop) with_sop++;
      if (p.completeness_score >= 1) fully_complete++;
    }

    const overall_progress_percent = total === 0 ? 0 : Math.round((fully_complete / total) * 100);

    return { total, not_started, in_progress, completed, mapped, with_roi, with_sop, fully_complete, overall_progress_percent };
  }, [processes]);

  const byArea: AreaSummary[] = useMemo(() => {
    const map = new Map<string, AreaSummary>();
    for (const p of processes) {
      const key = p.display_group_id;
      const existing = map.get(key);
      if (existing) {
        existing.processes.push(p);
        existing.total++;
      } else {
        map.set(key, {
          group_id: p.display_group_id,
          area_name: p.display_group_name,
          color: p.display_group_color,
          total: 1,
          not_started: 0,
          in_progress: 0,
          completed: 0,
          completion_percent: 0,
          processes: [p],
        });
      }
    }

    for (const area of map.values()) {
      for (const p of area.processes) {
        const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
        if (status === 'not_started') area.not_started++;
        else if (status === 'in_progress') area.in_progress++;
        else area.completed++;
      }
      area.completion_percent = area.total === 0 ? 0 : Math.round((area.completed / area.total) * 100);
    }

    return Array.from(map.values()).sort((a, b) => a.area_name.localeCompare(b.area_name));
  }, [processes]);

  return { processes, metrics, byArea, loading, error, refresh: fetchAll };
}
