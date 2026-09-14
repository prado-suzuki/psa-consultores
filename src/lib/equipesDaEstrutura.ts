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
  color_index?: number | null;
  /** Categorias de página que a área libera (`osg`, `tax`, `rotina`/`dev`…). */
  page_categories?: string[] | null;
  /** Ausente nas listas ja filtradas; presente quando vem a estrutura inteira. */
  is_active?: boolean;
}

export interface EquipeDaEstrutura {
  id: string;
  area_id: string;
  name: string;
  /** Ausente nas listas ja filtradas; presente quando vem a estrutura inteira. */
  is_active?: boolean;
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
  /** Slot da paleta da área — ver src/lib/corDaArea.ts. */
  corIndice: number | null;
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
      corIndice: area.color_index ?? null,
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

/**
 * As equipes achatadas numa lista, na ordem "Cluster › Área › Equipe" — que é
 * a ordem das COLUNAS da matriz de acessos.
 *
 * Por que existe, já que `montarGruposDeEquipe` dá a mesma informação: o
 * seletor consome grupos (é um `<SelectGroup>` por área), e a matriz consome
 * uma fila. Achatar no componente colocaria a regra de ordem em dois lugares —
 * e a ordem importa: colunas vizinhas da mesma área é o que faz "Fiscal" e
 * "Fixos" (as duas de TAX › Tax) serem lidas como irmãs, e não como duas
 * colunas sem parentesco.
 */
export interface ColunaDeEquipe {
  id: string;
  nome: string;
  /** "Cluster › Área", para o rótulo pequeno em cima do nome. */
  caminhoDaArea: string;
  areaId: string;
  cor: string | null;
  corIndice: number | null;
  /**
   * A equipe (ou a área dela) está desativada, e a coluna só existe porque tem
   * gente dentro. A tela marca — e não esconde: é por ela que se desvincula.
   */
  inativa?: boolean;
}

export function colunasDeEquipe(grupos: GrupoDeEquipes[]): ColunaDeEquipe[] {
  return grupos.flatMap((grupo) =>
    grupo.equipes.map((equipe) => ({
      id: equipe.id,
      nome: equipe.name,
      caminhoDaArea: grupo.caminho,
      areaId: grupo.areaId,
      cor: grupo.cor,
      corIndice: grupo.corIndice,
    })),
  );
}

/**
 * userId → equipes em que a pessoa está, numa passada só.
 *
 * O irmão `equipesDoUsuario` varre a lista inteira por pessoa, o que numa
 * matriz de 68 linhas × 11 equipes vira uma varredura por célula.
 */
export function equipesPorUsuario(membros: MembroDaEquipe[]): Record<string, Set<string>> {
  const mapa: Record<string, Set<string>> = {};
  for (const membro of membros) {
    (mapa[membro.user_id] ??= new Set()).add(membro.equipe_id);
  }
  return mapa;
}

/**
 * As colunas de equipe da MATRIZ de acessos — que não são as mesmas opções do
 * seletor, e a diferença é o ponto desta função.
 *
 * O seletor OFERECE vínculo novo, então descarta o que a estrutura desativou.
 * A matriz MOSTRA vínculo existente, e desativar uma equipe não desliga ninguém
 * dela: em 14/09/2026 produção tinha 15 pessoas em três equipes desativadas.
 * Sem elas, a matriz diria que essas pessoas não estão em equipe nenhuma, e não
 * haveria por onde desvincular — a mesma armadilha que o `EditUserDialog` já
 * evita ao manter o campo visível para quem perdeu o papel interno.
 *
 * Então a regra é: entra quem está ativa **ou** quem tem gente dentro. Equipe
 * desativada e vazia não vira coluna, porque não há nada a ver nem a desfazer.
 *
 * Recebe a estrutura INTEIRA (`useEstruturaAreasTodas`, `useEstruturaEquipesTodas`).
 * Passar as listas já filtradas não quebra nada — só devolve o mesmo que
 * `colunasDeEquipe`, porque as desativadas nem chegam aqui.
 */
export function colunasDeEquipeDaMatriz(
  clusters: ClusterDaEstrutura[],
  areas: AreaDaEstrutura[],
  equipes: EquipeDaEstrutura[],
  membros: MembroDaEquipe[],
): ColunaDeEquipe[] {
  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const areaById = new Map(areas.map((a) => [a.id, a]));

  const comGente = new Set(membros.map((m) => m.equipe_id));

  const colunas: ColunaDeEquipe[] = [];
  for (const equipe of equipes) {
    const area = areaById.get(equipe.area_id);
    if (!area) continue;
    const cluster = clusterById.get(area.cluster_id);
    if (!cluster) continue;

    // `is_active` indefinido = lista já filtrada, então é ativo por construção.
    const viva =
      cluster.is_active && (area.is_active ?? true) && (equipe.is_active ?? true);
    if (!viva && !comGente.has(equipe.id)) continue;

    colunas.push({
      id: equipe.id,
      nome: equipe.name,
      caminhoDaArea: `${cluster.name} › ${area.name}`,
      areaId: area.id,
      cor: area.color ?? null,
      corIndice: area.color_index ?? null,
      inativa: !viva,
    });
  }

  // Mesma ordem do seletor — caminho e depois nome —, para as irmãs ficarem
  // vizinhas. As desativadas não vão para o fim: elas pertencem à área delas, e
  // é lá que quem procura vai olhar.
  return colunas.sort(
    (a, b) =>
      a.caminhoDaArea.localeCompare(b.caminhoDaArea, 'pt-BR') ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/**
 * "Cluster › Área › Equipe" de QUALQUER equipe, ativa ou não.
 *
 * É a irmã de `caminhoDaEquipe` que não depende dos grupos do seletor. A outra
 * devolve `null` para equipe desativada, e quem chamava caía num `?? equipeId`
 * que imprimia UUID na cara da pessoa — era assim que os 15 vínculos em equipe
 * desativada apareciam no diálogo de edição.
 */
export function caminhoDeQualquerEquipe(
  equipeId: string,
  colunas: ColunaDeEquipe[],
): string | null {
  const coluna = colunas.find((c) => c.id === equipeId);
  return coluna ? `${coluna.caminhoDaArea} › ${coluna.nome}` : null;
}
