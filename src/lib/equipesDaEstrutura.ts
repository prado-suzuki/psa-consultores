// Vínculo pessoa → equipe da estrutura organizacional, do ponto de vista de
// quem cadastra um usuário novo. Funções puras — não falam com Supabase.
//
// A estrutura tem três degraus (cluster → área → equipe) e quem entra na
// empresa entra por uma equipe. Como o cluster e a área saem da equipe
// escolhida, a tela pede só a equipe e mostra o caminho inteiro ao lado — sem
// obrigar a percorrer os três níveis à mão em outra aba.

import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';

export interface ClusterDaEstrutura {
  id: string;
  name: string;
  is_active: boolean;
}

export interface AreaDaEstrutura {
  id: string;
  cluster_id: string;
  name: string;
  color?: string | null;
  /** Categorias de página que a área libera (`osg`, `tax`, `rotina`/`dev`…). */
  page_categories?: string[] | null;
}

export interface EquipeDaEstrutura {
  id: string;
  area_id: string;
  name: string;
}

export interface MembroDaEquipe {
  id: string;
  user_id: string;
  equipe_id: string;
}

/** Equipes de uma mesma área, já com o caminho "Cluster › Área" resolvido. */
export interface GrupoDeEquipes {
  areaId: string;
  caminho: string;
  cor: string | null;
  equipes: Array<{ id: string; name: string }>;
}

/**
 * Opções do seletor de equipe, agrupadas por área e em ordem de caminho.
 *
 * Fica de fora o que não pode receber gente: cluster inativo, área órfã (sem
 * cluster ativo) e área sem nenhuma equipe — oferecer essas seria abrir um
 * caminho que termina em nada.
 */
export function montarGruposDeEquipe(
  clusters: ClusterDaEstrutura[],
  areas: AreaDaEstrutura[],
  equipes: EquipeDaEstrutura[],
): GrupoDeEquipes[] {
  const clusterAtivoById = new Map(
    clusters.filter((cluster) => cluster.is_active).map((cluster) => [cluster.id, cluster]),
  );

  const grupos: GrupoDeEquipes[] = [];
  for (const area of areas) {
    const cluster = clusterAtivoById.get(area.cluster_id);
    if (!cluster) continue;

    const equipesDaArea = equipes
      .filter((equipe) => equipe.area_id === area.id)
      .map((equipe) => ({ id: equipe.id, name: equipe.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!equipesDaArea.length) continue;

    grupos.push({
      areaId: area.id,
      caminho: `${cluster.name} › ${area.name}`,
      cor: area.color ?? null,
      equipes: equipesDaArea,
    });
  }

  return grupos.sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'));
}

/** "Cluster › Área › Equipe" de uma equipe, para o chip e para a auditoria. */
export function caminhoDaEquipe(equipeId: string, grupos: GrupoDeEquipes[]): string | null {
  for (const grupo of grupos) {
    const equipe = grupo.equipes.find((e) => e.id === equipeId);
    if (equipe) return `${grupo.caminho} › ${equipe.name}`;
  }
  return null;
}

/**
 * Áreas de acesso (as caixas de "Áreas de Acesso" do cadastro) que a equipe
 * escolhida implica, via `page_categories` da área da estrutura.
 *
 * É o que evita escolher a área duas vezes: quem entra na equipe de OSG já
 * chega com o acesso de OSG marcado.
 */
export function areasDeAcessoDaEquipe(
  equipeId: string,
  equipes: EquipeDaEstrutura[],
  areas: AreaDaEstrutura[],
): AreaKey[] {
  const areaId = equipes.find((equipe) => equipe.id === equipeId)?.area_id;
  if (!areaId) return [];
  const categorias = new Set(areas.find((area) => area.id === areaId)?.page_categories ?? []);
  if (!categorias.size) return [];

  return (Object.keys(AREA_CATEGORIES_MAP) as AreaKey[]).filter((chave) =>
    AREA_CATEGORIES_MAP[chave].categories.some((categoria) => categorias.has(categoria)),
  );
}

/** Equipes em que a pessoa já é membro. */
export function equipesDoUsuario(userId: string, membros: MembroDaEquipe[]): string[] {
  return membros.filter((membro) => membro.user_id === userId).map((membro) => membro.equipe_id);
}

/**
 * O que gravar para a lista de equipes sair de `atuais` e chegar em `desejadas`.
 *
 * Trabalhar por diferença (e não "apaga tudo e reinsere") preserva quem está em
 * duas equipes: salvar o cadastro sem mexer nesse campo não desvincula ninguém.
 */
export function diferencaDeEquipes(
  atuais: string[],
  desejadas: string[],
): { adicionar: string[]; remover: string[] } {
  const atuaisSet = new Set(atuais);
  const desejadasSet = new Set(desejadas);
  return {
    adicionar: [...desejadasSet].filter((id) => !atuaisSet.has(id)),
    remover: [...atuaisSet].filter((id) => !desejadasSet.has(id)),
  };
}
