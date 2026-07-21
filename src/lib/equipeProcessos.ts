import type { Json, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { matchCluster } from '@/lib/clusterFilter';

export type EquipeProcessosSpreadsheetRow = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface EquipeProcessoCatalogClient {
  id: string;
  name: string;
  responsible: string | null;
  color: string;
  is_active: boolean;
}

export interface EquipeProcessoLinkedProject {
  id: string;
  name: string | undefined;
  impact_type: string | null;
}

export interface EquipeProcesso {
  id: string;
  name: string;
  code?: string | null;
  description: string | null;
  area: string | null;
  stage: string;
  priority: string | null;
  frequency: string | null;
  volume_month: number | null;
  financial_impact: string | null;
  client_id: string | null;
  cluster_id?: string | null;
  created_at: string;
  formatted_content?: string | null;
  document_path?: string | null;
  sop_link?: string | null;
  sop_document_path?: string | null;
  sop_before_link?: string | null;
  sop_before_document_path?: string | null;
  sop_before_content?: string | null;
  last_ai_sync?: string | null;
  catalog_client?: EquipeProcessoCatalogClient | null;
  equipe_id?: string | null;
  equipe?: { id: string; name: string; area: { id: string; name: string } | null } | null;
  linked_projects?: EquipeProcessoLinkedProject[];
  time_spent_hours?: number | null;
  cost_monthly?: number | null;
  volume_executions?: number | null;
  people_involved?: number | null;
  evaluation_period_days?: number | null;
}

export interface EquipeProcessoStage {
  id: string;
  process_id: string | null;
  name: string;
  stage_order: number;
  description: string | null;
  responsible: string | null;
  time_current: string | null;
  time_target: string | null;
  frequency: string | null;
  volume: string | null;
  automation_level: string | null;
  inputs: Json;
  outputs: Json;
  systems: Json;
  related_projects: string[] | null;
}

export interface EquipeProcessoProject {
  id: string;
  name: string;
}

export interface EquipeProcessoProjectLink {
  id: string;
  project_id: string | null;
  process_id: string | null;
  impact_type: string | null;
  impacted_stages: string[] | null;
  projects: EquipeProcessoProject | null;
}

export interface EquipeProcessoEditForm {
  name: string;
  description: string;
  area: string;
  equipe_id: string;
  stage: string;
  priority: string;
  frequency: string;
  volume_month: string;
  financial_impact: string;
}

interface ProcessRelationRow extends EquipeProcesso {
  project_processes?: Array<{
    id: string;
    impact_type: string | null;
    project: { id: string; name: string } | null;
  }> | null;
}

export function mapProcessesWithProjects(rows: ProcessRelationRow[]): EquipeProcesso[] {
  return rows.map((process) => ({
    ...process,
    linked_projects:
      process.project_processes
        ?.map((link) => ({
          id: link.project?.id,
          name: link.project?.name,
          impact_type: link.impact_type,
        }))
        .filter((project): project is EquipeProcessoLinkedProject => Boolean(project.id)) || [],
  }));
}

function readTruthy(
  row: EquipeProcessosSpreadsheetRow,
  keys: readonly string[],
): string | number | boolean | undefined {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return undefined;
}

export function inferProcessArea(cliente: unknown): string {
  if (!cliente) return 'Geral';
  const normalized = String(cliente).toLowerCase();
  if (normalized.includes('fiscal') || normalized.includes('ricardo')) return 'Fiscal';
  if (normalized.includes('consultoria') || normalized.includes('felipe')) return 'Consultoria';
  if (normalized.includes('fixos') || normalized.includes('washington')) return 'Fixos';
  return 'Transversal';
}

export function prepareProcessImportPayloads(
  rows: EquipeProcessosSpreadsheetRow[],
  userId: string | undefined,
): TablesInsert<'processes'>[] {
  const validStages = [
    'discovery',
    'mapping',
    'analysis',
    'improvement',
    'automation',
    'completed',
  ];
  const stageMap: Record<string, string> = {
    descoberta: 'discovery',
    mapeamento: 'mapping',
    análise: 'analysis',
    analise: 'analysis',
    melhoria: 'improvement',
    automação: 'automation',
    automacao: 'automation',
    concluído: 'completed',
    concluido: 'completed',
  };

  return rows
    .map((row) => {
      const rawStage = readTruthy(row, ['stage', 'Stage', 'fase', 'Fase']) || 'discovery';
      const normalizedStage = String(rawStage).toLowerCase().trim();
      const mappedStage = stageMap[normalizedStage] || normalizedStage;
      const processName =
        readTruthy(row, ['Processo', 'processo', 'Process', 'name', 'Nome', 'nome']) || '';
      const code = readTruthy(row, ['Código', 'codigo', 'Code', 'code']);
      const areaFromCliente = inferProcessArea(readTruthy(row, ['Cliente', 'cliente']));
      const area = readTruthy(row, ['area', 'Area', 'área', 'Área']) || areaFromCliente;
      const volumeMonth = row.volume_month
        ? parseInt(String(row.volume_month))
        : row.Volume
          ? parseInt(String(row.Volume))
          : null;

      return {
        name: String(processName).trim(),
        code: code ? String(code).trim() : null,
        description: (readTruthy(row, [
          'description',
          'Descricao',
          'descricao',
          'Descrição',
          'Descriçao',
        ]) || null) as string | null,
        area: area as string,
        stage: validStages.includes(mappedStage) ? mappedStage : 'discovery',
        priority: (readTruthy(row, ['priority', 'Prioridade', 'prioridade']) || 'medium') as string,
        frequency: (readTruthy(row, ['frequency', 'Frequencia', 'frequency', 'Frequência']) ||
          null) as string | null,
        volume_month: volumeMonth,
        financial_impact: (readTruthy(row, ['financial_impact', 'Impacto', 'impacto']) || null) as
          | string
          | null,
        created_by: userId,
      };
    })
    .filter((process) => Boolean(process.name && process.name.length > 0));
}

export function buildProcessUpdatePayload(form: EquipeProcessoEditForm): TablesUpdate<'processes'> {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    area: form.area.trim() || null,
    equipe_id: form.equipe_id || null,
    stage: form.stage,
    priority: form.priority || null,
    frequency: form.frequency.trim() || null,
    volume_month: form.volume_month ? parseInt(form.volume_month) : null,
    financial_impact: form.financial_impact.trim() || null,
  };
}

export function getAvailableProcessProjects(
  projects: EquipeProcessoProject[],
  links: EquipeProcessoProjectLink[],
): EquipeProcessoProject[] {
  const linkedProjectIds = links.map((link) => link.project_id);
  return projects.filter((project) => !linkedProjectIds.includes(project.id));
}

export interface EquipeProcessFilters {
  searchTerm: string;
  area: string;
  stage: string;
  cluster: string;
}

export function filterEquipeProcesses(
  processes: EquipeProcesso[],
  filters: EquipeProcessFilters,
): EquipeProcesso[] {
  return processes.filter((process) => {
    const matchesSearch =
      process.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (process.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ?? false);
    const clientName = process.catalog_client?.name || process.area;
    const matchesArea = filters.area === 'all' || clientName === filters.area;
    const matchesStage = filters.stage === 'all' || process.stage === filters.stage;
    return (
      matchesSearch &&
      matchesArea &&
      matchesStage &&
      matchCluster(filters.cluster, process.cluster_id)
    );
  });
}
