// Funções puras de filtragem de equipe/pessoas do cadastro de projeto.
// Extraídas de useProjetosCadastroController para serem compartilhadas entre o
// cadastro de projeto único e o cadastro em lote a partir de uma OS.

export interface RoleAssignment {
  user_id: string;
  role: string;
}

export interface MemberAreaGroup<T> {
  members: T[];
}

/**
 * Líderes elegíveis: perfis com papel 'lider'. Quando há equipe selecionada com
 * líderes definidos, restringe aos líderes da equipe (mantendo os já escolhidos);
 * se o filtro esvaziar a lista, cai de volta para todos os líderes.
 */
export function computeLideres<T extends { id: string }>(
  teamMembers: T[],
  userRoles: RoleAssignment[],
  equipeId: string | null,
  equipeLiderIds: string[],
  selectedLeaderIds: string[],
): T[] {
  const leaderRoleIds = userRoles.filter(role => role.role === 'lider').map(role => role.user_id);
  const allLeaders = teamMembers.filter(member => leaderRoleIds.includes(member.id));
  if (equipeId && equipeLiderIds.length > 0) {
    const selected = new Set(selectedLeaderIds);
    const filtered = allLeaders.filter(member => equipeLiderIds.includes(member.id) || selected.has(member.id));
    return filtered.length > 0 ? filtered : allLeaders;
  }
  return allLeaders;
}

/**
 * Executores elegíveis: perfis com papel 'team_member' ou 'sublider'. Quando há
 * equipe selecionada com membros, restringe aos membros da equipe (mantendo o
 * responsável já escolhido); se o filtro esvaziar, cai de volta para todos.
 */
export function computeExecutores<T extends { id: string }>(
  teamMembers: T[],
  userRoles: RoleAssignment[],
  equipeId: string | null,
  equipeMemberIds: string[],
  responsibleId: string,
): T[] {
  const roleMap = new Map(userRoles.map(role => [role.user_id, role.role]));
  const eligible = teamMembers.filter(member => ['team_member', 'sublider'].includes(roleMap.get(member.id) || ''));
  if (equipeId && equipeMemberIds.length > 0) {
    const teamSet = new Set(equipeMemberIds);
    const filtered = eligible.filter(member => teamSet.has(member.id) || member.id === responsibleId);
    return filtered.length > 0 ? filtered : eligible;
  }
  return eligible;
}

/**
 * Membros disponíveis para seleção, excluindo os líderes já escolhidos.
 * - multidisciplinar: união de todos os membros de todas as áreas.
 * - com equipe: membros da equipe (ou já selecionados).
 * - sem equipe: apenas os já selecionados (nada a adicionar sem equipe).
 */
export function computeAvailableMembers<T extends { id: string }>(
  teamMembers: T[],
  equipeId: string | null,
  equipeMemberIds: string[],
  selectedLeaderIds: string[],
  selectedMemberIds: string[],
  isMultidisciplinar: boolean,
  allAreaGroups: MemberAreaGroup<T>[],
): T[] {
  const excluded = new Set(selectedLeaderIds);
  const selected = new Set(selectedMemberIds);
  if (isMultidisciplinar) {
    const members = new Map<string, T>();
    for (const group of allAreaGroups) for (const member of group.members) members.set(member.id, member);
    return [...members.values()].filter(member => !excluded.has(member.id));
  }
  if (equipeId) {
    if (equipeMemberIds.length === 0 && selected.size === 0) return [];
    return teamMembers.filter(member => !excluded.has(member.id)
      && (equipeMemberIds.includes(member.id) || selected.has(member.id)));
  }
  return selected.size === 0 ? [] : teamMembers.filter(member => !excluded.has(member.id) && selected.has(member.id));
}
