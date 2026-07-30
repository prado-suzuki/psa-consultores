// Agrupador canônico de documentos: os 4 grupos que a área do cliente usa e o
// mapa das 9 categorias do enum osg_doc_categoria para esses grupos.
//
// Por que existe: havia três vocabulários concorrentes (as 9 categorias do
// enum, os rótulos DocBox e os 4 grupos da área do cliente). O agrupador
// oficial são os 4 grupos. O cliente só grava 4 das 9 categorias
// (pessoais, societarios, agrarios, outros); as outras 5 aparecem no catálogo
// checklist_item_padrao mas nunca chegam pelo upload. Sem este mapa, o
// documento solicitado e o documento recebido caem em grupos diferentes.
//
// Esta lib é a única fonte da definição dos grupos. Telas de cliente e de
// consultor consomem daqui.
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

export type GrupoDocumentoKey = 'pf' | 'pj' | 'imoveis' | 'outros';

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
  { key: 'imoveis', titulo: 'Matrículas e Imóveis', subtitulo: 'Imóveis rurais e urbanos', categoria: 'agrarios' },
  { key: 'outros', titulo: 'Outros documentos', subtitulo: 'Documentos diversos', categoria: 'outros' },
];

/**
 * Grupo de cada uma das 9 categorias.
 *
 * O tipo `Record<DocCategoria, ...>` é proposital: se um valor novo entrar no
 * enum osg_doc_categoria, o typecheck quebra aqui até alguém decidir o grupo
 * dele. As 4 categorias que o cliente grava mantêm o destino que já tinham.
 *
 * Os destinos das outras 5 saem do catálogo (67 itens, conferido em 28/07):
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
  agrarios: 'imoveis',
  bens_direitos: 'imoveis',
  cadastros_fiscais: 'imoveis',
  georreferenciamento: 'imoveis',
  outros: 'outros',
};

/** De qual grupo é a categoria. Categoria fora do enum cai em "outros". */
export function grupoDaCategoria(categoria: DocCategoria): GrupoDocumentoKey {
  return GRUPO_POR_CATEGORIA[categoria] ?? 'outros';
}
