// Funções puras de filtragem de equipe/pessoas do cadastro de projeto.
// Extraídas de useProjetosCadastroController para serem compartilhadas entre o
// cadastro de projeto único e o cadastro em lote a partir de uma OS.

export interface RoleAssignment {
  user_id: string;
  role: string;
}

/**
 * Valor sentinela do item "Sem executor fixo" no select de Responsável Executor
 * (projeto cujas tarefas são delegadas a qualquer membro, ex.: Canal de Chamados).
 */
export const SEM_EXECUTOR_FIXO_OPTION = '_sem_executor';

export interface MemberAreaGroup<T> {
  members: T[];
}

/** Vínculo gravado em `org_project_members`: papel da pessoa NO projeto. */
export interface ProjectMemberRow {
  user_id: string;
  role: string;
}

/**
 * Distribui os vínculos gravados do projeto nos dois campos do modal, pelo papel
 * que a pessoa tem **no projeto** (`org_project_members.role`), não pelo cargo
 * dela na empresa (`user_roles`).
 *
 * Ler o cargo confundia quem lidera com quem executa: num projeto cujo líder e
 * cuja responsável executora são ambos 'lider' (Equipe Pontuais), os dois caíam
 * em "Líder Geral" e "Membros do Projeto" abria vazio — e a validação exige ao
 * menos um membro para salvar.
 *
 * Duas assimetrias do `buildMembersList` (`useOrgProjects`) explicam o resto da
 * regra, porque ele grava **uma linha por pessoa**, com 'responsible' na frente
 * de 'leader' e de 'member':
 * - a responsável executora conta como membro, senão a caixa Membros abriria
 *   vazia em projeto de duas pessoas (é a linha dela que existe, não uma
 *   'member');
 * - o `leader_id` entra junto com as linhas 'leader', porque quando líder e
 *   responsável são a mesma pessoa a linha 'leader' não chega a existir.
 *
 * O `leader_id` entra **primeiro** de propósito: o salvamento regrava a coluna a
 * partir de `leader_ids[0]`, então liderar a lista é o que impede a edição de
 * trocar o líder do projeto por efeito da ordem em que as linhas voltaram do
 * banco (a consulta de membros não tem `ORDER BY`).
 */
export function splitProjectMembers(members: ProjectMemberRow[], leaderId?: string | null) {
  const leaderIds: string[] = [];
  const addLeader = (userId: string) => {
    if (!leaderIds.includes(userId)) leaderIds.push(userId);
  };
  if (leaderId) addLeader(leaderId);
  for (const member of members) {
    if (member.role === 'leader') addLeader(member.user_id);
  }
  const memberIds = members
    .filter(member => member.role !== 'leader' && !leaderIds.includes(member.user_id))
    .map(member => member.user_id);
  return { leaderIds, memberIds };
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
 * Executores elegíveis: perfis com papel 'team_member', 'sublider' ou 'lider'.
 * Quando há equipe selecionada com membros, restringe aos membros da equipe
 * (mantendo o responsável já escolhido); se o filtro esvaziar, cai de volta
 * para todos.
 *
 * 'lider' entra porque quem lidera também executa: na Equipe Pontuais a líder é
 * a responsável executora de projeto de cliente, e o banco nunca restringiu o
 * papel (`org_projects.responsible_id` só tem FK para `profiles`). Enquanto a
 * lista era só 'team_member'/'sublider', ela sumia do select — e o projeto que
 * já tinha o id dela gravado reabria com o campo em branco. Quem não tem papel
 * na consulta (admin, cliente) segue fora: o filtro de equipe é o corte real.
 */
export function computeExecutores<T extends { id: string }>(
  teamMembers: T[],
  userRoles: RoleAssignment[],
  equipeId: string | null,
  equipeMemberIds: string[],
  responsibleId: string,
): T[] {
  const roleMap = new Map(userRoles.map(role => [role.user_id, role.role]));
  const eligible = teamMembers.filter(member => ['team_member', 'sublider', 'lider'].includes(roleMap.get(member.id) || ''));
  if (equipeId && equipeMemberIds.length > 0) {
    const teamSet = new Set(equipeMemberIds);
    const filtered = eligible.filter(member => teamSet.has(member.id) || member.id === responsibleId);
    return filtered.length > 0 ? filtered : eligible;
  }
  return eligible;
}

/** Área como `useTeamMembersByArea` a devolve, no mínimo que estas funções leem. */
export interface AreaComEquipes<T> {
  area_id: string;
  area_name: string;
  cluster_id: string | null;
  cluster_name: string;
  members: T[];
  equipes: { equipe_id: string; equipe_name: string; members: T[] }[];
}

/** Cluster da área do projeto, ou null quando a área não tem ninguém listado. */
export function clusterIdDaArea<T>(
  allAreaGroups: AreaComEquipes<T>[],
  areaId: string | null,
): string | null {
  if (!areaId) return null;
  return allAreaGroups.find(group => group.area_id === areaId)?.cluster_id ?? null;
}

/**
 * Áreas oferecidas na caixa "Membros do Projeto", já sem os líderes escolhidos.
 *
 * - multidisciplinar: todas as áreas, que é o que o modo existe para permitir —
 *   projeto que atravessa cluster de verdade.
 * - com equipe selecionada: as áreas do MESMO cluster do projeto. Escolher a
 *   Equipe Fiscal passa a oferecer também Fixos, Pontuais e Sinop sem ligar o
 *   multidisciplinar, porque as quatro são do cluster TAX.
 *
 * O corte é por CLUSTER, e não por área ou por equipe, porque cluster é
 * exatamente o que decide em que quadro o projeto aparece: a página de projetos
 * de cada área filtra por `dashboard_project_ids_for_cluster`, e o cluster do
 * projeto é a união do cluster da área dele com o de cada membro
 * (`org_project_cluster_ids`). Oferecer o cluster inteiro é, portanto, o maior
 * conjunto que não muda em que quadro o projeto vai parar.
 *
 * Devolve vazio quando não há cluster resolvido — aí a tela cai no corte antigo
 * por equipe (`computeAvailableMembers`), em vez de abrir a casa inteira.
 */
export function computeOfferedAreaGroups<T extends { id: string }>(
  allAreaGroups: AreaComEquipes<T>[],
  isMultidisciplinar: boolean,
  clusterIdDoProjeto: string | null,
  selectedLeaderIds: string[],
): AreaComEquipes<T>[] {
  const escopo = isMultidisciplinar
    ? allAreaGroups
    : (clusterIdDoProjeto
        ? allAreaGroups.filter(group => group.cluster_id === clusterIdDoProjeto)
        : []);
  const excluded = new Set(selectedLeaderIds);
  return escopo
    .map(group => ({
      ...group,
      members: group.members.filter(member => !excluded.has(member.id)),
      equipes: group.equipes
        .map(team => ({ ...team, members: team.members.filter(member => !excluded.has(member.id)) }))
        .filter(team => team.members.length > 0),
    }))
    .filter(group => group.members.length > 0);
}

/**
 * Por pessoa, os clusters que ela carrega ALÉM do cluster do projeto.
 *
 * O recorte por cluster reduz o acidente, mas não o elimina: quem está em
 * equipes de dois clusters aparece no grupo do projeto e, ainda assim, publica o
 * projeto no quadro do outro — `resolve_user_cluster_ids` olha TODAS as equipes
 * da pessoa, não a equipe pela qual ela foi escolhida. Foi assim que um projeto
 * do Tax passou a aparecer na OSG em 08/09/2026. Este mapa é o que permite dizer
 * isso na hora da escolha, em vez de a pessoa descobrir pelo quadro errado.
 */
export function computeClustersExtras<T extends { id: string }>(
  allAreaGroups: AreaComEquipes<T>[],
  clusterIdDoProjeto: string | null,
): Record<string, string[]> {
  const extras: Record<string, Set<string>> = {};
  for (const group of allAreaGroups) {
    if (!group.cluster_id || group.cluster_id === clusterIdDoProjeto) continue;
    for (const member of group.members) {
      if (!extras[member.id]) extras[member.id] = new Set();
      extras[member.id].add(group.cluster_name || 'outra área');
    }
  }
  return Object.fromEntries(
    Object.entries(extras).map(([id, nomes]) => [id, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))]),
  );
}

/**
 * Em que quadros o projeto vai aparecer, pelos nomes dos clusters — o do próprio
 * projeto mais o de cada pessoa escolhida. Espelha `org_project_cluster_ids`, que
 * é quem decide isso no banco, e serve para a seção de equipe dizer a
 * consequência antes do salvamento.
 */
export function computeQuadrosDoProjeto<T extends { id: string }>(
  allAreaGroups: AreaComEquipes<T>[],
  selectedIds: string[],
  clusterNameDoProjeto: string | null,
): string[] {
  const quadros = new Set<string>();
  if (clusterNameDoProjeto) quadros.add(clusterNameDoProjeto);
  const escolhidos = new Set(selectedIds);
  for (const group of allAreaGroups) {
    if (!group.cluster_name) continue;
    if (group.members.some(member => escolhidos.has(member.id))) quadros.add(group.cluster_name);
  }
  return [...quadros].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Membros disponíveis para seleção, excluindo os líderes já escolhidos.
 * - multidisciplinar: união de todos os membros de todas as áreas.
 * - com equipe: membros da equipe (ou já selecionados).
 * - sem equipe: apenas os já selecionados (nada a adicionar sem equipe).
 *
 * Continua sendo a lista PLANA, usada quando não há grupo de área resolvido (ver
 * `computeOfferedAreaGroups`) — é o corte antigo, mantido como piso.
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
