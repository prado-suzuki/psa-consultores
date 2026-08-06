import { CATEGORIAS } from '@/components/equipe/osg/documentos/docMeta';
import type { DocCategoria, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

/**
 * Regras puras do "balde" do modo Classificar (ver docs/planos/cadastro-vinculo-documentos.md).
 *
 * O balde é o conjunto de arquivos do cliente que ainda não foram triados. Como
 * o vínculo é 1:1 e mora nas colunas da própria linha do arquivo (§5, regra 3),
 * "está no balde" é uma pergunta que se responde lendo a linha, sem estado de
 * tela: nenhuma das três colunas de entidade preenchida E sem a marca de
 * triagem. Vincular ou marcar "é do cliente" = sair do balde, para valer.
 */

/** Gaveta = a categoria com que o arquivo entrou (o mesmo campo que a árvore agrupa). */
export type Gaveta = DocCategoria | 'todas';

/**
 * Um arquivo está sem dono quando não tem entidade dona e ninguém decidiu que
 * ele é do cliente como um todo.
 *
 * `triado_em` (BER-39) é o que separa "ainda não olharam" de "olharam e
 * concluíram que não é de ninguém". Antes dessa coluna os dois eram o mesmo
 * estado no banco, e a segunda decisão vivia na memória da tela.
 */
export const semDono = (doc: DocumentoArquivoRow): boolean =>
  !doc.pessoa_id && !doc.bem_id && !doc.matricula_id && !doc.triado_em;

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
}

const doBalde = (docs: readonly DocumentoArquivoRow[]) => docs.filter(semDono);

/**
 * Arquivos do balde, na gaveta escolhida e casando com a busca.
 *
 * Ordem: recebidos mais recentes primeiro. É a única ordenação que o dado de
 * hoje sustenta sem inventar sinal (a varredura por probabilidade é a questão
 * aberta nº 2 do plano) — e coincide com "último lote que chegou".
 */
export function filtrarBalde(
  docs: readonly DocumentoArquivoRow[],
  { gaveta, busca }: FiltroBalde,
): DocumentoArquivoRow[] {
  const termo = normalizarTexto(busca);
  return doBalde(docs)
    .filter((doc) => (gaveta === 'todas' ? true : doc.categoria === gaveta))
    .filter((doc) => (termo ? normalizarTexto(doc.nome_original).includes(termo) : true))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/** Quantos arquivos do cliente ainda não têm dono (o indicador de progresso do §4). */
export const contarSemDono = (docs: readonly DocumentoArquivoRow[]): number => doBalde(docs).length;

export interface GavetaContagem {
  value: Gaveta;
  label: string;
  total: number;
}

/** Gavetas que têm arquivo sem dono, na ordem de exibição do hub, com "Todas" na frente. */
export function contarPorGaveta(docs: readonly DocumentoArquivoRow[]): GavetaContagem[] {
  const noBalde = doBalde(docs);
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
 * Próximo arquivo a abrir depois de tratar um — ou uma leva deles, quando o
 * consultor recruta vários arquivos para o mesmo cadastro. Mantém o consultor no
 * balde: segue para o vizinho de baixo do primeiro tratado e, se era o último,
 * para o de cima.
 */
export function proximoDoBalde(
  lista: readonly DocumentoArquivoRow[],
  tratados: string | readonly string[],
): DocumentoArquivoRow | null {
  const ids = typeof tratados === 'string' ? [tratados] : tratados;
  const indices = ids.map((id) => lista.findIndex((doc) => doc.id === id)).filter((i) => i >= 0);
  const restantes = lista.filter((doc) => !ids.includes(doc.id));
  if (restantes.length === 0) return null;
  if (indices.length === 0) return restantes[0];
  return restantes[Math.min(Math.min(...indices), restantes.length - 1)];
}
