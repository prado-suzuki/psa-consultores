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
 * Divide os serviços visíveis entre "faltam vincular" e "já vinculados",
 * base das ações em lote (marcar/desmarcar tudo o que está na tela).
 */
export function separarVisiveisParaLote<T extends { id: string }>(
  visiveis: T[],
  vinculados: Set<string>,
): { paraVincular: T[]; jaVinculados: T[] } {
  const paraVincular: T[] = [];
  const jaVinculados: T[] = [];
  for (const servico of visiveis) {
    if (vinculados.has(servico.id)) jaVinculados.push(servico);
    else paraVincular.push(servico);
  }
  return { paraVincular, jaVinculados };
}
