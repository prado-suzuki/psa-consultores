/**
 * Helpers puros da tela de vínculo Produto × Serviço (Cadastro de Categorias).
 *
 * O vínculo não é decorativo: é ele que define quais serviços aparecem ao
 * cadastrar projetos de um produto (`useProjectServicosByProduto`), o badge
 * "Contratado" (`useServicosContratados`) e a resolução produto↔serviço da
 * auditoria de produtividade. Por isso a tela precisa deixar visível o que
 * está sem vínculo — daí os contadores e o agrupamento por cluster aqui.
 */

/** Chave do grupo de itens sem cluster vinculado. */
export const SEM_CLUSTER = '__sem_cluster__';
/** Chave do chip "Todos" na navegação por cluster. */
export const TODOS_CLUSTERS = '__todos__';

/** Modo do filtro da lista de serviços. */
export type FiltroVinculo = 'todos' | 'vinculados' | 'disponiveis';

export interface ItemComCluster {
  id: string;
  cluster_id: string | null;
  estrutura_clusters: { name: string } | null;
}

export interface GrupoCluster<T> {
  /** `cluster_id` do grupo, ou `SEM_CLUSTER`. */
  key: string;
  nome: string;
  /** Cluster existe mas está inativo (legado da fusão com `empresas_faturamento`). */
  inativo: boolean;
  /** Mesmo cluster do produto selecionado — só usado na lista de serviços. */
  sugerido: boolean;
  items: T[];
}

/** Minúsculas sem acento, para busca tolerante ao que o usuário digita. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Quantos serviços cada produto tem vinculado. */
export function contarVinculosPorProduto(
  vinculos: { produto_segmento_id: string }[],
): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const vinculo of vinculos) {
    contagem[vinculo.produto_segmento_id] = (contagem[vinculo.produto_segmento_id] || 0) + 1;
  }
  return contagem;
}

/** Busca por código ou nome do produto (aceita "cha", "canal", "01-cha"). */
export function filtrarProdutos<T extends { codigo: string | null; nome: string | null }>(
  produtos: T[],
  termo: string,
): T[] {
  const busca = normalizarTexto(termo);
  if (!busca) return produtos;
  return produtos.filter(p => {
    const alvo = normalizarTexto(`${p.codigo || ''} ${p.nome || ''}`);
    return alvo.includes(busca);
  });
}

/** Busca por nome do serviço + recorte por estado do vínculo. */
export function filtrarServicos<T extends { id: string; nome: string | null }>(
  servicos: T[],
  opcoes: { termo: string; filtro: FiltroVinculo; vinculados: Set<string> },
): T[] {
  const busca = normalizarTexto(opcoes.termo);
  return servicos.filter(s => {
    if (busca && !normalizarTexto(s.nome || '').includes(busca)) return false;
    if (opcoes.filtro === 'vinculados') return opcoes.vinculados.has(s.id);
    if (opcoes.filtro === 'disponiveis') return !opcoes.vinculados.has(s.id);
    return true;
  });
}

/**
 * Agrupa por cluster na ordem em que a tela precisa ler:
 * sugerido → ativos → inativos → sem cluster, e dentro disso por nome (pt-BR).
 */
export function agruparPorCluster<T extends ItemComCluster>(
  items: T[],
  opcoes: { clustersInativos?: Set<string>; clusterSugerido?: string | null } = {},
): GrupoCluster<T>[] {
  const inativos = opcoes.clustersInativos ?? new Set<string>();
  const porCluster = new Map<string, GrupoCluster<T>>();

  for (const item of items) {
    const key = item.cluster_id || SEM_CLUSTER;
    if (!porCluster.has(key)) {
      porCluster.set(key, {
        key,
        nome: item.estrutura_clusters?.name || 'Sem cluster',
        inativo: key !== SEM_CLUSTER && inativos.has(key),
        sugerido: key !== SEM_CLUSTER && key === opcoes.clusterSugerido,
        items: [],
      });
    }
    porCluster.get(key)!.items.push(item);
  }

  const peso = (g: GrupoCluster<T>) =>
    g.sugerido ? 0 : g.key === SEM_CLUSTER ? 3 : g.inativo ? 2 : 1;

  return [...porCluster.values()].sort(
    (a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

/**
 * Divide os serviços entre "já vinculados" e "faltam vincular", PRESERVANDO a
 * ordem recebida dentro de cada lado.
 *
 * É o que põe os serviços do produto no topo da lista: a tela ordena pelo código
 * e passa o resultado por aqui, e os dois lados saem como os dois blocos.
 *
 * O conjunto `vinculados` que decide não precisa ser o estado ao vivo do vínculo
 * — na lista é, de propósito, um RETRATO do momento em que ela se assentou.
 * Quem chama explica o porquê (`ProdutosServicosTab`).
 */
export function separarPorVinculo<T extends { id: string }>(
  servicos: readonly T[],
  vinculados: ReadonlySet<string>,
): { jaVinculados: T[]; paraVincular: T[] } {
  const paraVincular: T[] = [];
  const jaVinculados: T[] = [];
  for (const servico of servicos) {
    if (vinculados.has(servico.id)) jaVinculados.push(servico);
    else paraVincular.push(servico);
  }
  return { jaVinculados, paraVincular };
}

/* ───────────────────────────────────────────────────────────────────────
 * COPIAR O CONJUNTO DE SERVIÇOS DE UM PRODUTO PARA OUTRO
 *
 * O gesto que a tela pedia não era o gesto que o trabalho tem: a lista oferece
 * o catálogo do cluster e pede que se marque um a um, mas cada produto tem um
 * punhado de serviços, e produto novo quase sempre se parece com um que já
 * existe. Estas duas funções respondem "de quem copiar" e "o que viria".
 * ─────────────────────────────────────────────────────────────────────── */

/** O mínimo de um produto para ele poder ser origem de uma cópia. */
export interface ProdutoParaCopia {
  id: string;
  codigo: string | null;
  nome: string | null;
  cluster_id: string | null;
}

export interface CandidatoDeCopia {
  id: string;
  codigo: string | null;
  nome: string | null;
  /** Mesmo cluster do produto aberto — estes vão para o topo da lista. */
  mesmoCluster: boolean;
  /** Serviços vinculados ao candidato. */
  total: number;
  /** Destes, quantos o produto aberto ainda NÃO tem. É o número que decide. */
  novos: number;
}

/** Os serviços que uma cópia de `origemId` acrescentaria a `alvoId`. */
export function servicosACopiar(
  vinculos: readonly { produto_segmento_id: string; servico_prestado_id: string }[],
  origemId: string,
  alvoId: string,
): string[] {
  const jaTem = new Set(
    vinculos.filter((v) => v.produto_segmento_id === alvoId).map((v) => v.servico_prestado_id),
  );
  const vistos = new Set<string>();
  return vinculos
    .filter((v) => v.produto_segmento_id === origemId && !jaTem.has(v.servico_prestado_id))
    .map((v) => v.servico_prestado_id)
    .filter((id) => (vistos.has(id) ? false : vistos.add(id) && true));
}

/**
 * Os produtos de onde dá para copiar, na ordem em que a escolha é feita:
 * mesmo cluster primeiro, e dentro disso quem traz mais coisa nova.
 *
 * Produto sem vínculo nenhum fica de fora — copiar dele não faria nada. O
 * próprio alvo também, por razão óbvia. Produto de OUTRO cluster continua na
 * lista: existe serviço sem cluster no catálogo, e recortar por cluster
 * tornaria parte dele inalcançável.
 */
export function candidatosParaCopia<T extends ProdutoParaCopia>(
  produtos: readonly T[],
  vinculos: readonly { produto_segmento_id: string; servico_prestado_id: string }[],
  alvo: ProdutoParaCopia,
): CandidatoDeCopia[] {
  return produtos
    .filter((p) => p.id !== alvo.id)
    .map((p) => {
      const total = new Set(
        vinculos.filter((v) => v.produto_segmento_id === p.id).map((v) => v.servico_prestado_id),
      ).size;
      return {
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        mesmoCluster: !!p.cluster_id && p.cluster_id === alvo.cluster_id,
        total,
        novos: servicosACopiar(vinculos, p.id, alvo.id).length,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => Number(b.mesmoCluster) - Number(a.mesmoCluster) || b.novos - a.novos);
}
