/**
 * Audit log field formatting utilities.
 * Translates field names, resolves UUIDs, formats dates,
 * groups related fields and translates enum values.
 */

// ── Field name translations ──────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  assigned_to: 'Responsável',
  assigned_to_name: '__HIDDEN__', // grouped with assigned_to
  status: 'Status',
  priority: 'Prioridade',
  due_date: 'Data de Entrega',
  start_date: 'Data de Início',
  end_date: 'Data Final',
  due_time: 'Horário',
  title: 'Título',
  name: 'Nome',
  description: 'Descrição',
  category: 'Categoria',
  tags: 'Tags',
  project_id: 'Projeto',
  client_id: 'Cliente',
  external_client_id: 'Cliente Externo',
  contribuinte_id: 'Contribuinte',
  parent_task_id: 'Tarefa Pai',
  categoria_id: 'Categoria do Projeto',
  is_recurring: 'Recorrente',
  recurrence_type: 'Tipo de Recorrência',
  department: 'Departamento',
  objective: 'Objetivo',
  area_id: 'Área',
  responsible_id: 'Responsável',
  leader_id: 'Líder',
};

// ── Status translations ──────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Revisão',
  done: 'Concluído',
  pending: 'Pendente',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  waiting_client: 'Pendente Cliente',
  active: 'Ativo',
  inactive: 'Inativo',
  archived: 'Arquivado',
};

// ── Priority translations ────────────────────────────────────
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

// ── Recurrence translations ──────────────────────────────────
const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

// ── Boolean translations ─────────────────────────────────────
const BOOL_LABELS: Record<string, string> = {
  true: 'Sim',
  false: 'Não',
};

// ── UUID detection ───────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Date detection (ISO date: YYYY-MM-DD) ────────────────────
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Fields whose UUID values should be resolved via lookup maps
const UUID_FIELDS: Record<string, string> = {
  assigned_to: 'profiles',
  responsible_id: 'profiles',
  leader_id: 'profiles',
  project_id: 'projects',
  area_id: 'areas',
  client_id: 'clients',
  external_client_id: 'clients',
  contribuinte_id: 'contribuintes',
  categoria_id: 'categorias',
  parent_task_id: 'tasks',
  performed_by: 'profiles',
};

// Fields that contain dates
const DATE_FIELDS = new Set([
  'due_date', 'start_date', 'end_date',
]);

// Fields that contain enum values
const ENUM_FIELDS: Record<string, Record<string, string>> = {
  status: STATUS_LABELS,
  priority: PRIORITY_LABELS,
  recurrence_type: RECURRENCE_LABELS,
};

// Fields that contain booleans
const BOOLEAN_FIELDS = new Set(['is_recurring']);

export interface LookupMaps {
  profiles: Record<string, string>;
  projects: Record<string, string>;
  areas: Record<string, string>;
  clients: Record<string, string>;
  contribuintes: Record<string, string>;
  categorias: Record<string, string>;
  tasks: Record<string, string>;
}

export interface FormattedChange {
  label: string;
  oldValue: string;
  newValue: string;
}

function formatDate(val: string): string {
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

function formatValue(
  field: string,
  val: unknown,
  lookups: LookupMaps,
): string {
  if (val === null || val === undefined || val === '') return '(vazio)';

  const str = String(val);

  // Boolean fields
  if (BOOLEAN_FIELDS.has(field)) {
    return BOOL_LABELS[str] ?? str;
  }

  // Enum fields
  if (ENUM_FIELDS[field]) {
    return ENUM_FIELDS[field][str] ?? str;
  }

  // Date fields
  if (DATE_FIELDS.has(field) && ISO_DATE_REGEX.test(str)) {
    return formatDate(str);
  }

  // UUID resolution
  if (UUID_FIELDS[field] && UUID_REGEX.test(str)) {
    const mapKey = UUID_FIELDS[field] as keyof LookupMaps;
    return lookups[mapKey]?.[str] ?? str;
  }

  // Tags (arrays)
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '(vazio)';
  }

  return str;
}

/**
 * Transform raw changed_fields into a user-friendly list.
 */
export function formatChangedFields(
  changedFields: Record<string, { old: unknown; new: unknown }>,
  lookups: LookupMaps,
): FormattedChange[] {
  const entries = { ...changedFields };
  const result: FormattedChange[] = [];

  // ── Group assigned_to + assigned_to_name ───────────────────
  if ('assigned_to' in entries && 'assigned_to_name' in entries) {
    const nameEntry = entries['assigned_to_name'];
    result.push({
      label: 'Responsável',
      oldValue: formatValue('assigned_to_name', nameEntry.old, lookups),
      newValue: formatValue('assigned_to_name', nameEntry.new, lookups),
    });
    delete entries['assigned_to'];
    delete entries['assigned_to_name'];
  }

  // ── Process remaining fields ───────────────────────────────
  for (const [field, vals] of Object.entries(entries)) {
    // Skip hidden fields
    if (FIELD_LABELS[field] === '__HIDDEN__') continue;

    const oldFormatted = formatValue(field, vals.old, lookups);
    const newFormatted = formatValue(field, vals.new, lookups);

    // Skip if both are empty or identical
    if (oldFormatted === newFormatted) continue;

    const label = FIELD_LABELS[field] ?? field;
    result.push({ label, oldValue: oldFormatted, newValue: newFormatted });
  }

  return result;
}
