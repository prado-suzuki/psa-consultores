// Modelo puro do pedido de documentos (solicitacao / solicitacao_item).
//
// A regra que este arquivo existe para proteger: item vindo do catálogo NÃO
// copia texto. `documento`, `entidade` e `nota` ficam NULOS na linha do cliente e
// a exibição resolve por herança de `documento_tipo`. Preenchido significa uma
// coisa só — o analista sobrescreveu de propósito, para este cliente.
//
// Foi cópia que produziu o drift medido em 31/07/2026: 7 de 475 linhas de
// cliente diziam entidade = 'Bem' enquanto o catálogo, corrigido depois, dizia
// 'Cliente'. Por isso a montagem do insert e a montagem do update moram aqui,
// puras e testadas, em vez de espalhadas no hook.

import type { Database } from '@/integrations/supabase/types';

export type OsgDocGrupo = Database['public']['Enums']['osg_doc_grupo'];
export type SolicitacaoStatus = Database['public']['Enums']['osg_solicitacao_status'];
export type SolicitacaoItemStatus = Database['public']['Enums']['osg_solicitacao_item_status'];
export type SolicitacaoItemInsert = Database['public']['Tables']['solicitacao_item']['Insert'];
export type SolicitacaoItemUpdate = Database['public']['Tables']['solicitacao_item']['Update'];

/**
 * O "grão" do documento: por qual coisa ele se repete.
 *
 * O banco guarda `granularidade` como texto com CHECK (migration
 * 20260803190000), e não como enum — então o tipo gerado é `string`. Esta lista
 * espelha o CHECK e é o que dá domínio fechado ao front.
 */
export const GRANULARIDADES = [
  'pessoa_pf',
  'pessoa_pj',
  'matricula_rural',
  'matricula_urbana',
  'bem',
  'cliente',
] as const;

export type Granularidade = (typeof GRANULARIDADES)[number];

export function ehGranularidade(valor: string): valor is Granularidade {
  return (GRANULARIDADES as readonly string[]).includes(valor);
}

/**
 * Estreita o texto do banco para o domínio fechado — ou levanta.
 *
 * Levantar é deliberado: o CHECK do banco já garante o domínio, então um valor
 * fora dele significa que a constraint mudou sem o front saber. Cair num
 * `'cliente'` de consolo esconderia o documento na gaveta errada sem erro
 * nenhum, que é o pior modo de falha deste fluxo.
 */
export function paraGranularidade(valor: string): Granularidade {
  if (!ehGranularidade(valor)) {
    throw new Error(
      `Granularidade "${valor}" fora do domínio de solicitacao_item. `
      + `Esperado: ${GRANULARIDADES.join(', ')}.`,
    );
  }
  return valor;
}

/**
 * Como cada grão se chama na tela.
 *
 * A correspondência com o antigo campo `entidade` é 1 para 1 (conferido no
 * catálogo em 31/07/2026), e é por isso que `entidade` deixou de ser campo do
 * formulário: virou rótulo derivado do grão.
 */
export const ROTULO_GRANULARIDADE: Record<Granularidade, string> = {
  pessoa_pf: 'Pessoa Física',
  pessoa_pj: 'Pessoa Jurídica',
  matricula_rural: 'Matrícula (Imóvel Rural)',
  matricula_urbana: 'Matrícula (Imóvel Urbano)',
  bem: 'Bem',
  cliente: 'Cliente',
};

/**
 * Os dois grãos possíveis dentro de "Bens e Imóveis".
 *
 * `bem` fica fora: existe no CHECK da tabela, mas nenhum item do catálogo o usa
 * — oferecer abriria pedido num grão que o resto do fluxo não trata.
 */
export const GRAOS_DE_BENS_IMOVEIS = ['matricula_rural', 'matricula_urbana'] as const;

/**
 * O grão que a gaveta determina — ou `null` quando ela não determina nenhum.
 *
 * Em três das quatro gavetas o grão é consequência direta e não faz sentido
 * perguntar: Pessoas Físicas é sempre `pessoa_pf`, Pessoas Jurídicas sempre
 * `pessoa_pj`, Outros documentos sempre `cliente`.
 *
 * "Bens e Imóveis" é a exceção e devolve `null` de propósito: a gaveta abriga
 * matrícula rural e urbana, e escolher uma por padrão gravaria um grão que o
 * analista não escolheu. Aí a tela pergunta.
 */
export function graoSugeridoParaGrupo(grupo: OsgDocGrupo): Granularidade | null {
  switch (grupo) {
    case 'pf':
      return 'pessoa_pf';
    case 'pj':
      return 'pessoa_pj';
    case 'outros':
      return 'cliente';
    case 'bens_imoveis':
      return null;
  }
}

/** O que a lib precisa saber de `documento_tipo` para resolver a herança. */
export interface CatalogoDocumento {
  id: string;
  codigo: string;
  documento: string;
  entidade: string;
  nota: string | null;
  granularidade: string;
  grupo: OsgDocGrupo;
  ordem: number;
  confidencial: boolean;
}

/**
 * A linha de `solicitacao_item` com o catálogo já embarcado pela query.
 *
 * `type` e não `interface` de propósito: só o alias ganha índice implícito, que
 * é o que deixa a linha ser passada direto a `computeFieldDiff` sem cast.
 */
export type SolicitacaoItemRow = {
  id: string;
  item_padrao_id: string | null;
  granularidade: string;
  grupo: OsgDocGrupo;
  documento: string | null;
  entidade: string | null;
  nota: string | null;
  status: SolicitacaoItemStatus;
  ordem: number;
  observacao: string | null;
  catalogo: CatalogoDocumento | null;
};

/** Quais dos três textos o analista sobrescreveu nesta linha. */
export interface TextoSobrescrito {
  documento: boolean;
  entidade: boolean;
  nota: boolean;
}

/** A linha pronta para a tela: texto já resolvido, origem preservada. */
export interface ItemSolicitacao {
  id: string;
  itemPadraoId: string | null;
  /** Veio do catálogo (herda texto) ou foi criado à mão (texto próprio). */
  doCatalogo: boolean;
  granularidade: Granularidade;
  grupo: OsgDocGrupo;
  ordem: number;
  status: SolicitacaoItemStatus;
  observacao: string | null;
  documento: string;
  entidade: string;
  nota: string | null;
  sobrescrito: TextoSobrescrito;
  /** Do catálogo; nulo no item manual. */
  codigo: string | null;
  confidencial: boolean;
}

/**
 * Resolve uma linha para exibição, herdando do catálogo o que estiver nulo.
 *
 * Mesmo `coalesce` da RPC do cliente (EDU-24): os dois lados têm de mostrar o
 * mesmo texto para o mesmo item.
 */
export function resolverItem(row: SolicitacaoItemRow): ItemSolicitacao {
  const { catalogo } = row;

  if (row.item_padrao_id && !catalogo) {
    throw new Error(
      `Item ${row.id} aponta para o catálogo (${row.item_padrao_id}) mas veio sem `
      + 'o documento_tipo embarcado — a query precisa trazer o join para resolver a herança.',
    );
  }

  const documento = row.documento ?? catalogo?.documento ?? null;
  if (!documento) {
    throw new Error(
      `Item ${row.id} não tem documento nem na linha nem no catálogo — linha inconsistente.`,
    );
  }

  return {
    id: row.id,
    itemPadraoId: row.item_padrao_id,
    doCatalogo: Boolean(row.item_padrao_id),
    granularidade: paraGranularidade(row.granularidade),
    grupo: row.grupo,
    ordem: row.ordem,
    status: row.status,
    observacao: row.observacao,
    documento,
    entidade: row.entidade ?? catalogo?.entidade ?? '',
    nota: row.nota ?? catalogo?.nota ?? null,
    sobrescrito: {
      documento: row.documento !== null,
      entidade: row.entidade !== null,
      nota: row.nota !== null,
    },
    codigo: catalogo?.codigo ?? null,
    confidencial: catalogo?.confidencial ?? false,
  };
}

/**
 * Ordena como a área do cliente ordena (EDU-24): `ordem`, depois o texto.
 *
 * Ordenar aqui e não no `.order()` do PostgREST porque o texto que ordena é o
 * RESOLVIDO — o banco ordenaria pelo campo da linha, que é nulo no item de
 * catálogo.
 */
export function ordenarItens(itens: ItemSolicitacao[]): ItemSolicitacao[] {
  return [...itens].sort((esquerda, direita) =>
    esquerda.ordem - direita.ordem
    || esquerda.documento.localeCompare(direita.documento, 'pt-BR'));
}

/**
 * Agrupa pelas gavetas do cliente, pela CHAVE DO ENUM do banco.
 *
 * Sem rótulo de propósito: quem nomeia os 4 grupos é `GRUPOS_DOCUMENTO`
 * (src/lib/agrupadorDocumentos.ts). Enquanto a EDU-26 não fecha a grafia da
 * terceira chave (`bens_imoveis` no banco, `imoveis` na lib), esta função fala
 * só a língua do banco e não escolhe lado.
 */
export function agruparPorGrupo(
  itens: ItemSolicitacao[],
): Map<OsgDocGrupo, ItemSolicitacao[]> {
  const porGrupo = new Map<OsgDocGrupo, ItemSolicitacao[]>();
  for (const item of ordenarItens(itens)) {
    const atuais = porGrupo.get(item.grupo) ?? [];
    atuais.push(item);
    porGrupo.set(item.grupo, atuais);
  }
  return porGrupo;
}

/**
 * Linha nova a partir do catálogo — SEM copiar texto.
 *
 * `granularidade` e `grupo` são copiados porque são dados ESTRUTURAIS, que o
 * analista tem o direito de sobrescrever item a item. `documento`, `entidade` e
 * `nota` ficam de fora do payload (nulos no banco) porque são TEXTO DE EXIBIÇÃO,
 * cuja fonte da verdade é o catálogo. Mesma divisão da RPC (EDU-25).
 *
 * O `id` também fica de fora: quem gera é o `gen_random_uuid()` da tabela. Chave
 * primária sorteada no navegador foi o que mascarou duplicata no fluxo antigo.
 */
/** Os dois campos estruturais que o analista pode sobrescrever item a item. */
export interface EstruturaDoItem {
  grupo?: OsgDocGrupo;
  granularidade?: Granularidade;
}

export function montarItemDeCatalogo(
  solicitacaoId: string,
  catalogo: CatalogoDocumento,
  /**
   * O que o analista trocou no modal antes de incluir.
   *
   * Grão e gaveta são os dois campos que ele tem o direito de sobrescrever item
   * a item — e no grão `cliente` a gaveta não é dedutível, então a troca precisa
   * chegar ao banco. Texto continua fora: não há como sobrescrever documento,
   * entidade ou nota por aqui.
   */
  estrutura?: EstruturaDoItem,
): SolicitacaoItemInsert {
  return {
    solicitacao_id: solicitacaoId,
    item_padrao_id: catalogo.id,
    granularidade: estrutura?.granularidade ?? catalogo.granularidade,
    grupo: estrutura?.grupo ?? catalogo.grupo,
    ordem: catalogo.ordem,
    status: 'ativo',
  };
}

/** Documento que não existe no catálogo, digitado pelo analista. */
export interface NovoItemManual {
  documento: string;
  granularidade: Granularidade;
  grupo: OsgDocGrupo;
  entidade?: string | null;
  nota?: string | null;
  ordem?: number;
}

const texto = (valor: string | null | undefined) => valor?.trim() || null;

/**
 * Forma canônica do nome de um documento, para comparação.
 *
 * Ignora acento, caixa e espaço nas pontas. Fica aqui, no domínio, e não na lib
 * de exibição, porque é regra de igualdade de pedido — quem exibe importa daqui.
 */
export function normalizarNomeDocumento(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * Item manual da solicitação com o mesmo nome — a proteção contra duplicata.
 *
 * O banco protege o caso exato, pela constraint `uq_solicitacao_item_documento`
 * em `(solicitacao_id, documento)`. Esta comparação é a camada de cima e cobre o
 * que a constraint não alcança: ela normaliza caixa, espaço e acento, então
 * "Contrato" e "contrato " param aqui em vez de virarem duas linhas.
 *
 * Também é o que devolve mensagem legível antes de o banco recusar.
 */
export function encontrarManualComMesmoNome(
  itens: ItemSolicitacao[],
  documento: string,
): ItemSolicitacao | undefined {
  const alvo = normalizarNomeDocumento(documento);
  if (!alvo) return undefined;
  return itens.find((item) =>
    !item.doCatalogo && normalizarNomeDocumento(item.documento) === alvo);
}

/**
 * Linha nova criada à mão: `item_padrao_id` nulo e todo o texto na própria
 * linha, que é o único caso em que texto na linha não é sobrescrita.
 */
export function montarItemManual(
  solicitacaoId: string,
  entrada: NovoItemManual,
): SolicitacaoItemInsert {
  const documento = texto(entrada.documento);
  if (!documento) {
    throw new Error('Informe o nome do documento para incluí-lo na solicitação.');
  }

  return {
    solicitacao_id: solicitacaoId,
    item_padrao_id: null,
    granularidade: entrada.granularidade,
    grupo: entrada.grupo,
    documento,
    entidade: texto(entrada.entidade),
    nota: texto(entrada.nota),
    ordem: entrada.ordem ?? 0,
    status: 'ativo',
  };
}

/** O que o modal de edição pode mudar numa linha que já existe. */
export interface EdicaoItem {
  documento?: string;
  entidade?: string;
  nota?: string;
  grupo?: OsgDocGrupo;
  granularidade?: Granularidade;
}

/**
 * Monta o `update` de uma edição, com duas propriedades que a tela depende:
 *
 * 1) Só entra no payload o campo que REALMENTE mudou. É o que faz o diff da
 *    auditoria dizer a verdade e o que evita `updated_at` novo à toa.
 * 2) Em item de catálogo, texto igual ao do catálogo (ou apagado) volta a ser
 *    NULO — isto é, volta a HERDAR. Sem isso, "corrigir de volta" deixaria uma
 *    cópia congelada na linha, que é exatamente o drift que esta frente combate.
 *
 * No item manual não existe herança: o texto é dele, e `documento` vazio é
 * recusado em vez de virar nulo.
 */
export function montarAtualizacaoItem(
  row: SolicitacaoItemRow,
  edicao: EdicaoItem,
): SolicitacaoItemUpdate {
  const doCatalogo = Boolean(row.item_padrao_id);
  const alteracoes: SolicitacaoItemUpdate = {};

  const resolverTexto = (
    campo: 'documento' | 'entidade' | 'nota',
    valor: string,
  ): string | null => {
    const limpo = texto(valor);
    if (!doCatalogo) {
      if (campo === 'documento' && !limpo) {
        throw new Error('Informe o nome do documento para salvar a alteração.');
      }
      return limpo;
    }
    // Igual ao catálogo não é sobrescrita — é herança.
    return limpo === (row.catalogo?.[campo] ?? null) ? null : limpo;
  };

  for (const campo of ['documento', 'entidade', 'nota'] as const) {
    const valor = edicao[campo];
    if (valor === undefined) continue;
    const proximo = resolverTexto(campo, valor);
    if (proximo !== row[campo]) alteracoes[campo] = proximo;
  }

  if (edicao.grupo !== undefined && edicao.grupo !== row.grupo) {
    alteracoes.grupo = edicao.grupo;
  }
  if (edicao.granularidade !== undefined && edicao.granularidade !== row.granularidade) {
    alteracoes.granularidade = edicao.granularidade;
  }

  return alteracoes;
}

/** O item do catálogo que já está nesta solicitação — ativo ou dispensado. */
export function encontrarItemDoCatalogo(
  itens: ItemSolicitacao[],
  itemPadraoId: string,
): ItemSolicitacao | undefined {
  return itens.find((item) => item.itemPadraoId === itemPadraoId);
}

/**
 * Traz de volta um item dispensado.
 *
 * Existe porque dispensar não apaga a linha: pedir o mesmo documento de novo não
 * pode virar `insert` (os índices únicos recusam, e recusar é o certo) nem
 * `delete` seguido de `insert` (perderia o rastro). Reativar é o único caminho
 * que respeita as duas coisas.
 *
 * `observacao` volta a nulo de propósito: ela guardava o motivo da dispensa, que
 * descreve um estado que terminou — mantê-la afirmaria que um item ativo tem
 * motivo de dispensa. A transição fica registrada na auditoria.
 */
export function montarReativacaoItem(estrutura?: EstruturaDoItem): SolicitacaoItemUpdate {
  return {
    status: 'ativo',
    observacao: null,
    ...(estrutura?.grupo ? { grupo: estrutura.grupo } : {}),
    ...(estrutura?.granularidade ? { granularidade: estrutura.granularidade } : {}),
  };
}

/**
 * O recorte por produto — uma LENTE sobre a lista, nunca uma partição.
 *
 * `solicitacao_item` não tem coluna de produto, e não deve ter: no catálogo, um
 * documento é pedido por 4,6 produtos em média (até 8), e num cliente real como o
 * Mms Agro 47 dos 60 documentos da OS são pedidos por mais de um produto. Gravar
 * "o produto deste documento" obrigaria a escolher um em 78% dos casos, o que é
 * inventar dado.
 *
 * Então o produto é calculado pelo mesmo vínculo (`produto_documento_tipo`) que a
 * RPC usa para gerar a lista. Um documento aparece sob TODOS os produtos que o
 * pedem — os contadores somam mais que o total, e isso é a verdade, não erro.
 */
export const FILTRO_TODOS = '__todos__';

/** Documento do catálogo → produtos da OS que o pedem. */
export type ProdutosPorDocumento = Map<string, string[]>;

export function filtrarPorProduto(
  itens: ItemSolicitacao[],
  filtro: string,
  produtosPorDocumento: ProdutosPorDocumento,
): ItemSolicitacao[] {
  if (filtro === FILTRO_TODOS) return itens;

  // Criado à mão não pertence a produto nenhum, então nenhum filtro de produto o
  // alcança: ele aparece só na lista consolidada.
  return itens.filter((item) =>
    Boolean(item.itemPadraoId)
    && (produtosPorDocumento.get(item.itemPadraoId as string) ?? []).includes(filtro));
}

/** Quantos itens da lista cada produto pede. */
export function contarPorProduto(
  itens: ItemSolicitacao[],
  produtosPorDocumento: ProdutosPorDocumento,
): Map<string, number> {
  const contagem = new Map<string, number>();

  for (const item of itens) {
    if (!item.itemPadraoId) continue;
    for (const produtoId of produtosPorDocumento.get(item.itemPadraoId) ?? []) {
      contagem.set(produtoId, (contagem.get(produtoId) ?? 0) + 1);
    }
  }

  return contagem;
}

/** Campos que a auditoria compara em `solicitacao_item`. */
export const CAMPOS_AUDITADOS_ITEM = [
  'documento',
  'entidade',
  'nota',
  'grupo',
  'granularidade',
  'status',
  'observacao',
] as const;
