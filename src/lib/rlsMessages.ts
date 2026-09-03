export type RlsPrecheckReason =
  | 'rls_blocked'
  | 'grant_missing'
  | 'trigger_blocked'
  | 'row_not_found';

export type RlsRequiredRole =
  | 'team_member'
  | 'sublider'
  | 'lider'
  | 'admin';

export interface RlsPrecheckResult {
  allowed: boolean;
  reason?: RlsPrecheckReason | null;
  required_role?: RlsRequiredRole | null;
  message?: string | null;
}

const ROLE_LABEL: Record<RlsRequiredRole, string> = {
  team_member: 'Membro de equipe',
  sublider: 'Sublíder',
  lider: 'Líder',
  admin: 'Admin',
};

export function rlsMessage(r: RlsPrecheckResult): string {
  if (r.reason === 'trigger_blocked' && r.message) return r.message;
  if (r.reason === 'grant_missing') return 'Operação não permitida para o seu perfil.';
  if (r.reason === 'row_not_found') return 'Registro não encontrado ou já removido.';
  if (r.reason === 'rls_blocked' && r.required_role) {
    return `Você precisa do papel "${ROLE_LABEL[r.required_role]}" ou superior para realizar essa ação.`;
  }
  return 'Você não tem permissão para realizar essa ação.';
}

/**
 * Extrai a mensagem de um erro qualquer.
 * Cobre `Error`, objetos simples do supabase-js (`{ message, code, details, hint }`)
 * e strings. Retorna null quando não há mensagem utilizável.
 */
export function extractErrorMessage(error: unknown): string | null {
  let raw: unknown = null;

  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    raw = (error as { message?: unknown }).message;
  }

  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const TASK_SAVE_FALLBACK = 'Não foi possível salvar a tarefa. Tente novamente.';

// A lista tem de espelhar a whitelist do trigger `org_tasks_team_member_status_only`.
// Contribuinte entrou nela em 26/08/2026 e o texto aqui tinha ficado atrás, dizendo
// ao usuário que ele não podia mexer num campo que já salvava.
const TEAM_MEMBER_STATUS_ONLY_MESSAGE =
  'Esta tarefa foi criada por outra pessoa. Você pode alterar status, horas, revisor e contribuinte. ' +
  'Título, descrição e os demais campos só quem criou a tarefa pode mudar.';

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Mensagem a exibir ao usuário quando o save de tarefa falha.
 * Traduz o bloqueio do trigger `org_tasks_team_member_status_only` (RLS-06)
 * e preserva qualquer outra mensagem do banco.
 */
export function taskSaveErrorMessage(
  error: unknown,
  options?: { prefix?: string },
): string {
  const message = extractErrorMessage(error);
  if (!message) return TASK_SAVE_FALLBACK;

  if (normalizeForMatch(message).includes('so pode alterar status')) {
    return TEAM_MEMBER_STATUS_ONLY_MESSAGE;
  }

  return options?.prefix ? `${options.prefix}${message}` : message;
}
