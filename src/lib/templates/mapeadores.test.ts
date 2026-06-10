import { describe, it, expect } from 'vitest';
import {
  mapearIntegralizacoes,
  mapearMatricula,
  mapearQuadroSocietario,
  type ItemLista,
  type MatriculaIntegralizacao,
  type MatriculaParaMapear,
  type SocioParaMapear,
  type TitularParaMapear,
} from './mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

type Campos = Record<string, string>;

/** Matrícula mínima: só os titulares importam para estes testes. */
function matriculaCom(titulares: TitularParaMapear[]): MatriculaParaMapear {
  return {
    numero: '2.628', livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: null,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null, titulares,
  };
}

function socio(denominacao: string, quotas: number, vlr_total: number): SocioParaMapear {
  return {
    pessoa: { denominacao, tipo_pessoa: 'PF', genero: 'M' } as unknown as PessoaRow,
    quotas,
    vlr_total,
    representante: null,
  };
}

describe('mapearQuadroSocietario — percentual calculado e total', () => {
  it('injeta socio.percentual (quotas ÷ total) e agrega a linha total', () => {
    const { itens, total } = mapearQuadroSocietario([
      socio('Sócio A', 75, 75),
      socio('Sócio B', 25, 25),
    ]);

    expect((itens[0].socio as Campos).percentual).toBe('75,000%');
    expect((itens[1].socio as Campos).percentual).toBe('25,000%');
    // Campos por sócio continuam disponíveis sob o escopo "socio".
    expect((itens[0].socio as Campos).quotas).toBe('75');
    expect((itens[0].socio as Campos).vlrTotal).toBe('75,00');

    expect(total.quotas).toBe('100');
    expect(total.vlrTotal).toBe('100,00');
    expect(total.percentual).toBe('100,000%');
  });

  it('sem quotas: total fica vazio (não força 0%) e não quebra', () => {
    const { itens, total } = mapearQuadroSocietario([socio('Sócio sem quota', 0, 0)]);
    expect(total).toEqual({});
    expect((itens[0].socio as Campos).percentual).toBeUndefined();
  });
});

describe('mapearMatricula — titularidade (forma inteira × fracionada)', () => {
  it('titular único: forma inteira, sem fração nem remanescente', () => {
    const c = mapearMatricula(matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a' }]));
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBeUndefined();
    expect(c.remanescente).toBeUndefined();
    expect(c.fracionado).toBe('');
  });

  it('composse sem integralizador: "A e B" (forma inteira)', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a' },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b' },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo e Maria Auxiliadora');
    expect(c.fracionado).toBe('');
  });

  it('integralizador com fração: lidera a frase, demais viram remanescente', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe('50,000%');
    expect(c.percentualExtenso).toBe('cinquenta inteiros por cento');
    expect(c.remanescente).toBe('Maria Auxiliadora');
    expect(c.fracionado).toBe('sim');
  });

  it('integralizador sem outros titulares: não fraciona (não há remanescente)', () => {
    const c = mapearMatricula(
      matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 }]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBeUndefined();
    expect(c.fracionado).toBe('');
  });

  it('deduplica as duas linhas (posse de fato + de direito) da mesma pessoa', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', fracao: 50 },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
      ]),
    );
    // José aparece uma vez (líder); Maria é o remanescente — sem duplicar.
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.remanescente).toBe('Maria Auxiliadora');
  });
});

describe('mapearIntegralizacoes — alíneas por sócio com referência cruzada (padrão MMS)', () => {
  function socioIntegralizante(id: string, denominacao: string): SocioParaMapear {
    return {
      pessoa: { id, denominacao, tipo_pessoa: 'PF', genero: 'M' } as unknown as PessoaRow,
      quotas: 100,
      vlr_total: 100,
      representante: null,
    };
  }

  function matIntegralizacao(
    id: string,
    numero: string,
    vlr: number | null,
    titulares: TitularParaMapear[],
  ): MatriculaIntegralizacao {
    return {
      id, numero, livro: null, folha: null,
      municipio_imovel: null, uf_imovel: null,
      area_documento: null, area_unidade: null, vlr_contabil: vlr,
      confrontacoes_texto: null, descricao_psa_completa: null,
      bem: null, cartorio: null, titulares,
    };
  }

  const jose = socioIntegralizante('j', 'José Eduardo');
  const maria = socioIntegralizante('m', 'Maria Auxiliadora');
  const meio = (pessoaId: string, denominacao: string): TitularParaMapear =>
    ({ pessoaId, denominacao, fracao: 50 });

  // m1: condomínio 50/50 exato; m2: 50/50 com centavo ímpar (caso MMS real);
  // m3: só do José (titular único, sem fração).
  const matriculas = [
    matIntegralizacao('m1', '2.424', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    matIntegralizacao('m2', '2.623', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    matIntegralizacao('m3', '9.617', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
  ];

  const imovel = (item: ItemLista, i: number) =>
    ((item.imoveis as ItemLista[])[i].imovel as Record<string, string>);
  const flag = (item: ItemLista, i: number, chave: string) =>
    (item.imoveis as ItemLista[])[i][chave] as boolean;

  it('um item por sócio (ordem do quadro), com rótulo de parágrafo a partir do Segundo', () => {
    const itens = mapearIntegralizacoes([jose, maria], matriculas);
    expect(itens).toHaveLength(2);
    expect((itens[0].socio as Record<string, string>).paragrafo).toBe('Segundo');
    expect((itens[1].socio as Record<string, string>).paragrafo).toBe('Terceiro');
    expect((itens[0].imoveis as ItemLista[])).toHaveLength(3);
    expect((itens[1].imoveis as ItemLista[])).toHaveLength(2);
  });

  it('1ª ocorrência sai completa (fração à frente, remanescente); o sócio do parágrafo lidera', () => {
    const [pJose] = mapearIntegralizacoes([jose, maria], matriculas);
    const a = imovel(pJose, 0);
    expect(flag(pJose, 0, 'completa')).toBe(true);
    expect(flag(pJose, 0, 'referencia')).toBe(false);
    expect(a.alinea).toBe('a');
    expect(a.proprietario).toBe('José Eduardo');
    expect(a.percentual).toBe('50,000%');
    expect(a.percentualExtenso).toBe('cinquenta inteiros por cento');
    expect(a.remanescente).toBe('Maria Auxiliadora');
    expect(a.valor).toBe('125.000,00');
    expect(a.fracionado).toBe('sim');
  });

  it('ocorrência seguinte sai como referência à alínea/parágrafo da descrição original', () => {
    const [, pMaria] = mapearIntegralizacoes([jose, maria], matriculas);
    const a = imovel(pMaria, 0);
    expect(flag(pMaria, 0, 'referencia')).toBe(true);
    expect(flag(pMaria, 0, 'completa')).toBe(false);
    expect(a.alinea).toBe('a');
    expect(a.refAlinea).toBe('a');
    expect(a.refParagrafo).toBe('segundo');
    expect(a.refSocio).toBe('José Eduardo');
    expect(a.numero).toBe('2.424');
    expect(a.proprietario).toBe('Maria Auxiliadora');
    expect(a.remanescente).toBe('José Eduardo');
  });

  it('fecha os centavos no último sócio (69.013,61 + 69.013,60 = 138.027,21, como no MMS)', () => {
    const [pJose, pMaria] = mapearIntegralizacoes([jose, maria], matriculas);
    expect(imovel(pJose, 1).valor).toBe('69.013,61');
    expect(imovel(pMaria, 1).valor).toBe('69.013,60');
  });

  it('titular único sem fração: forma inteira, valor cheio, sem percentual', () => {
    const [pJose] = mapearIntegralizacoes([jose, maria], matriculas);
    const c = imovel(pJose, 2);
    expect(c.alinea).toBe('c');
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe(''); // ausente vira '' na lista (condicional pula o trecho)
    expect(c.valor).toBe('558.413,55');
    expect(c.fracionado).toBe('');
    expect(c.inteiro).toBe('sim');
    expect(c.livro).toBe(''); // campo de cadastro vazio não derruba a prévia
  });

  it('sócio sem imóvel fica fora da lista (não ganha parágrafo)', () => {
    const semImovel = socioIntegralizante('x', 'Sócio Capitalista');
    const itens = mapearIntegralizacoes([jose, semImovel, maria], matriculas);
    expect(itens).toHaveLength(2);
    expect((itens[1].socio as Record<string, string>).paragrafo).toBe('Terceiro');
  });
});
