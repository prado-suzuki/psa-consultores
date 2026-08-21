/**
 * Seções da lista de serviços — e o remendo que elas são.
 *
 * `servicos_prestados` tem TRÊS colunas: `id`, `nome`, `cluster_id`. Não existe
 * coluna de código. O "1.01" que a operação usa para se referir a um serviço
 * está DENTRO da string do nome ("1.1.Apoio na implantação de práticas
 * contábeis"), e é dele que sai tanto o chip de código quanto o agrupamento por
 * seção da tela.
 *
 * Ou seja: agrupar aqui é fatiar texto, e fatiar texto quebra quando o dado não
 * colabora. Nos dados de hoje 66 de 67 serviços têm prefixo — o que sobra é um
 * serviço chamado "Outros". A regra desta implementação é que esse caso NUNCA
 * some da tela: ele cai num grupo explícito `Sem seção`, visível como qualquer
 * outro. Serviço que o usuário não enxerga é serviço que ele cadastra de novo.
 *
 * Se um dia `servicos_prestados` ganhar coluna de código, este arquivo encolhe
 * para nada: `dividirNomeServico` passa a ler a coluna e o resto continua igual.
 */

/** Chave do grupo de serviços cujo nome não começa com prefixo numérico. */
export const SEM_SECAO = '__sem_secao__';

/** Rótulo do grupo sem prefixo. Explícito de propósito — ver nota do topo. */
export const ROTULO_SEM_SECAO = 'Sem seção';

export interface NomeDeServico {
  /** Prefixo numérico completo ("1.1", "3"), ou `null` quando não há. */
  codigo: string | null;
  /** O nome sem o prefixo. Nunca vazio: sem prefixo, é o nome inteiro. */
  nome: string;
  /** Primeiro nível do prefixo ("1"), ou `null`. É a chave da seção. */
  secao: string | null;
}

/**
 * Separa o prefixo numérico do nome do serviço.
 *
 * Aceita as formas que existem no banco — "1.1.Nome", "3.Nome", "1.1 Nome" — e
 * devolve o nome intacto quando não encontra prefixo. Não "conserta" o dado:
 * nome sem prefixo continua sendo o nome inteiro, com código `null`.
 */
export function dividirNomeServico(nomeCompleto: string | null | undefined): NomeDeServico {
  const bruto = (nomeCompleto ?? '').trim();
  const casado = bruto.match(/^(\d+(?:\.\d+)*)\.?\s*(.*)$/);
  if (!casado) return { codigo: null, nome: bruto, secao: null };

  const [, codigo, resto] = casado;
  // Prefixo sem nada depois ("1.") não é código: é o nome inteiro. Sem isto um
  // serviço chamado só "2024" viraria um grupo com rótulo vazio.
  if (!resto.trim()) return { codigo: null, nome: bruto, secao: null };

  return { codigo, nome: resto.trim(), secao: codigo.split('.')[0] };
}

export interface SecaoDeServicos<T> {
  /** `secao` do prefixo, ou `SEM_SECAO`. */
  chave: string;
  /** O que aparece no cabeçalho recolhível. */
  titulo: string;
  itens: T[];
}

/**
 * Agrupa por seção, na ordem numérica, com `Sem seção` sempre por último.
 *
 * A ordem é numérica e não alfabética porque "10" vem depois de "9" para quem
 * lê, e depois de "1" para quem ordena string.
 */
export function agruparPorSecao<T>(
  servicos: readonly T[],
  nomeDe: (servico: T) => string | null | undefined,
): SecaoDeServicos<T>[] {
  const porChave = new Map<string, SecaoDeServicos<T>>();

  for (const servico of servicos) {
    const { secao } = dividirNomeServico(nomeDe(servico));
    const chave = secao ?? SEM_SECAO;
    if (!porChave.has(chave)) {
      porChave.set(chave, {
        chave,
        titulo: secao ?? ROTULO_SEM_SECAO,
        itens: [],
      });
    }
    porChave.get(chave)!.itens.push(servico);
  }

  return [...porChave.values()].sort((a, b) => {
    if (a.chave === SEM_SECAO) return 1;
    if (b.chave === SEM_SECAO) return -1;
    return Number(a.chave) - Number(b.chave);
  });
}

/** Chave do grupo de serviços sem cluster. */
export const SEM_CLUSTER = '__sem_cluster__';

export interface GrupoDeCluster<T> {
  /** `cluster_id`, ou `SEM_CLUSTER`. */
  chave: string;
  titulo: string;
  /** Mesmo cluster do produto aberto — vai primeiro e ganha selo. */
  sugerido: boolean;
  /** Vinculados / total DENTRO deste cluster. */
  vinculados: number;
  total: number;
  secoes: SecaoDeServicos<T>[];
}

/**
 * Agrupa em DOIS níveis: cluster e, dentro dele, seção numérica.
 *
 * O nível do cluster não é enfeite — sem ele o número da seção é AMBÍGUO. A OSG
 * numera `1.01, 1.02…` e a Tax numera `1.1, 1.2…`; as duas formas têm "1" como
 * primeiro nível, então um agrupamento plano por número junta serviço de OSG com
 * serviço de Tax debaixo de uma seção chamada "1". Foi o que aconteceu: com um
 * produto Tax aberto, a seção "1" trazia cinco serviços de OSG e dois de Tax.
 *
 * Quem desambigua é o `cluster_id`, que já existe na tabela. Aninhar também
 * conserta o rótulo (a seção passa a ser lida como "TAX · 1", não "1" solto) e o
 * contador, que volta a ser sobre o cluster e não sobre o catálogo inteiro.
 */
export function agruparPorClusterESecao<T>(
  servicos: readonly T[],
  acesso: {
    nome: (servico: T) => string | null | undefined;
    clusterId: (servico: T) => string | null | undefined;
    clusterNome: (servico: T) => string | null | undefined;
    vinculado: (servico: T) => boolean;
  },
  clusterSugerido?: string | null,
): GrupoDeCluster<T>[] {
  const porCluster = new Map<string, { titulo: string; itens: T[] }>();

  for (const servico of servicos) {
    const chave = acesso.clusterId(servico) || SEM_CLUSTER;
    if (!porCluster.has(chave)) {
      porCluster.set(chave, {
        titulo: acesso.clusterNome(servico) || 'Sem cluster',
        itens: [],
      });
    }
    porCluster.get(chave)!.itens.push(servico);
  }

  const grupos: GrupoDeCluster<T>[] = [...porCluster.entries()].map(([chave, grupo]) => ({
    chave,
    titulo: grupo.titulo,
    sugerido: chave !== SEM_CLUSTER && chave === clusterSugerido,
    vinculados: grupo.itens.reduce((soma, s) => soma + (acesso.vinculado(s) ? 1 : 0), 0),
    total: grupo.itens.length,
    secoes: agruparPorSecao(grupo.itens, acesso.nome),
  }));

  // Sugerido primeiro (é onde a pessoa vai mexer), sem cluster por último.
  const peso = (g: GrupoDeCluster<T>) => (g.sugerido ? 0 : g.chave === SEM_CLUSTER ? 2 : 1);
  return grupos.sort(
    (a, b) => peso(a) - peso(b) || a.titulo.localeCompare(b.titulo, 'pt-BR'),
  );
}

/**
 * Quantos produtos cada serviço atende — o "usado em N produtos" da linha.
 *
 * Sai dos vínculos que a tela já carregou; não custa consulta nova.
 */
export function contarVinculosPorServico(
  vinculos: readonly { servico_prestado_id: string }[],
): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const vinculo of vinculos) {
    contagem[vinculo.servico_prestado_id] = (contagem[vinculo.servico_prestado_id] || 0) + 1;
  }
  return contagem;
}

/**
 * Os ids entre a âncora e o alvo, inclusive — a faixa do shift+clique.
 *
 * Recebe os ids na ORDEM EM QUE A TELA OS MOSTRA (já agrupados e filtrados), e
 * não a ordem do banco: shift+clique seleciona o que está visivelmente entre os
 * dois, que é o que a pessoa vê. Âncora ou alvo fora da lista devolve só o
 * alvo, para o clique nunca virar nada.
 */
export function faixaDeSelecao(
  idsVisiveis: readonly string[],
  ancora: string | null,
  alvo: string,
): string[] {
  if (!ancora || ancora === alvo) return [alvo];
  const inicio = idsVisiveis.indexOf(ancora);
  const fim = idsVisiveis.indexOf(alvo);
  if (inicio === -1 || fim === -1) return [alvo];
  const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio];
  return idsVisiveis.slice(de, ate + 1);
}

/**
 * Estado da caixa tri-state de uma seção: nenhum, parte ou todos.
 *
 * `'indeterminate'` é o valor que o `Checkbox` do repositório entende (ele troca
 * o check por um traço) — devolver a string dele evita traduzir no JSX.
 */
export function estadoDaSecao(
  itens: readonly { id: string }[],
  marcados: ReadonlySet<string>,
): boolean | 'indeterminate' {
  if (itens.length === 0) return false;
  const quantos = itens.reduce((soma, item) => soma + (marcados.has(item.id) ? 1 : 0), 0);
  if (quantos === 0) return false;
  return quantos === itens.length ? true : 'indeterminate';
}
