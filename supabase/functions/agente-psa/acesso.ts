// Hierarquia de papéis do agente, em UM lugar. Ela decide duas coisas: quem
// conversa em cada escopo e quem RECEBE notificação daquele escopo — e as duas
// precisam concordar, senão alguém recebe pop-up de uma tela onde não pode
// perguntar nada. É o motivo de a tabela de notificações não ter policy para
// `authenticated`: replicar isto em SQL criaria a segunda definição.

/** Fora daqui (client, timecliente, marketing): sem acesso ao agente. */
export const RANK: Record<string, number> = {
  team_member: 1,
  sublider: 2,
  lider: 3,
  admin: 4,
};

export interface Sessao {
  userId: string;
  roles: Set<string>;
  isAdmin: boolean;
  rank: number;
}

export function rankDeRoles(roles: Iterable<string>): number {
  return Math.max(0, ...[...roles].map((r) => RANK[r] ?? 0));
}

/**
 * `null` quando pode; string com o motivo quando não pode.
 * Escopo desativado bloqueia todo mundo, admin incluído: desativar é decisão
 * do cockpit, não sugestão.
 */
export function motivoDeBloqueio(
  config: { ativo: boolean; nivel_acesso: string },
  sessao: Sessao,
): string | null {
  if (!config.ativo) return 'O agente está desativado para esta tela.';
  const exigido = RANK[config.nivel_acesso] ?? 4;
  if (sessao.rank < exigido) {
    return `Esta tela exige papel "${config.nivel_acesso}" ou superior para conversar com o agente.`;
  }
  return null;
}
