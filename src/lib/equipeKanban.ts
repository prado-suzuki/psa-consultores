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

export interface HierarchicalEquipeKanbanDeliverable extends EquipeKanbanDeliverable {
  subtasks: EquipeKanbanDeliverable[];
  subtaskCount: number;
  completedSubtasks: number;
  /** Soma das horas estimadas das subtarefas — mostrada no card da tarefa-pai. */
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

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

const sortByTaskCode = (a: EquipeKanbanDeliverable, b: EquipeKanbanDeliverable) =>
  a.task_code && b.task_code
    ? a.task_code.localeCompare(b.task_code, undefined, { numeric: true })
    : 0;

export function buildEquipeKanbanHierarchy(deliverables: EquipeKanbanDeliverable[]) {
  const subtasksByParent: Record<string, EquipeKanbanDeliverable[]> = {};
  deliverables
    .filter((item) => item.parent_id)
    .forEach((subtask) => {
      if (!subtask.parent_id) return;
      (subtasksByParent[subtask.parent_id] ||= []).push(subtask);
    });
  Object.values(subtasksByParent).forEach((subtasks) => subtasks.sort(sortByTaskCode));
  return deliverables
    .filter((item) => !item.parent_id)
    .map((parent) => {
      const subtasks = subtasksByParent[parent.id] || [];
      return {
        ...parent,
        subtasks,
        subtaskCount: subtasks.length,
        completedSubtasks: subtasks.filter((item) => item.status === 'completed').length,
        // Calculado só para exibição — não é gravado, então a pai pode ficar com horas em
        // branco no banco (evita duplicar nas métricas, que já excluem as tarefas-pai da soma).
        subtaskHoursTotal: subtasks.reduce((sum, item) => sum + (item.estimated_hours || 0), 0),
      };
    });
}

export function getEquipeKanbanColumnDeliverables(
  deliverables: HierarchicalEquipeKanbanDeliverable[],
  columnId: string,
  sortDirection: 'asc' | 'desc' | null,
) {
  const items = deliverables.filter((item) => item.status === columnId);
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
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Tipo de arquivo não permitido. Use PDF, Word, Excel, imagens ou ZIP.';
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
