import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';

export interface ProjetosTarefasOs {
  os_id: string;
  numero_os: string | null;
  cliente_id: string;
  cliente_nome: string;
  servico_nome: string | null;
  data_fim: string | null;
  produtos?: string | null;
}

export interface ProjetosTarefasTaskNode {
  task: OrgTask;
  children: ProjetosTarefasTaskNode[];
}

export interface ProjetosTarefasProjectNode {
  project: OrgProject | null;
  clientId: string | null;
  clientName: string;
  tasks: ProjetosTarefasTaskNode[];
  taskCount: number;
  completedTaskCount: number;
}

export interface ProjetosTarefasOsGroup {
  id: string;
  os: ProjetosTarefasOs | null;
  hasLinkedOs: boolean;
  clientId: string | null;
  clientName: string;
  clientKey: string;
  projects: ProjetosTarefasProjectNode[];
  taskCount: number;
  completedTaskCount: number;
}

function normalize(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function extractProductAcronyms(value: string | null | undefined) {
  return (value || '')
    .split(',')
    .map(product => product.trim().split(/\s+[—–-]\s+/, 1)[0].trim())
    .filter(Boolean);
}

function buildTaskTree(tasks: OrgTask[]) {
  const nodes = new Map(tasks.map(task => [task.id, { task, children: [] } as ProjetosTarefasTaskNode]));
  const roots: ProjetosTarefasTaskNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.task.parent_task_id ? nodes.get(node.task.parent_task_id) : null;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (items: ProjetosTarefasTaskNode[]) => {
    items.sort((a, b) => a.task.title.localeCompare(b.task.title, 'pt-BR'));
    items.forEach(item => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

function filterTaskTree(nodes: ProjetosTarefasTaskNode[], search: string): ProjetosTarefasTaskNode[] {
  return nodes.flatMap(node => {
    const children = filterTaskTree(node.children, search);
    const matches = normalize(`${node.task.title} ${node.task.description} ${node.task.assigned_to_name}`).includes(search);
    return matches || children.length > 0 ? [{ ...node, children: matches ? node.children : children }] : [];
  });
}

export function buildProjetosTarefasHierarchy(
  projects: OrgProject[],
  tasks: OrgTask[],
  osRows: ProjetosTarefasOs[],
  search = '',
  // Com filtros ativos, esconde projetos/OS/clientes que ficaram sem nenhuma tarefa
  // após a filtragem. Sem filtros, projetos vazios permanecem visíveis para permitir
  // navegar a estrutura e adicionar tarefas.
  hideEmpty = false,
): ProjetosTarefasOsGroup[] {
  const normalizedSearch = normalize(search.trim());
  const osById = new Map(osRows.map(os => [os.os_id, os]));
  const tasksByProject = new Map<string, OrgTask[]>();
  const projectIds = new Set(projects.map(project => project.id));

  for (const task of tasks) {
    const projectId = task.project_id && projectIds.has(task.project_id) ? task.project_id : '__without_project__';
    const projectTasks = tasksByProject.get(projectId) || [];
    projectTasks.push(task);
    tasksByProject.set(projectId, projectTasks);
  }

  const projectNodes: ProjetosTarefasProjectNode[] = [...projects.map(project => {
    const projectTasks = tasksByProject.get(project.id) || [];
    return {
      project,
      clientId: project.external_client_id,
      clientName: project.external_client?.nome || 'Cliente não informado',
      tasks: buildTaskTree(projectTasks),
      taskCount: projectTasks.length,
      completedTaskCount: projectTasks.filter(task => task.status === 'done').length,
    };
  })];

  const tasksWithoutProject = tasksByProject.get('__without_project__') || [];
  const orphanTasksByClient = new Map<string, OrgTask[]>();
  for (const task of tasksWithoutProject) {
    const clientKey = task.client_id || '__without_client__';
    const clientTasks = orphanTasksByClient.get(clientKey) || [];
    clientTasks.push(task);
    orphanTasksByClient.set(clientKey, clientTasks);
  }
  for (const [clientKey, clientTasks] of orphanTasksByClient) {
    const clientName = clientTasks.find(task => task.client?.nome)?.client?.nome || 'Cliente não informado';
    projectNodes.push({
      project: null,
      clientId: clientKey === '__without_client__' ? null : clientKey,
      clientName,
      tasks: buildTaskTree(clientTasks),
      taskCount: clientTasks.length,
      completedTaskCount: clientTasks.filter(task => task.status === 'done').length,
    });
  }

  const visibleProjectNodes = hideEmpty
    ? projectNodes.filter(projectNode => projectNode.taskCount > 0)
    : projectNodes;

  const groups = new Map<string, ProjetosTarefasOsGroup>();
  for (const projectNode of visibleProjectNodes) {
    const osId = projectNode.project?.ordem_servico_id || null;
    const os = osId ? osById.get(osId) || null : null;
    const clientId = os?.cliente_id || projectNode.clientId;
    const clientName = os?.cliente_nome || projectNode.clientName;
    // Cadastros legados podem ter UUIDs distintos para o mesmo cliente. Sem uma OS
    // para fornecer a identidade canônica, o nome exibido é a chave mais estável.
    const clientGroupKey = normalize(clientName) || '__without_client__';
    const groupId = osId || `__without_os__:${clientGroupKey}`;
    const group = groups.get(groupId) || {
      id: groupId,
      os,
      hasLinkedOs: Boolean(osId),
      clientId,
      clientName,
      clientKey: clientGroupKey,
      projects: [],
      taskCount: 0,
      completedTaskCount: 0,
    };
    group.projects.push(projectNode);
    group.taskCount += projectNode.taskCount;
    group.completedTaskCount += projectNode.completedTaskCount;
    groups.set(groupId, group);
  }

  let result = [...groups.values()].sort((a, b) => {
    const byClient = a.clientName.localeCompare(b.clientName, 'pt-BR');
    if (byClient !== 0) return byClient;
    if (!a.os && b.os) return 1;
    if (a.os && !b.os) return -1;
    if (!a.os || !b.os) return 0;
    return (a.os.numero_os || '').localeCompare(b.os.numero_os || '', 'pt-BR', { numeric: true });
  });
  result.forEach(group => group.projects.sort((a, b) => {
    if (!a.project) return 1;
    if (!b.project) return -1;
    return a.project.name.localeCompare(b.project.name, 'pt-BR');
  }));

  if (normalizedSearch) {
    result = result.flatMap(group => {
      const osMatches = normalize(`${group.os?.numero_os} ${group.os?.cliente_nome} ${group.os?.servico_nome}`).includes(normalizedSearch);
      if (osMatches) return [group];

      const projects = group.projects.flatMap(projectNode => {
        const projectMatches = normalize(`${projectNode.project?.name} ${projectNode.project?.description} ${projectNode.project?.external_client?.nome}`).includes(normalizedSearch);
        if (projectMatches) return [projectNode];
        const filteredTasks = filterTaskTree(projectNode.tasks, normalizedSearch);
        return filteredTasks.length > 0 ? [{ ...projectNode, tasks: filteredTasks }] : [];
      });
      return projects.length > 0 ? [{ ...group, projects }] : [];
    });
  }

  return result;
}
