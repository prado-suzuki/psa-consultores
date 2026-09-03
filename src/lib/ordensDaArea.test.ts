import { describe, expect, it } from 'vitest';
import {
  montarOrdensDaArea,
  produtosDaArea,
  type OrdemComProdutos,
  type ProdutoDaOrdem,
} from './ordensDaArea';

const OSG = 'cluster-osg';
const TAX = 'cluster-tax';

const produto = (
  id: string,
  clusterId: string | null,
  overrides: Partial<ProdutoDaOrdem> = {},
): ProdutoDaOrdem => ({ id, code: id.toUpperCase(), name: `Produto ${id}`, clusterId, ...overrides });

const CATALOGO = new Map<string, ProdutoDaOrdem>([
  ['es', produto('es', OSG)],
  ['gov', produto('gov', OSG)],
  ['ptr', produto('ptr', TAX)],
  ['orfao', produto('orfao', null)],
]);

const ordem = (id: string, produtoIds: string[]): OrdemComProdutos => ({
  id,
  numeroOs: `${id}/2026`,
  produtoIds,
});

/** Documentos de cada produto. `ptr` sem entrada = TAX ainda não mapeada. */
const DOCS = new Map<string, Set<string>>([
  ['es', new Set(['cpf', 'rg'])],
  ['gov', new Set(['rg', 'estatuto'])],
]);

describe('montarOrdensDaArea', () => {
  it('inclui a OS pelo produto, mesmo faturada em outro cluster', () => {
    // O caso que motivou a troca: Governança executada pela OSG e faturada pela
    // Familly Business. O faturamento não entra nesta função — de propósito.
    const resultado = montarOrdensDaArea([ordem('109', ['gov'])], CATALOGO, DOCS, OSG);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].numeroOs).toBe('109/2026');
  });

  it('deixa de fora a OS que só contrata produto de outra área', () => {
    expect(montarOrdensDaArea([ordem('200', ['ptr'])], CATALOGO, DOCS, OSG)).toEqual([]);
  });

  it('produto sem área declarada não entra em área nenhuma', () => {
    expect(montarOrdensDaArea([ordem('300', ['orfao'])], CATALOGO, DOCS, OSG)).toEqual([]);
    expect(montarOrdensDaArea([ordem('300', ['orfao'])], CATALOGO, DOCS, TAX)).toEqual([]);
  });

  it('mantém a OS da área cujo catálogo ainda não foi mapeado', () => {
    // Sem esta regra, a OS não apareceria e não haveria como abrir a
    // solicitação dela — é o estado de todo produto da TAX hoje.
    const soTax = montarOrdensDaArea([ordem('400', ['ptr'])], CATALOGO, DOCS, TAX);

    expect(soTax).toHaveLength(1);
    expect(soTax[0].documentos).toBe(0);
  });

  it('conta o documento pedido por dois produtos uma vez só', () => {
    const [os] = montarOrdensDaArea([ordem('500', ['es', 'gov'])], CATALOGO, DOCS, OSG);

    // cpf, rg, estatuto — o rg é pedido pelos dois.
    expect(os.documentos).toBe(3);
  });

  it('conta os documentos de TODOS os produtos, e mostra só os produtos da área', () => {
    // OS híbrida. A contagem espelha a RPC, que gera de todos os produtos; a
    // lista de produtos é o que o analista desta tela reconhece.
    const docsComTax = new Map(DOCS);
    docsComTax.set('ptr', new Set(['livro-caixa']));

    const [os] = montarOrdensDaArea([ordem('156', ['es', 'ptr'])], CATALOGO, docsComTax, OSG);

    expect(os.documentos).toBe(3); // cpf, rg, livro-caixa
    expect(os.produtos.map((p) => p.id)).toEqual(['es']);
  });

  it('preserva a ordem recebida das OS', () => {
    const resultado = montarOrdensDaArea(
      [ordem('102', ['es']), ordem('101', ['gov'])],
      CATALOGO,
      DOCS,
      OSG,
    );

    expect(resultado.map((os) => os.numeroOs)).toEqual(['102/2026', '101/2026']);
  });

  it('sem OS, devolve lista vazia em vez de levantar', () => {
    expect(montarOrdensDaArea([], CATALOGO, DOCS, OSG)).toEqual([]);
  });
});

describe('produtosDaArea', () => {
  it('fica com os da área e descarta os de outra e os sem área', () => {
    const resultado = produtosDaArea([...CATALOGO.values()], OSG);

    expect(resultado.map((p) => p.id)).toEqual(['es', 'gov']);
  });
});
