import type { OrgProject, OrgProjectFormData } from '@/hooks/useOrgProjects';

export type ProjectSortColumn = 'name' | 'produto' | 'servico' | 'cliente' | 'equipe' | 'pessoas' | 'status';
export type SortDirection = 'asc' | 'desc';
export type ProjectGroupBy = 'none' | 'cliente' | 'equipe' | 'area';

export interface ProjectFilters {
  cliente: string;
  produto: string;
  status: string;
}

export interface ProjectMemberAreas {
  ids: string[];
  names: string[];
}

export interface ProjectGroup {
  label: string;
  projects: OrgProject[];
}

export interface ProjectPrefill {
  clientId: string;
  name: string;
  description: string;
  isMultidisciplinar: boolean;
}

export interface ProjectPrefillLocationState {
  projectPrefill: ProjectPrefill;
}

export const EMPTY_PROJECT_FORM: OrgProjectFormData = {
  name: '',
  description: '',
  status: 'active',
  start_date: '',
  end_date: '',
  leader_ids: [],
  responsible_id: '',
  external_client_id: '',
  estrutura_area_id: '',
  equipe_id: '',
  is_multidisciplinar: false,
  member_ids: [],
  ordem_servico_id: '',
  servico_id: '',
};

export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejado',
  active: 'Ativo',
  completed: 'Concluído',
  on_hold: 'Pausado',
  cancelled: 'Cancelado',
};

export function buildProjectFilterOptions(projects: OrgProject[]) {
  const clientesMap = new Map<string, string>();
  const produtosSet = new Set<string>();
  const statusSet = new Set<string>();
  for (const project of projects) {
    if (project.external_client_id && project.external_client?.nome) {
      clientesMap.set(project.external_client_id, project.external_client.nome);
    }
    if (project.servico_contratado) produtosSet.add(project.servico_contratado);
    if (project.status) statusSet.add(project.status);
  }
  return {
    clientes: Array.from(clientesMap, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
    produtos: Array.from(produtosSet).sort(),
    status: Array.from(statusSet),
  };
}

export function getProjectSortValue(project: OrgProject, column: ProjectSortColumn): string {
  switch (column) {
    case 'name': return project.name || '';
    case 'produto': return project.servico_contratado || '';
    case 'servico': return project.servico_nome || '';
    case 'cliente': return project.external_client?.nome || '';
    case 'equipe': return project.equipe_ref?.name || '';
    case 'pessoas': return project.responsible ? `${project.responsible.first_name} ${project.responsible.last_name}` : '';
    case 'status': return project.status || '';
  }
}

export function filterAndSortProjects(
  projects: OrgProject[],
  filters: ProjectFilters,
  sortColumn: ProjectSortColumn | null,
  sortDirection: SortDirection,
): OrgProject[] {
  const filtered = projects.filter(project =>
    (!filters.cliente || project.external_client_id === filters.cliente)
    && (!filters.produto || project.servico_contratado === filters.produto)
    && (!filters.status || project.status === filters.status));
  if (!sortColumn) return filtered;
  return filtered.sort((a, b) => {
    const comparison = getProjectSortValue(a, sortColumn).toLowerCase()
      .localeCompare(getProjectSortValue(b, sortColumn).toLowerCase(), 'pt-BR');
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

export function groupProjects(
  projects: OrgProject[],
  groupBy: ProjectGroupBy,
  projectMemberAreas: Record<string, ProjectMemberAreas>,
): ProjectGroup[] | null {
  if (groupBy === 'none') return null;
  const groups = new Map<string, ProjectGroup>();
  for (const project of projects) {
    let key: string;
    let label: string;
    if (groupBy === 'cliente') {
      key = project.external_client_id || '__none__';
      label = project.external_client?.nome || 'Sem cliente';
    } else if (groupBy === 'area') {
      const areas = projectMemberAreas[project.id];
      key = areas?.names.length ? areas.ids.join('|') : '__none__';
      label = areas?.names.length ? areas.names.join(' + ') : 'Sem área';
    } else {
      key = project.equipe_id || '__none__';
      label = project.equipe_ref?.name || 'Sem equipe';
    }
    if (!groups.has(key)) groups.set(key, { label, projects: [] });
    groups.get(key)?.projects.push(project);
  }
  return [...groups.values()].sort((a, b) => {
    const aIsNone = a.label.startsWith('Sem ');
    const bIsNone = b.label.startsWith('Sem ');
    if (aIsNone !== bIsNone) return aIsNone ? 1 : -1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

export function validateProjectForm(
  form: OrgProjectFormData,
  hasSelectedOsProducts: boolean,
  selectedProdutoId: string | null,
): string | null {
  if (!form.external_client_id) return 'Selecione o Cliente';
  if (hasSelectedOsProducts && !selectedProdutoId) return 'Selecione o Produto Contratado';
  if (!form.name.trim()) return 'Nome é obrigatório';
  if (!form.equipe_id) return 'Selecione a Equipe';
  if (!form.status) return 'Selecione o Status';
  if (form.leader_ids.length === 0) return 'Selecione ao menos um Líder Geral';
  if (!form.responsible_id) return 'Selecione o Responsável Executor';
  if (form.member_ids.length === 0) return 'Selecione ao menos um Membro do Projeto';
  if (!form.start_date) return 'Data de Início é obrigatória';
  if (!form.end_date) return 'Data de Término é obrigatória';
  if (form.start_date > form.end_date) return 'Data de Término deve ser posterior à Data de Início';
  if (!form.description.trim()) return 'Descrição do Projeto é obrigatória';
  return null;
}
