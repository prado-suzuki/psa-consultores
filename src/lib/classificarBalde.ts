import { CATEGORIAS } from '@/components/equipe/osg/documentos/docMeta';
import type { DocCategoria, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

/**
 * Regras puras do "balde" do modo Classificar (ver docs/planos/cadastro-vinculo-documentos.md).
 *
 * O balde é o conjunto de arquivos do cliente que ainda não têm dono. Como o
 * vínculo é 1:1 e mora nas colunas da própria linha do arquivo (§5, regra 3),
 * "sem dono" é uma pergunta que se responde lendo a linha: nenhuma das três
 * colunas de entidade preenchida. Vincular = sair do balde, sem estado extra.
 */

/** Gaveta = a categoria com que o arquivo entrou (o mesmo campo que a árvore agrupa). */
export type Gaveta = DocCategoria | 'todas';

/** Um arquivo está sem dono quando nenhuma coluna de vínculo de entidade está preenchida. */
export const semDono = (doc: DocumentoArquivoRow): boolean =>
  !doc.pessoa_id && !doc.bem_id && !doc.matricula_id;

/** Comparação de texto tolerante a acento e caixa, para a busca por nome. */
export const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export interface FiltroBalde {
  gaveta: Gaveta;
  busca: string;
  /**
   * Ids marcados como "não é de ninguém" nesta sessão. Não existe coluna para
   * persistir essa marca hoje (ver relatório/§10): a válvula tira o arquivo do
   * balde enquanto a tela está aberta e volta ao recarregar.
   */
  resolvidos?: readonly string[];
}

const doBalde = (docs: readonly DocumentoArquivoRow[], resolvidos: readonly string[] = []) =>
  docs.filter((doc) => semDono(doc) && !resolvidos.includes(doc.id));

/**
 * Arquivos do balde, na gaveta escolhida e casando com a busca.
 *
 * Ordem: recebidos mais recentes primeiro. É a única ordenação que o dado de
 * hoje sustenta sem inventar sinal (a varredura por probabilidade é a questão
 * aberta nº 2 do plano) — e coincide com "último lote que chegou".
 */
export function filtrarBalde(
  docs: readonly DocumentoArquivoRow[],
  { gaveta, busca, resolvidos = [] }: FiltroBalde,
): DocumentoArquivoRow[] {
  const termo = normalizarTexto(busca);
  return doBalde(docs, resolvidos)
    .filter((doc) => (gaveta === 'todas' ? true : doc.categoria === gaveta))
    .filter((doc) => (termo ? normalizarTexto(doc.nome_original).includes(termo) : true))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/** Quantos arquivos do cliente ainda não têm dono (o indicador de progresso do §4). */
export const contarSemDono = (
  docs: readonly DocumentoArquivoRow[],
  resolvidos: readonly string[] = [],
): number => doBalde(docs, resolvidos).length;

export interface GavetaContagem {
  value: Gaveta;
  label: string;
  total: number;
}

/** Gavetas que têm arquivo sem dono, na ordem de exibição do hub, com "Todas" na frente. */
export function contarPorGaveta(
  docs: readonly DocumentoArquivoRow[],
  resolvidos: readonly string[] = [],
): GavetaContagem[] {
  const noBalde = doBalde(docs, resolvidos);
  const porGaveta = new Map<DocCategoria, number>();
  for (const doc of noBalde) porGaveta.set(doc.categoria, (porGaveta.get(doc.categoria) ?? 0) + 1);
  const gavetas = CATEGORIAS.filter((categoria) => porGaveta.has(categoria.value)).map((categoria) => ({
    value: categoria.value as Gaveta,
    label: categoria.label,
    total: porGaveta.get(categoria.value) ?? 0,
  }));
  return [{ value: 'todas' as Gaveta, label: 'Todas as gavetas', total: noBalde.length }, ...gavetas];
}

/**
 * Próximo arquivo a abrir depois de resolver um. Mantém o consultor no balde:
 * segue para o vizinho de baixo e, se era o último, para o de cima.
 */
export function proximoDoBalde(
  lista: readonly DocumentoArquivoRow[],
  resolvidoId: string,
): DocumentoArquivoRow | null {
  const indice = lista.findIndex((doc) => doc.id === resolvidoId);
  const restantes = lista.filter((doc) => doc.id !== resolvidoId);
  if (restantes.length === 0) return null;
  if (indice < 0) return restantes[0];
  return restantes[Math.min(indice, restantes.length - 1)];
}
