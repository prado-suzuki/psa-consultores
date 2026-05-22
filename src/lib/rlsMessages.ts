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
