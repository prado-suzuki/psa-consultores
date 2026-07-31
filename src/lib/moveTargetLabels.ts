// Rótulos dos projetos nos modais de "mover tarefa" (avulsa e em lote).
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
import { STATUS_LABELS } from '@/lib/projetosCadastro';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

export function clientName(project: OrgProject | null | undefined) {
  return project?.external_client?.nome || 'Cliente não informado';
}

export function normalizeSearch(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Rótulos que diferenciam projetos homônimos: projetos duplicados (mesmo nome,
 * mesmo cliente) só se distinguem pela OS, pelo status e pelo volume de tarefas
 * — é o que decide qual é o que fica.
 */
export function buildProjectHint(tasks: OrgTask[], osRows: ProjetosTarefasOs[]) {
  const osLabelById = new Map<string, string>();
  for (const row of osRows) {
    if (!row.numero_os) continue;
    osLabelById.set(row.os_id, /^os/i.test(row.numero_os) ? row.numero_os : `OS ${row.numero_os}`);
  }

  const taskCountByProject = new Map<string, number>();
  for (const item of tasks) {
    if (!item.project_id) continue;
    taskCountByProject.set(item.project_id, (taskCountByProject.get(item.project_id) || 0) + 1);
  }

  const osLabel = (project: OrgProject) => (project.ordem_servico_id
    ? osLabelById.get(project.ordem_servico_id) || 'OS vinculada'
    : 'Sem OS');

  return {
    osLabel,
    hint: (project: OrgProject) => [
      osLabel(project),
      STATUS_LABELS[project.status] || project.status,
      `${taskCountByProject.get(project.id) || 0} tarefa(s)`,
    ].join(' · '),
    searchable: (project: OrgProject) => `${project.name} ${project.external_client?.nome} ${osLabel(project)}`,
  };
}
