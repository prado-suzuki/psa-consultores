// Classificação dos usuários do Controle de Acessos pela estrutura
// organizacional. Funções puras — não falam com Supabase.
//
// A área é o nível certo para essa tela: é ela que carrega
// `estrutura_areas.page_categories`, as mesmas categorias que a árvore de
// permissões ao lado libera (`osg`, `tax`, `rotina`/`dev`, `board`, `gestao`).
// Cluster fica um degrau acima (empresa) e equipe um degrau abaixo.
//
// Quem não está na estrutura (clientes, contas de serviço, gente recém-criada)
// não some da lista: cai no grupo "Sem área".

/** Área já resolvida em nome e cor, do jeito que a lista exibe. */
export interface AreaResumo {
  id: string;
  name: string;
  color: string | null;
}

export interface MembroEquipe {
  user_id: string;
  equipe_id: string;
}

export interface EquipeEstrutura {
  id: string;
  area_id: string | null;
  gestor_id: string | null;
}

export interface AreaEstrutura {
  id: string;
  name: string;
  color?: string | null;
  gestor_chamados_id?: string | null;
}

export type AreasPorUsuario = Record<string, AreaResumo[]>;

/** Chave do grupo/filtro de quem não tem vínculo na estrutura. */
export const SEM_AREA = 'sem_area';

/**
 * Áreas de cada usuário, pelos três caminhos que ligam pessoa → área:
 * membro de equipe, gestor de equipe e gestor de chamados da área. É a mesma
 * regra de `useUserEstrutura`; sem os dois últimos, gestor sem vínculo de
 * membro cairia em "Sem área".
 *
 * Quem está em mais de uma área fica com todas — a tela mostra a pessoa em cada
 * grupo em vez de escolher uma no chute.
 */
export function resolverAreasPorUsuario(
  membros: MembroEquipe[],
  equipes: EquipeEstrutura[],
  areas: AreaEstrutura[],
): AreasPorUsuario {
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const equipeById = new Map(equipes.map((equipe) => [equipe.id, equipe]));
  const porUsuario = new Map<string, Map<string, AreaResumo>>();

  const vincular = (userId: string | null | undefined, areaId: string | null | undefined) => {
    if (!userId || !areaId) return;
    const area = areaById.get(areaId);
    if (!area) return;

    let areasDoUsuario = porUsuario.get(userId);
    if (!areasDoUsuario) porUsuario.set(userId, (areasDoUsuario = new Map()));
    areasDoUsuario.set(area.id, { id: area.id, name: area.name, color: area.color ?? null });
  };

  for (const membro of membros) vincular(membro.user_id, equipeById.get(membro.equipe_id)?.area_id);
  for (const equipe of equipes) vincular(equipe.gestor_id, equipe.area_id);
  for (const area of areas) vincular(area.gestor_chamados_id, area.id);

  const resultado: AreasPorUsuario = {};
  for (const [userId, areasDoUsuario] of porUsuario) {
    resultado[userId] = [...areasDoUsuario.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }
  return resultado;
}

/** O usuário pertence à área do filtro (`SEM_AREA` = nenhum vínculo). */
export function usuarioEstaNaArea(
  userId: string,
  areaId: string,
  areasPorUsuario: AreasPorUsuario,
): boolean {
  const areas = areasPorUsuario[userId] ?? [];
  if (areaId === SEM_AREA) return areas.length === 0;
  return areas.some((area) => area.id === areaId);
}

/**
 * Quantos usuários por área, para o número no chip do filtro.
 *
 * Quem está em duas áreas conta nas duas — a soma dos chips pode passar do
 * total, igual já acontece nos chips de papel.
 */
export function contarUsuariosPorArea(
  userIds: string[],
  areasPorUsuario: AreasPorUsuario,
): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const userId of userIds) {
    const areas = areasPorUsuario[userId] ?? [];
    if (!areas.length) {
      contagem[SEM_AREA] = (contagem[SEM_AREA] ?? 0) + 1;
      continue;
    }
    for (const area of areas) contagem[area.id] = (contagem[area.id] ?? 0) + 1;
  }
  return contagem;
}

export interface GrupoArea<T> {
  /** `null` no grupo "Sem área". */
  area: AreaResumo | null;
  usuarios: T[];
}

/**
 * Agrupa a lista por área, em ordem alfabética, com "Sem área" no fim.
 *
 * A ordem dos usuários dentro do grupo é a que chegou — quem chama já ordenou
 * (hierarquia de papel, depois nome).
 */
export function agruparUsuariosPorArea<T extends { id: string }>(
  usuarios: T[],
  areasPorUsuario: AreasPorUsuario,
): GrupoArea<T>[] {
  const grupos = new Map<string, GrupoArea<T>>();

  const adicionar = (chave: string, area: AreaResumo | null, usuario: T) => {
    let grupo = grupos.get(chave);
    if (!grupo) grupos.set(chave, (grupo = { area, usuarios: [] }));
    grupo.usuarios.push(usuario);
  };

  for (const usuario of usuarios) {
    const areas = areasPorUsuario[usuario.id] ?? [];
    if (!areas.length) {
      adicionar(SEM_AREA, null, usuario);
      continue;
    }
    for (const area of areas) adicionar(area.id, area, usuario);
  }

  return [...grupos.values()].sort((a, b) => {
    if (!a.area) return 1;
    if (!b.area) return -1;
    return a.area.name.localeCompare(b.area.name, 'pt-BR');
  });
}
