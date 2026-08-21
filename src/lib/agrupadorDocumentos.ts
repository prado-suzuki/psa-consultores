// Agrupador canônico de documentos: os 4 grupos que a área do cliente usa e o
// mapa das 9 categorias do enum osg_doc_categoria para esses grupos.
//
// Por que existe: havia três vocabulários concorrentes (as 9 categorias do
// enum, os rótulos DocBox e os 4 grupos da área do cliente). O agrupador
// oficial são os 4 grupos, e as chaves são exatamente as do enum osg_doc_grupo
// do banco (EDU-19): pf, pj, bens_imoveis e outros. Escrever diferente aqui faz
// o valor que vem do banco não casar com chave nenhuma e o documento sumir da
// gaveta sem erro nenhum.
//
// O mapa cobre as 9 categorias porque o cliente pode gravar qualquer uma delas:
// em 31/07/2026, de 22 arquivos ativos, 4 chegaram com fonte = 'cliente' nas
// categorias bens_direitos, cadastros_fiscais e georreferenciamento, pelo
// caminho de envio por item. Sem este mapa, o documento solicitado e o
// documento recebido caem em grupos diferentes.
//
// Esta lib é a única fonte da definição dos grupos. Telas de cliente e de
// consultor consomem daqui.
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

export type GrupoDocumentoKey = 'pf' | 'pj' | 'bens_imoveis' | 'outros';

export interface GrupoDocumento {
  key: GrupoDocumentoKey;
  titulo: string;
  subtitulo: string;
  /** Categoria gravada em documento_arquivo no upload deste grupo. */
  categoria: DocCategoria;
}

export const GRUPOS_DOCUMENTO: GrupoDocumento[] = [
  { key: 'pf', titulo: 'Pessoas Físicas', subtitulo: 'Fundadores e sócios', categoria: 'pessoais' },
  { key: 'pj', titulo: 'Pessoas Jurídicas', subtitulo: 'Empresas do grupo', categoria: 'societarios' },
  { key: 'bens_imoveis', titulo: 'Bens e Imóveis', subtitulo: 'Imóveis rurais e urbanos', categoria: 'agrarios' },
  { key: 'outros', titulo: 'Outros documentos', subtitulo: 'Documentos diversos', categoria: 'outros' },
];

/**
 * Grupo de cada uma das 9 categorias.
 *
 * O tipo `Record<DocCategoria, ...>` é proposital: se um valor novo entrar no
 * enum osg_doc_categoria, o typecheck quebra aqui até alguém decidir o grupo
 * dele. As 4 categorias que o cliente grava mantêm o destino que já tinham.
 *
 * Os destinos das outras 5 saem do catálogo documento_tipo (67 itens em
 * 04/08/2026, todos ativos e todos com grupo preenchido pela ALE-26):
 * declaracao_ir e sucessorios só existem em Pessoa Física; cadastros_fiscais
 * só em Matrícula; bens_direitos em 9 itens de Matrícula contra 3 de Bem, e
 * vale a maioria; georreferenciamento não tem item no catálogo e é sempre de
 * imóvel rural.
 */
const GRUPO_POR_CATEGORIA: Record<DocCategoria, GrupoDocumentoKey> = {
  pessoais: 'pf',
  declaracao_ir: 'pf',
  sucessorios: 'pf',
  societarios: 'pj',
  agrarios: 'bens_imoveis',
  bens_direitos: 'bens_imoveis',
  cadastros_fiscais: 'bens_imoveis',
  georreferenciamento: 'bens_imoveis',
  proposta_comercial: 'outros',
  outros: 'outros',
};

/**
 * De qual grupo é a categoria. Categoria fora do enum cai em "outros".
 *
 * O papel desta função encolheu na EDU-26: ela serve para ARQUIVO LEGADO, isto
 * é, linha de documento_arquivo sem `solicitacao_id`, que por isso não sabe de
 * qual pedido veio. O que foi PEDIDO agrupa pela coluna `grupo` da solicitação,
 * não por aqui. Não volte a usá-la como eixo de agrupamento do pedido.
 */
export function grupoDaCategoria(categoria: DocCategoria): GrupoDocumentoKey {
  return GRUPO_POR_CATEGORIA[categoria] ?? 'outros';
}
