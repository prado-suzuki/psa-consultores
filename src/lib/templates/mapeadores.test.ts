import { describe, it, expect } from 'vitest';
import {
  calcularCapitalSociedade,
  calcularParticipacoesPR,
  mapearAdministrador,
  mapearBem,
  mapearIntegralizacoes,
  mapearMatricula,
  mapearPessoa,
  mapearQuadroSocietario,
  mapearSociedade,
  mapearSocio,
  type ItemLista,
  type MatriculaIntegralizacao,
  type MatriculaParaMapear,
  type SocioParaMapear,
  type TitularParaMapear,
} from './mapeadores';
import { origemDe } from './origem';
import { derivarCampos } from './vocabulario';
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

describe('mapearSociedade — PJ objeto do contrato', () => {
  const pj = {
    tipo_pessoa: 'PJ',
    denominacao: 'MMS Agro Ltda',
    cpf_cnpj: '12.345.678/0001-90',
    nire: '5320000000',
    junta_comercial_uf: 'MT',
    data_constituicao: '2024-03-01',
    objeto_social: 'Exploração da atividade rural',
    endereco_logradouro: 'Rua das Acácias',
    endereco_numero: '119',
    endereco_bairro: 'Centro',
    endereco_municipio: 'Cuiabá',
    endereco_uf: 'MT',
    endereco_cep: '78000-000',
  } as unknown as PessoaRow;

  it('mapeia razão social, CNPJ, NIRE e objeto', () => {
    const c = mapearSociedade(pj);
    expect(c.razaoSocial).toBe('MMS Agro Ltda');
    expect(c.cnpj).toBe('12.345.678/0001-90');
    expect(c.nire).toBe('5320000000');
    expect(c.objeto).toBe('Exploração da atividade rural');
  });

  it('expande UF por extenso (junta e sede) e formata a data', () => {
    const c = mapearSociedade(pj);
    expect(c.juntaUfExtenso).toBe('Mato Grosso');
    expect(c.sedeUfExtenso).toBe('Mato Grosso');
    expect(c.dataConstituicao).toBe('01/03/2024');
  });

  it('monta a sede em prosa e nas partes atômicas', () => {
    const c = mapearSociedade(pj);
    expect(c.sede).toContain('Rua das Acácias');
    expect(c.sede).toContain('nº 119');
    expect(c.sede).toContain('no município de Cuiabá');
    expect(c.sedeEndereco).toBe('Rua das Acácias, nº 119');
    expect(c.sedeBairro).toBe('Centro');
    expect(c.sedeMunicipio).toBe('Cuiabá');
    expect(c.sedeCep).toBe('78000-000');
  });

  it('campos do catálogo ausentes viram "" (cadastro incompleto não trava a prévia)', () => {
    const c = mapearSociedade({ tipo_pessoa: 'PJ', denominacao: 'Vazia Ltda' } as unknown as PessoaRow);
    expect(c.objeto).toBe('');
    expect(c.sedeMunicipio).toBe('');
    expect(c.razaoSocial).toBe('Vazia Ltda');
  });

  it('formata o capital calculado e deriva os extensos', () => {
    const c = mapearSociedade(pj, { capitalValor: 1500, totalQuotas: 1500 });
    expect(c.capitalValor).toBe('1.500,00');
    expect(c.capitalExtenso).toBe('mil e quinhentos reais');
    expect(c.totalQuotas).toBe('1.500');
    expect(c.totalQuotasExtenso).toBe('mil e quinhentos');
  });

  it('sem capital calculado, os campos resolvem em branco (condicionais pulam)', () => {
    const c = mapearSociedade(pj, { capitalValor: null, totalQuotas: null });
    expect(c.capitalValor).toBe('');
    expect(c.capitalExtenso).toBe('');
    expect(c.totalQuotas).toBe('');
    expect(c.totalQuotasExtenso).toBe('');
  });
});

describe('calcularCapitalSociedade — PR (integralizações) × demais (quadro societário)', () => {
  const empresaPR = { tipo_empresa: 'PR' } as unknown as PessoaRow;
  const empresaCN = { tipo_empresa: 'CN' } as unknown as PessoaRow;

  const matDeValor = (vlr: number | null, vlrBem: number | null = null): MatriculaParaMapear => ({
    ...matriculaCom([]),
    vlr_contabil: vlr,
    bem: vlrBem != null ? { denominacao: null, vlr_contabil: vlrBem, ccir_codigo: null } : null,
  });

  it('PR: capital = Σ valor contábil das integralizações (fallback no bem), quotas a R$ 1,00', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(
      empresaPR,
      [socio('Ignorado', 999, 999)], // quadro NÃO entra no cálculo de PR
      [matDeValor(558413.55), matDeValor(null, 314260.45)],
    );
    expect(capitalValor).toBe(872674);
    expect(totalQuotas).toBe(872674);
  });

  it('PR: capital com centavos arredonda o total de quotas', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(empresaPR, [], [matDeValor(100.6)]);
    expect(capitalValor).toBe(100.6);
    expect(totalQuotas).toBe(101);
  });

  it('PR sem integralização aprovada → nulls', () => {
    const r = calcularCapitalSociedade(empresaPR, [socio('A', 10, 10)], []);
    expect(r).toEqual({ capitalValor: null, totalQuotas: null });
  });

  it('CN: Σ quotas e Σ vlr_total do quadro societário', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(
      empresaCN,
      [socio('A', 600, 600), socio('B', 900, 900)],
      [matDeValor(999999)], // integralizações NÃO entram fora de PR
    );
    expect(capitalValor).toBe(1500);
    expect(totalQuotas).toBe(1500);
  });

  it('quadro vazio fora de PR → nulls', () => {
    const r = calcularCapitalSociedade(empresaCN, [], []);
    expect(r).toEqual({ capitalValor: null, totalQuotas: null });
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

  it('um item por sócio (ordem do quadro), com a ordem como dado da relação', () => {
    const itens = mapearIntegralizacoes([jose, maria], matriculas);
    expect(itens).toHaveLength(2);
    expect((itens[0].socio as Record<string, string>).ordem).toBe('1');
    expect((itens[1].socio as Record<string, string>).ordem).toBe('2');
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

  it('ocorrência seguinte sai como referência, com refItem apontando ao ITEM da 1ª descrição', () => {
    const [pJose, pMaria] = mapearIntegralizacoes([jose, maria], matriculas);
    const a = imovel(pMaria, 0);
    expect(flag(pMaria, 0, 'referencia')).toBe(true);
    expect(flag(pMaria, 0, 'completa')).toBe(false);
    expect(a.alinea).toBe('a');
    expect(a.refAlinea).toBe('a');
    expect(a.refSocio).toBe('José Eduardo');
    expect(a.numero).toBe('2.424');
    expect(a.proprietario).toBe('Maria Auxiliadora');
    expect(a.remanescente).toBe('José Eduardo');
    // Identidade, não número: quem numera ("parágrafo segundo") é a composição,
    // carimbando {{ ref }} neste mesmo objeto.
    expect((pMaria.imoveis as ItemLista[])[0].refItem).toBe(pJose);
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
    expect((itens[1].socio as Record<string, string>).ordem).toBe('2');
  });
});

describe('calcularParticipacoesPR — quadro derivado da empresa PR', () => {
  function matPR(
    id: string,
    vlr: number | null,
    titulares: TitularParaMapear[],
  ): MatriculaIntegralizacao {
    return {
      id, numero: id, livro: null, folha: null,
      municipio_imovel: null, uf_imovel: null,
      area_documento: null, area_unidade: null, vlr_contabil: vlr,
      confrontacoes_texto: null, descricao_psa_completa: null,
      bem: null, cartorio: null, titulares,
    };
  }

  const meio = (pessoaId: string, denominacao: string): TitularParaMapear =>
    ({ pessoaId, denominacao, fracao: 50 });

  it('titular único sem fração leva 100% da matrícula', () => {
    const [p] = calcularParticipacoesPR([
      matPR('m1', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ]);
    expect(p.denominacao).toBe('José Eduardo');
    expect(p.valor).toBe(558413.55);
    expect(p.quotas).toBe(558414);
    expect(p.percentual).toBe(100);
  });

  it('50/50 com centavo ímpar: último titular absorve (69.013,61 + 69.013,60)', () => {
    const [a, b] = calcularParticipacoesPR([
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    ]);
    // Ordenado por valor desc: José (primeiro do rateio) leva o centavo a mais.
    expect(a.denominacao).toBe('José Eduardo');
    expect(a.valor).toBe(69013.61);
    expect(b.denominacao).toBe('Maria Auxiliadora');
    expect(b.valor).toBe(69013.6);
    // Σ quotas fecha com Math.round(capital) = 138.027 (último absorve −1).
    expect(a.quotas + b.quotas).toBe(138027);
  });

  it('agrega a mesma pessoa através de várias matrículas', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ]);
    expect(participacoes).toHaveLength(2);
    const jose = participacoes.find((p) => p.pessoaId === 'j')!;
    expect(jose.valor).toBe(125000 + 558413.55);
  });

  it('deduplica posse de fato + de direito da mesma pessoa na matrícula', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', 100000, [
        { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
        { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
        { pessoaId: 'm', denominacao: 'Maria Auxiliadora', fracao: 50 },
      ]),
    ]);
    expect(participacoes).toHaveLength(2);
    expect(participacoes[0].valor).toBe(50000);
    expect(participacoes[1].valor).toBe(50000);
  });

  it('matrícula sem valor (nem no bem) fica fora do cálculo', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', null, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
      matPR('m2', 100, [{ pessoaId: 'm', denominacao: 'Maria Auxiliadora' }]),
    ]);
    expect(participacoes).toHaveLength(1);
    expect(participacoes[0].denominacao).toBe('Maria Auxiliadora');
  });

  it('propaga tipoPessoa/cpfCnpj do titular enriquecido', () => {
    const [p] = calcularParticipacoesPR([
      matPR('m1', 100, [{
        pessoaId: 'j', denominacao: 'José Eduardo',
        tipoPessoa: 'PF', cpfCnpj: '111.222.333-44',
      }]),
    ]);
    expect(p.tipoPessoa).toBe('PF');
    expect(p.cpfCnpj).toBe('111.222.333-44');
  });

  it('invariantes: Σ valor = capital, Σ quotas = Math.round(capital), coerência com calcularCapitalSociedade', () => {
    const matriculas = [
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ];
    const participacoes = calcularParticipacoesPR(matriculas);
    const capitalEsperado = calcularCapitalSociedade(
      { tipo_empresa: 'PR' } as unknown as PessoaRow,
      [],
      matriculas,
    );

    const somaCent = participacoes.reduce((s, p) => s + Math.round(p.valor * 100), 0);
    expect(somaCent).toBe(Math.round(capitalEsperado.capitalValor! * 100));
    expect(participacoes.reduce((s, p) => s + p.quotas, 0)).toBe(capitalEsperado.totalQuotas);
    expect(participacoes.reduce((s, p) => s + p.percentual, 0)).toBeCloseTo(100, 9);
  });

  it('sem matrículas (ou sem valores) ⇒ []', () => {
    expect(calcularParticipacoesPR([])).toEqual([]);
    expect(calcularParticipacoesPR([
      matPR('m1', null, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ])).toEqual([]);
  });
});

describe('proveniência (origem) anexada pelos mapeadores', () => {
  const ana = { id: 'p1', denominacao: 'Ana', tipo_pessoa: 'PF', genero: 'F' } as unknown as PessoaRow;

  it('mapearPessoa anexa { tipo: pessoa, id da linha }', () => {
    expect(origemDe(mapearPessoa(ana))).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearSociedade anexa { tipo: sociedade, id da empresa }', () => {
    const pj = { id: 'e1', denominacao: 'Agro Ltda', tipo_pessoa: 'PJ' } as unknown as PessoaRow;
    expect(origemDe(mapearSociedade(pj))).toEqual({ tipo: 'sociedade', id: 'e1' });
  });

  it('a origem sobrevive a derivarCampos e à edição manual (spread)', () => {
    const campos = mapearPessoa(ana);
    const editado = derivarCampos('pessoa', { ...campos, nome: 'Ana Maria' });
    expect(origemDe(editado)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearSocio e mapearAdministrador preservam a origem da pessoa', () => {
    const s = mapearSocio({ pessoa: ana, quotas: 10, vlr_total: 10, representante: null });
    expect(origemDe(s.socio)).toEqual({ tipo: 'pessoa', id: 'p1' });

    const a = mapearAdministrador({ pessoa: ana, cargo: 'Diretora' });
    expect(origemDe(a.administrador)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearIntegralizacoes preserva a origem no escopo socio de cada parágrafo', () => {
    const m: MatriculaIntegralizacao = {
      ...matriculaCom([{ denominacao: 'Ana', pessoaId: 'p1', fracao: 100 }]),
      id: 'm1',
      vlr_contabil: 1000,
    };
    const [item] = mapearIntegralizacoes(
      [{ pessoa: ana, quotas: null, vlr_total: null, representante: null }],
      [m],
    );
    expect(origemDe(item.socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
    // E o imóvel da alínea aponta para a matrícula de origem.
    const [imovel] = item.imoveis as ItemLista[];
    expect(origemDe(imovel.imovel)).toEqual({ tipo: 'matricula', id: 'm1' });
  });

  it('mapearBem anexa { tipo: bem, id da linha }', () => {
    const bem = {
      id: 'b1', denominacao: 'Fazenda Santa Fé', referencia_dp: 'DP-01',
      tipo_bem: 'IR', vlr_contabil: 1000, ccir_codigo: null, inscricao_municipal: null,
    } as unknown as Parameters<typeof mapearBem>[0];
    expect(origemDe(mapearBem(bem))).toEqual({ tipo: 'bem', id: 'b1' });
  });

  it('mapearMatricula anexa a origem quando há id; sem id (dado legado) fica sem', () => {
    const com = mapearMatricula({ ...matriculaCom([]), id: 'm1' });
    expect(origemDe(com)).toEqual({ tipo: 'matricula', id: 'm1' });

    const sem = mapearMatricula(matriculaCom([]));
    expect(origemDe(sem)).toBeUndefined();
  });
});
