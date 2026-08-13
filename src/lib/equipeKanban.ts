import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface EquipeKanbanDeliverable {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  actual_hours?: number | null;
  due_date: string | null;
  start_date: string | null;
  parent_id: string | null;
  task_code: string | null;
}

export interface EquipeKanbanSprint {
  id: string;
  name: string;
  project_id: string | null;
}

export interface EquipeKanbanProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface EquipeKanbanProject {
  id: string;
  name: string;
}

export interface EquipeKanbanProcess {
  id: string;
  name: string;
  project_id: string | null;
}

export interface EquipeKanbanAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  uploaded_at: string;
}

export interface EquipeKanbanEditForm {
  title: string;
  description: string;
  assigned_to: string;
  status: string;
  start_date: string;
  due_date: string;
  estimated_hours: string;
  actual_hours: string;
}

/** Uma subtarefa achatada para exibição: traz o nível de aninhamento e as horas a mostrar. */
export interface EquipeKanbanSubtaskRow extends EquipeKanbanDeliverable {
  /** 0 = filha direta, 1 = neta, 2 = bisneta... — usado para indentar na tela. */
  depth: number;
  /** Tem filhas? (é uma sub-mãe) — nesse caso a linha mostra a soma das folhas, não as horas próprias. */
  hasChildren: boolean;
  /** Horas a exibir na linha: as próprias (folha) ou a soma das folhas do ramo (tem filhas). */
  hoursDisplay: number | null;
}

export interface HierarchicalEquipeKanbanDeliverable extends EquipeKanbanDeliverable {
  /** TODOS os descendentes (filhas, netas, ...) em ordem DFS por código — mantidos aninhados sob a raiz. */
  subtasks: EquipeKanbanSubtaskRow[];
  /** Total de descendentes (todos os níveis). */
  subtaskCount: number;
  /** Descendentes concluídos. */
  completedSubtasks: number;
  /** Descendentes ainda abertos (qualquer status != completed). */
  openSubtasks: number;
  /** Soma das horas das folhas do ramo — mostrada no card da tarefa-pai (não duplica: só folhas). */
  subtaskHoursTotal: number;
}

export interface EquipeKanbanFilters {
  sprint: string;
  responsible: string;
  project: string;
  process: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export type EquipeKanbanDeliverableUpdate = {
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  completed_at?: string | null;
};

// O filtro é pela extensão, não pelo mime: o navegador não é confiável ao dizer
// o tipo de arquivos de texto (um .md chega como 'text/markdown', 'text/plain'
// ou string vazia, dependendo do sistema), e é da extensão que sai o caminho no
// bucket. Como o mime também é informado pelo cliente, nada se perde em
// segurança ao deixar de checá-lo.
const ALLOWED_FILE_EXTENSIONS = [
  // documentos
  'pdf',
  'doc',
  'docx',
  'odt',
  'rtf',
  'xls',
  'xlsx',
  'xlsm',
  'ods',
  'ppt',
  'pptx',
  'odp',
  // texto
  'md',
  'markdown',
  'txt',
  'csv',
  'json',
  // imagens
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  // compactados
  'zip',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const EQUIPE_KANBAN_FILE_ACCEPT = ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export function filterEquipeKanbanDeliverables(
  deliverables: EquipeKanbanDeliverable[],
  sprints: EquipeKanbanSprint[],
  processes: EquipeKanbanProcess[],
  filters: EquipeKanbanFilters,
) {
  return deliverables.filter((deliverable) => {
    if (filters.sprint !== 'all' && deliverable.sprint_id !== filters.sprint) return false;
    if (filters.responsible !== 'all' && deliverable.assigned_to !== filters.responsible)
      return false;
    const sprint = sprints.find((item) => item.id === deliverable.sprint_id);
    if (filters.project !== 'all' && (!sprint || sprint.project_id !== filters.project))
      return false;
    if (filters.process !== 'all') {
      const process = processes.find((item) => item.id === filters.process);
      if (!process || !sprint || sprint.project_id !== process.project_id) return false;
    }
    if (filters.startDate && deliverable.start_date) {
      if (new Date(`${deliverable.start_date}T00:00:00`) < filters.startDate) return false;
    }
    if (filters.endDate && deliverable.due_date) {
      if (new Date(`${deliverable.due_date}T00:00:00`) > filters.endDate) return false;
    }
    return true;
  });
}

/**
 * Decide o que fica visível a partir de quem bateu no filtro.
 *
 * Além dos próprios itens filtrados, mantém:
 * - as FILHAS abaixo de quem bateu. A tarefa-mãe é só um agrupador: quando ela entra na visão, o
 *   grupo inteiro entra com ela. Sem isso, subtarefa com responsável em branco (ou de outra pessoa,
 *   ou sem sprint) era descartada e a mãe aparecia como card vazio, sem contador de subtarefas — as
 *   tarefas existiam na sprint e não apareciam em lugar nenhum do quadro.
 * - a cadeia de MÃES acima (mãe, avó, ...) **quando `keepAncestors`**, pra subtarefa continuar
 *   aninhada sob a raiz. Com filtro por pessoa isso atrapalha: a filha do Alexandre sob mãe do
 *   Eduardo ficava dentro do card do Eduardo, na coluna DELE, e nunca na coluna do próprio status.
 *   Sem a mãe na visão, a filha é promovida a card próprio (ver buildEquipeKanbanHierarchy).
 */
export function selectEquipeKanbanVisibleDeliverables(
  deliverables: EquipeKanbanDeliverable[],
  directMatchIds: Set<string>,
  { keepAncestors = true }: { keepAncestors?: boolean } = {},
) {
  const byId = new Map(deliverables.map((item) => [item.id, item]));
  const childrenByParent = new Map<string, string[]>();
  for (const item of deliverables) {
    if (!item.parent_id) continue;
    const list = childrenByParent.get(item.parent_id) ?? [];
    list.push(item.id);
    childrenByParent.set(item.parent_id, list);
  }

  const keep = new Set<string>();
  directMatchIds.forEach((id) => {
    if (!byId.has(id)) return;
    keep.add(id);
    if (keepAncestors) {
      const visited = new Set<string>();
      let parentId = byId.get(id)?.parent_id ?? null;
      while (parentId && byId.has(parentId) && !visited.has(parentId)) {
        keep.add(parentId);
        visited.add(parentId);
        parentId = byId.get(parentId)?.parent_id ?? null;
      }
    }
    // Desce só a partir de quem bateu no filtro (não puxa irmãs da mãe herdada).
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const childId of childrenByParent.get(current) ?? []) {
        if (keep.has(childId)) continue;
        keep.add(childId);
        stack.push(childId);
      }
    }
  });
  return deliverables.filter((item) => keep.has(item.id));
}

const sortByTaskCode = (a: EquipeKanbanDeliverable, b: EquipeKanbanDeliverable) =>
  a.task_code && b.task_code
    ? a.task_code.localeCompare(b.task_code, undefined, { numeric: true })
    : 0;

export function buildEquipeKanbanHierarchy(
  deliverables: EquipeKanbanDeliverable[],
): HierarchicalEquipeKanbanDeliverable[] {
  // Filhas por mãe (qualquer nível), ordenadas por código.
  const childrenByParent = new Map<string, EquipeKanbanDeliverable[]>();
  for (const item of deliverables) {
    if (!item.parent_id) continue;
    const list = childrenByParent.get(item.parent_id) ?? [];
    list.push(item);
    childrenByParent.set(item.parent_id, list);
  }
  for (const list of childrenByParent.values()) list.sort(sortByTaskCode);

  const hasChildren = (id: string) => (childrenByParent.get(id)?.length ?? 0) > 0;

  // Soma das horas das FOLHAS do ramo (não conta sub-mães) — evita duplicar horas.
  const leafHours = (id: string, ownHours: number | null): number => {
    const children = childrenByParent.get(id);
    if (!children || children.length === 0) return ownHours || 0;
    return children.reduce((sum, child) => sum + leafHours(child.id, child.estimated_hours), 0);
  };

  // Achata todos os descendentes em DFS (por código), anotando profundidade e horas a exibir.
  const flattenDescendants = (id: string, depth: number, acc: EquipeKanbanSubtaskRow[]) => {
    for (const child of childrenByParent.get(id) ?? []) {
      const childHasChildren = hasChildren(child.id);
      acc.push({
        ...child,
        depth,
        hasChildren: childHasChildren,
        hoursDisplay: childHasChildren
          ? leafHours(child.id, child.estimated_hours) || null
          : child.estimated_hours,
      });
      flattenDescendants(child.id, depth + 1, acc);
    }
    return acc;
  };

  // Raiz = sem mãe OU cuja mãe não está na lista visível (dado inconsistente/filtro) —
  // assim uma subtarefa nunca some da tela; no fluxo normal a mãe é puxada de volta.
  const presentIds = new Set(deliverables.map((item) => item.id));
  return deliverables
    .filter((item) => !item.parent_id || !presentIds.has(item.parent_id))
    .sort(sortByTaskCode)
    .map((root) => {
      const subtasks = flattenDescendants(root.id, 0, []);
      return {
        ...root,
        subtasks,
        subtaskCount: subtasks.length,
        completedSubtasks: subtasks.filter((item) => item.status === 'completed').length,
        openSubtasks: subtasks.filter((item) => item.status !== 'completed').length,
        // Só exibição — não é gravado. A mãe pode ficar com horas em branco no banco
        // (as métricas já excluem as tarefas-mãe da soma, então não duplica).
        subtaskHoursTotal: leafHours(root.id, root.estimated_hours),
      };
    });
}

// Colunas do quadro. A coluna é escolhida por igualdade de status, então qualquer valor fora
// desta lista — inclusive null, que o banco aceita — não casava com coluna nenhuma e o card
// simplesmente desaparecia do quadro (sem erro e sem entrar no contador de ocultas). A tela da
// sprint sempre mostrou esses casos como "Pendente"; aqui aplicamos o mesmo fallback.
const BOARD_STATUSES = new Set(['pending', 'in_progress', 'completed']);

export function normalizeEquipeKanbanStatus(status: string | null | undefined) {
  return status && BOARD_STATUSES.has(status) ? status : 'pending';
}

/**
 * Mãe concluída com subtarefa aberta: o card dela cai na coluna "Concluído" e as subtarefas
 * vêm fechadas, então a tarefa aberta some do quadro. Sinaliza esses casos para o board
 * destacar e abrir o aninhamento sozinho.
 */
export function hasOpenSubtasksUnderCompletedParent(
  deliverable: HierarchicalEquipeKanbanDeliverable,
) {
  return deliverable.status === 'completed' && deliverable.openSubtasks > 0;
}

/**
 * Mãe fora da coluna "A Fazer" (em progresso ou concluída) que guarda subtarefa aberta:
 * a subtarefa segue aninhada no card da mãe, na coluna DA MÃE, então quem olha a coluna
 * "A Fazer" não a encontra. Usado para abrir o aninhamento sozinho e para avisar na barra
 * de filtros quantas tarefas abertas estão nessa situação.
 */
export function hidesOpenSubtasksOutsideItsColumn(
  deliverable: HierarchicalEquipeKanbanDeliverable,
) {
  return (
    normalizeEquipeKanbanStatus(deliverable.status) !== 'pending' && deliverable.openSubtasks > 0
  );
}

/** Soma das subtarefas abertas que estão aninhadas em mães fora da coluna "A Fazer". */
export function countOpenSubtasksOutsideTodoColumn(
  deliverables: HierarchicalEquipeKanbanDeliverable[],
) {
  return deliverables
    .filter(hidesOpenSubtasksOutsideItsColumn)
    .reduce((total, parent) => total + parent.openSubtasks, 0);
}

export function getEquipeKanbanColumnDeliverables(
  deliverables: HierarchicalEquipeKanbanDeliverable[],
  columnId: string,
  sortDirection: 'asc' | 'desc' | null,
) {
  const items = deliverables.filter(
    (item) => normalizeEquipeKanbanStatus(item.status) === columnId,
  );
  if (!sortDirection) return items;
  return [...items].sort((a, b) => {
    const dateA = a.due_date ? new Date(`${a.due_date}T00:00:00`).getTime() : Infinity;
    const dateB = b.due_date ? new Date(`${b.due_date}T00:00:00`).getTime() : Infinity;
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });
}

export function getEquipeKanbanSubtasks(deliverables: EquipeKanbanDeliverable[], parentId: string) {
  return deliverables.filter((item) => item.parent_id === parentId).sort(sortByTaskCode);
}

export function buildDeliverableStatusPayload(status: string) {
  return { status, completed_at: status === 'completed' ? new Date().toISOString() : null };
}

export function buildDeliverableUpdatePayload(
  form: EquipeKanbanEditForm,
  previousStatus: string,
): EquipeKanbanDeliverableUpdate {
  const payload: EquipeKanbanDeliverableUpdate = {
    title: form.title,
    description: form.description || null,
    assigned_to: form.assigned_to || null,
    status: form.status,
    start_date: form.start_date || null,
    due_date: form.due_date || null,
    estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
    actual_hours: form.actual_hours ? parseFloat(form.actual_hours) : null,
  };
  if (form.status === 'completed' && previousStatus !== 'completed') {
    payload.completed_at = new Date().toISOString();
  } else if (form.status !== 'completed') {
    payload.completed_at = null;
  }
  return payload;
}

export function validateEquipeKanbanFile(file: File) {
  const extensao = (file.name.split('.').pop() ?? '').toLowerCase();
  // Nome sem ponto cai aqui também: sem extensão não há como montar o caminho.
  if (!file.name.includes('.') || !ALLOWED_FILE_EXTENSIONS.includes(extensao)) {
    return 'Tipo de arquivo não permitido. Use PDF, Word, Excel, PowerPoint, imagens, texto (md, txt, csv, json) ou ZIP.';
  }
  if (file.size > MAX_FILE_SIZE) return 'Arquivo muito grande. Máximo 10MB.';
  return null;
}

export function buildEquipeKanbanFilePath(deliverableId: string, file: File) {
  return `${deliverableId}/${Date.now()}.${file.name.split('.').pop()}`;
}

export function formatEquipeKanbanDueDate(dateString: string | null) {
  if (!dateString) return '-';
  try {
    return format(new Date(`${dateString}T00:00:00`), 'dd/MM', { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function formatEquipeKanbanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getEquipeKanbanErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null || !('message' in error)) return fallback;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message ? message : fallback;
}
