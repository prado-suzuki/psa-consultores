// O conteudo dos slides da OSG, conferido sem banco e sem .pptx.
//
// O alvo principal e a ARITMETICA: `rateioDaMatricula` reparte o valor de um
// imovel entre titulares em centavos, e o quadro societario que nao fecha e o
// quadro que ninguem assina. Essa conta existia desde sempre dentro do `data.ts`,
// colada na query, e nunca teve um teste.
//
// Mesmo arranjo do `planejamento-tributario/slides.test.ts`: conteudo puro, com
// gabarito. A montagem do XML fica na Edge Function e nao entra aqui.
import { describe, expect, it } from 'vitest';

import {
  dedupTitulares,
  emHectares,
  ehImovel,
  fmtBRL,
  fmtPct,
  MATRICULA_NAO_SE_APLICA,
  momentoDoBem,
  montaForaDaEstrutura,
  montaPatrimonial,
  SEM_MOTIVO_DECLARADO,
  situacaoDaMatricula,
  montaQuadroDerivado,
  nomesTitulares,
  rateioDaMatricula,
  SOCIEDADE_A_DEFINIR,
  totaisPorSociedade,
  type BemCru,
  type BemParaQuadro,
  type Titular,
} from './conteudo.ts';
import type { ProblemaDoDeck } from '../apresentacao/problema.ts';

const titular = (over: Partial<Titular> = {}): Titular => ({
  pessoaId: 'p1',
  denominacao: 'FULANO',
  tipoPessoa: 'PF',
  tipoEmpresa: null,
  integralizador: false,
  fracao: null,
  ...over,
});

/** A soma das partes, em centavos. */
const soma = (m: Map<Titular, number>) => [...m.values()].reduce((s, c) => s + c, 0);

describe('rateioDaMatricula', () => {
  it('meio a meio fecha exato', () => {
    const a = titular({ pessoaId: 'a', fracao: 50 });
    const b = titular({ pessoaId: 'b', fracao: 50 });
    const r = rateioDaMatricula([a, b], 100);
    expect(r.get(a)).toBe(5000);
    expect(r.get(b)).toBe(5000);
  });

  // 100/3 nao tem representacao exata em centavos. Sem a absorcao do residuo, a
  // soma daria 9999 e o quadro fecharia um centavo abaixo do capital.
  it('tres terços: o ultimo absorve o centavo que sobra', () => {
    const ts = [
      titular({ pessoaId: 'a', fracao: 33.333333 }),
      titular({ pessoaId: 'b', fracao: 33.333333 }),
      titular({ pessoaId: 'c', fracao: 33.333334 }),
    ];
    const r = rateioDaMatricula(ts, 100);
    expect(soma(r)).toBe(10000);
    expect(r.get(ts[2])).toBe(10000 - (r.get(ts[0])! + r.get(ts[1])!));
  });

  it('sem fracao nenhuma: divide igual e o ultimo fecha a conta', () => {
    const ts = [titular({ pessoaId: 'a' }), titular({ pessoaId: 'b' }), titular({ pessoaId: 'c' })];
    const r = rateioDaMatricula(ts, 100);
    expect(soma(r)).toBe(10000);
    expect(new Set(r.values()).size).toBeLessThanOrEqual(2); // 3333/3333/3334
  });

  it('misto: quem tem fracao leva a sua, e o resto se divide entre os demais', () => {
    const comF = titular({ pessoaId: 'a', fracao: 60 });
    const sem1 = titular({ pessoaId: 'b' });
    const sem2 = titular({ pessoaId: 'c' });
    const r = rateioDaMatricula([comF, sem1, sem2], 100);
    expect(r.get(comF)).toBe(6000);
    expect(r.get(sem1)! + r.get(sem2)!).toBe(4000);
    expect(soma(r)).toBe(10000);
  });

  // A invariante que importa: qualquer combinacao fecha o total. Se um dia alguem
  // mexer no arredondamento, e aqui que quebra — e nao na frente do cliente.
  it.each([
    [100, [50, 50]],
    [1, [33.33, 33.33, 33.34]],
    [1234.56, [10, 20, 70]],
    [999.99, [null, null, null]],
    [0.03, [null, null]],
    [7, [25, null, null]],
    [1_000_000, [0.01, 99.99]],
  ])('a soma fecha o total: valor %s, fracoes %j', (valor, fracoes) => {
    const ts = (fracoes as Array<number | null>).map((f, i) =>
      titular({ pessoaId: `p${i}`, fracao: f }));
    expect(soma(rateioDaMatricula(ts, valor as number))).toBe(Math.round((valor as number) * 100));
  });

  it('fracao que nao soma 100 nao e "fechada": nao ha residuo para absorver', () => {
    const a = titular({ pessoaId: 'a', fracao: 30 });
    const b = titular({ pessoaId: 'b', fracao: 30 });
    // 60% de 100 = 60; os 40 restantes nao tem dono e nao sao distribuidos.
    expect(soma(rateioDaMatricula([a, b], 100))).toBe(6000);
  });
});

describe('dedupTitulares', () => {
  it('mesma pessoa duas vezes vira uma, e o integralizador vence', () => {
    const r = dedupTitulares([
      titular({ pessoaId: 'a', integralizador: false, fracao: null }),
      titular({ pessoaId: 'a', integralizador: true, fracao: 40 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].integralizador).toBe(true);
    expect(r[0].fracao).toBe(40);
  });

  it('a fracao que vale e a PRIMEIRA nao-nula, e nao a soma', () => {
    const r = dedupTitulares([
      titular({ pessoaId: 'a', fracao: 30 }),
      titular({ pessoaId: 'a', fracao: 70 }),
    ]);
    expect(r[0].fracao).toBe(30);
  });

  // Sem id nao da para afirmar que sao a mesma pessoa; juntar pelo nome erraria
  // homonimo, que em cadastro de familia nao e caso raro.
  it('titular sem id nao dedupa', () => {
    const r = dedupTitulares([
      titular({ pessoaId: null, denominacao: 'JOSE' }),
      titular({ pessoaId: null, denominacao: 'JOSE' }),
    ]);
    expect(r).toHaveLength(2);
  });

  it('nao muda os objetos de entrada', () => {
    const entrada = titular({ pessoaId: 'a', integralizador: false });
    dedupTitulares([entrada, titular({ pessoaId: 'a', integralizador: true })]);
    expect(entrada.integralizador).toBe(false);
  });
});

describe('nomesTitulares', () => {
  it('junta sem repetir e sem inventar', () => {
    expect(nomesTitulares([
      { titular: { denominacao: 'ANA' } },
      { titular: { denominacao: 'ANA' } },
      { titular: { denominacao: 'BRUNO' } },
    ])).toBe('ANA, BRUNO');
    expect(nomesTitulares([])).toBe('');
    expect(nomesTitulares(null)).toBe('');
    expect(nomesTitulares([{ titular: null }])).toBe('');
  });
});

describe('montaPatrimonial', () => {
  const bem = (over: Partial<BemCru> = {}): BemCru => ({
    denominacao: 'Fazenda A',
    vlr_contabil: 1000,
    participa_estruturacao: true,
    empresa_destino: { denominacao: 'HOLDING X' },
    titularidade: [{ titular: { denominacao: 'ANA' } }],
    matricula: [{ numero: '123', municipio_imovel: 'Sinop', uf_imovel: 'MT', vlr_contabil: 500 }],
    ...over,
  });

  it('agrupa por sociedade de destino, em ordem alfabetica', () => {
    const r = montaPatrimonial([
      bem({ empresa_destino: { denominacao: 'ZETA' } }),
      bem({ empresa_destino: { denominacao: 'ALFA' } }),
    ]);
    expect(r.map((s) => s.nome)).toEqual(['ALFA', 'ZETA']);
  });

  it('bem sem matricula vira UMA linha, e nao some', () => {
    const r = montaPatrimonial([bem({ matricula: [] })]);
    expect(r[0].linhas).toHaveLength(1);
    expect(r[0].linhas[0].matriculaLabel).toBe(MATRICULA_NAO_SE_APLICA);
    expect(r[0].linhas[0].municipioUf).toBe('—');
    expect(r[0].linhas[0].valor).toBe(fmtBRL(1000)); // cai no valor do bem
  });

  it('bem com duas matriculas vira duas linhas', () => {
    const r = montaPatrimonial([bem({
      matricula: [
        { numero: '1', municipio_imovel: 'Sinop', uf_imovel: 'MT', vlr_contabil: 10 },
        { numero: '2', municipio_imovel: 'Sorriso', uf_imovel: 'MT', vlr_contabil: 20 },
      ],
    })]);
    expect(r[0].linhas.map((l) => l.matriculaLabel)).toEqual(['Mat. 1', 'Mat. 2']);
    expect(r[0].linhas.map((l) => l.municipioUf)).toEqual(['Sinop/MT', 'Sorriso/MT']);
  });

  it('o titular da matricula vence o do bem; sem nenhum, sai travessao', () => {
    const r = montaPatrimonial([bem({
      titularidade: [{ titular: { denominacao: 'ANA' } }],
      matricula: [
        { numero: '1', municipio_imovel: 'X', uf_imovel: 'MT', titularidade: [{ titular: { denominacao: 'BRUNO' } }] },
        { numero: '2', municipio_imovel: 'X', uf_imovel: 'MT', titularidade: [] },
      ],
    })]);
    expect(r[0].linhas[0].propriedade).toBe('BRUNO');
    expect(r[0].linhas[1].propriedade).toBe('ANA'); // herda do bem
    const semNinguem = montaPatrimonial([bem({ titularidade: [], matricula: [] })]);
    expect(semNinguem[0].linhas[0].propriedade).toBe('—');
  });

  it('bem sem destino cai no balde e vira aviso', () => {
    const probs: ProblemaDoDeck[] = [];
    const r = montaPatrimonial([bem({ empresa_destino: null })], probs);
    expect(r[0].nome).toBe(SOCIEDADE_A_DEFINIR);
    expect(probs.some((p) => p.detalhe.includes(SOCIEDADE_A_DEFINIR))).toBe(true);
  });

  it('fora da estruturação nao entra na tabela das sociedades, e nao vira aviso aqui', () => {
    // Eles saem na pagina propria do capitulo 01; quem avisa quando o molde nao tem a pagina e o
    // `gerarPatrimonial`.
    const probs: ProblemaDoDeck[] = [];
    const r = montaPatrimonial([bem(), bem({ participa_estruturacao: false })], probs);
    expect(r[0].linhas).toHaveLength(1);
    expect(probs.some((p) => p.detalhe.includes('fora da estruturação'))).toBe(false);
  });

  it('sem bem nenhum, devolve vazio e nao inventa sociedade', () => {
    expect(montaPatrimonial([])).toEqual([]);
  });
});

describe('montaQuadroDerivado', () => {
  const comTitular = (fracao: number | null, id = 'a', nome = 'ANA') => ({
    integralizador: true, fracao,
    titular: { id, denominacao: nome, tipo_pessoa: 'PF', tipo_empresa: null },
  });

  const bemPR = (over: Partial<BemParaQuadro> = {}): BemParaQuadro => ({
    vlr_contabil: 1000,
    status_integralizacao: 'Aprovado',
    matricula: [{ vlr_contabil: 1000, titularidade: [comTitular(100)], impedimento: [] }],
    ...over,
  });

  it('as quotas somam o capital apurado', () => {
    const r = montaQuadroDerivado([bemPR({
      matricula: [{
        vlr_contabil: 100,
        titularidade: [comTitular(33.34, 'a', 'ANA'), comTitular(33.33, 'b', 'BRUNO'), comTitular(33.33, 'c', 'CARLA')],
        impedimento: [],
      }],
    })]);
    expect(r.linhas.reduce((s, l) => s + l.quotas, 0)).toBe(r.totalQuotas);
  });

  it('os percentuais somam 100', () => {
    const r = montaQuadroDerivado([bemPR({
      matricula: [{ vlr_contabil: 300, titularidade: [comTitular(50, 'a'), comTitular(50, 'b', 'BRUNO')], impedimento: [] }],
    })]);
    expect(r.linhas.reduce((s, l) => s + l.pct, 0)).toBeCloseTo(100, 6);
    expect(fmtPct(r.linhas[0].pct)).toBe('50,00%');
  });

  it('a mesma pessoa em dois imoveis acumula numa linha so', () => {
    const r = montaQuadroDerivado([
      bemPR({ matricula: [{ vlr_contabil: 100, titularidade: [comTitular(100)], impedimento: [] }] }),
      bemPR({ matricula: [{ vlr_contabil: 300, titularidade: [comTitular(100)], impedimento: [] }] }),
    ]);
    expect(r.linhas).toHaveLength(1);
    expect(r.totalValor).toBe(400);
  });

  it('ordena por participacao, do maior para o menor', () => {
    const r = montaQuadroDerivado([bemPR({
      matricula: [{ vlr_contabil: 100, titularidade: [comTitular(10, 'a', 'ANA'), comTitular(90, 'b', 'BRUNO')], impedimento: [] }],
    })]);
    expect(r.linhas.map((l) => l.socio)).toEqual(['BRUNO', 'ANA']);
  });

  it('so bem aprovado vira quota, e o resto vira aviso', () => {
    const probs: ProblemaDoDeck[] = [];
    const r = montaQuadroDerivado([bemPR(), bemPR({ status_integralizacao: 'Pendente' })], 'Fazenda X', probs);
    expect(r.totalValor).toBe(1000);
    expect(probs.some((p) => p.detalhe.includes('status de integralização'))).toBe(true);
  });

  // O caso que o `return` antecipado engolia: tudo descartado, quadro vazio, e o
  // motivo e a unica coisa acionavel que sobra.
  it('com tudo descartado, devolve vazio E explica por que', () => {
    const probs: ProblemaDoDeck[] = [];
    const r = montaQuadroDerivado([bemPR({
      vlr_contabil: null,
      matricula: [
        { vlr_contabil: null, titularidade: [comTitular(100)], impedimento: [] },
        { vlr_contabil: 100, titularidade: [], impedimento: [] },
      ],
    })], 'Fazenda X', probs);
    expect(r.linhas).toEqual([]);
    expect(probs.map((p) => p.detalhe).join(' ')).toContain('sem valor contábil');
    expect(probs.map((p) => p.detalhe).join(' ')).toContain('nenhum titular vinculado');
  });

  it('impedimento ativo tira a matricula; cancelado nao', () => {
    const ativo = montaQuadroDerivado([bemPR({
      matricula: [{ vlr_contabil: 100, titularidade: [comTitular(100)], impedimento: [{ cancelado: false }] }],
    })]);
    expect(ativo.linhas).toEqual([]);

    const cancelado = montaQuadroDerivado([bemPR({
      matricula: [{ vlr_contabil: 100, titularidade: [comTitular(100)], impedimento: [{ cancelado: true }] }],
    })]);
    expect(cancelado.linhas).toHaveLength(1);
  });

  it('a matricula sem valor proprio herda o valor do bem', () => {
    const r = montaQuadroDerivado([bemPR({
      vlr_contabil: 250,
      matricula: [{ vlr_contabil: null, titularidade: [comTitular(100)], impedimento: [] }],
    })]);
    expect(r.totalValor).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// As colunas que o modelo da consultoria pede
// ---------------------------------------------------------------------------

describe('emHectares', () => {
  it('deixa hectare como esta, com duas casas', () => {
    expect(emHectares(180, 'ha')).toBe('180,00');
  });

  it('converte m2 para hectare', () => {
    expect(emHectares(25_000, 'm2')).toBe('2,50');
  });

  it('trata "ha e m2" como hectare: e a MESMA grandeza, so muda a leitura', () => {
    // 123,1234 = 123 ha e 1.234 m², que sao 123,1234 ha. O fator e o mesmo.
    expect(emHectares(123.1234, 'ha_m2')).toBe(emHectares(123.1234, 'ha'));
  });

  it('sem area, imprime travessao em vez de zero', () => {
    expect(emHectares(null, 'ha')).toBe('—');
    expect(emHectares('', 'ha')).toBe('—');
  });
});

describe('momentoDoBem', () => {
  it('o que ja foi a uma peca registrada e 1o momento', () => {
    expect(momentoDoBem('Integralizado')).toBe('1º');
  });

  it('o aprovado que ainda nao foi e 2o momento, nas duas instancias', () => {
    expect(momentoDoBem('Aprovado')).toBe('2º');
    expect(momentoDoBem('Aprovado para 2ª Instancia')).toBe('2º');
  });

  it('o resto nao inventa momento', () => {
    for (const s of ['Pendente', 'Em análise', 'Recusado', 'Não se aplica', null, undefined]) {
      expect(momentoDoBem(s)).toBe('—');
    }
  });
});

describe('situacaoDaMatricula', () => {
  const base = { numero: '1.234', georref_prejudica_transferencia: false, impedimento: [] };

  it('matricula limpa e Regular', () => {
    expect(situacaoDaMatricula(base)).toBe('Regular');
  });

  it('sem matricula nenhuma, diz isso — e nao "Regular"', () => {
    expect(situacaoDaMatricula(null)).toBe('Sem matrícula');
    expect(situacaoDaMatricula({ ...base, numero: null })).toBe('Sem matrícula');
  });

  it('impedimento que TRAVA a transferencia deixa Pendente', () => {
    expect(situacaoDaMatricula({
      ...base, impedimento: [{ cancelado: false, impede_transferencia: true }],
    })).toBe('Pendente');
  });

  it('impedimento que NAO trava — servidao, APP — nao muda a situacao', () => {
    // O gravame existe e importa, mas nao impede a transferencia: dizer "Pendente"
    // aqui faria o consultor procurar um problema que nao existe.
    expect(situacaoDaMatricula({
      ...base, impedimento: [{ cancelado: false, impede_transferencia: false }],
    })).toBe('Regular');
  });

  it('impedimento CANCELADO nao conta', () => {
    expect(situacaoDaMatricula({
      ...base, impedimento: [{ cancelado: true, impede_transferencia: true }],
    })).toBe('Regular');
  });

  it('georreferenciamento que prejudica a transferencia tambem deixa Pendente', () => {
    expect(situacaoDaMatricula({ ...base, georref_prejudica_transferencia: true })).toBe('Pendente');
  });
});

describe('nomesTitulares por especie', () => {
  const ts = [
    { tipo: 'DIREITO', titular: { denominacao: 'Ana' } },
    { tipo: 'FATO', titular: { denominacao: 'Bruno' } },
    { tipo: 'DIREITO', titular: { denominacao: 'Ana' } },
  ];

  it('separa a propriedade de direito da de fato', () => {
    expect(nomesTitulares(ts, 'DIREITO')).toBe('Ana');
    expect(nomesTitulares(ts, 'FATO')).toBe('Bruno');
  });

  it('sem especie, soma as duas — que e o comportamento antigo', () => {
    expect(nomesTitulares(ts)).toBe('Ana, Bruno');
  });
});

describe('montaForaDaEstrutura', () => {
  const bemFora = {
    denominacao: 'Chácara da Sede',
    participa_estruturacao: false,
    motivo_nao_integralizacao: 'Uso da família',
    matricula: [{
      numero: '3.140', municipio_imovel: 'Sorriso', uf_imovel: 'MT',
      titularidade: [{ tipo: 'DIREITO', titular: { denominacao: 'Casal' } }],
    }],
  };

  it('so entra quem esta fora: o recorte e o inverso do slide principal', () => {
    const r = montaForaDaEstrutura([
      bemFora,
      { denominacao: 'Fazenda A', participa_estruturacao: true, matricula: [] },
      { denominacao: 'Fazenda B', matricula: [] }, // nulo conta como DENTRO
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].referencia).toBe('Chácara da Sede');
  });

  it('traz as cinco colunas da tabela do modelo', () => {
    const [linha] = montaForaDaEstrutura([bemFora]);
    expect(linha).toEqual({
      referencia: 'Chácara da Sede',
      matriculaLabel: 'Mat. 3.140',
      municipioUf: 'Sorriso/MT',
      titular: 'Casal',
      motivo: 'Uso da família',
    });
  });

  it('bem sem matricula vira UMA linha, e nao some', () => {
    const r = montaForaDaEstrutura([{
      denominacao: 'Quotas da Alfa', participa_estruturacao: false,
      motivo_nao_integralizacao: 'Negociação em curso',
      titularidade: [{ tipo: 'DIREITO', titular: { denominacao: 'Ana' } }],
    }]);
    expect(r).toHaveLength(1);
    expect(r[0].matriculaLabel).toBe(MATRICULA_NAO_SE_APLICA);
    expect(r[0].titular).toBe('Ana');
  });

  it('motivo em branco vira texto declarado E aviso: a coluna nao pode sair vazia', () => {
    const probs: Array<{ onde: string; detalhe: string }> = [];
    const r = montaForaDaEstrutura([{ ...bemFora, motivo_nao_integralizacao: '  ' }], probs);
    expect(r[0].motivo).toBe(SEM_MOTIVO_DECLARADO);
    expect(probs).toHaveLength(1);
    expect(probs[0].detalhe).toContain('sem motivo declarado');
  });
});

describe('montaPatrimonial — as colunas novas', () => {
  it('separa titular de direito de titular de fato na mesma matricula', () => {
    const [soc] = montaPatrimonial([{
      tipo_bem: 'IR', denominacao: 'Fazenda X', vlr_contabil: 100, participa_estruturacao: true,
      status_integralizacao: 'Aprovado',
      empresa_destino: { denominacao: 'Alfa Ltda' },
      matricula: [{
        numero: '1', municipio_imovel: 'Sorriso', uf_imovel: 'MT', vlr_contabil: 100,
        area_documento: 500, area_unidade: 'ha', impedimento: [],
        titularidade: [
          { tipo: 'DIREITO', titular: { denominacao: 'Ana' } },
          { tipo: 'FATO', titular: { denominacao: 'Grupo' } },
        ],
      }],
    }]);
    expect(soc.linhas[0].propriedade).toBe('Ana');
    expect(soc.linhas[0].deFato).toBe('Grupo');
    expect(soc.linhas[0].area).toBe('500,00');
    expect(soc.linhas[0].momento).toBe('2º');
    expect(soc.linhas[0].situacao).toBe('Regular');
  });

  it('sem titular de fato, a coluna sai com travessao e nao repete o de direito', () => {
    const [soc] = montaPatrimonial([{
      tipo_bem: 'IR', denominacao: 'Fazenda Y', participa_estruturacao: true,
      empresa_destino: { denominacao: 'Alfa Ltda' },
      matricula: [{
        numero: '2', impedimento: [],
        titularidade: [{ tipo: 'DIREITO', titular: { denominacao: 'Ana' } }],
      }],
    }]);
    expect(soc.linhas[0].deFato).toBe('—');
  });

  it('matricula travada por impedimento vira Pendente, sem aviso: e o estado real do imovel', () => {
    const probs: Array<{ onde: string; detalhe: string }> = [];
    const [soc] = montaPatrimonial([{
      tipo_bem: 'IR', denominacao: 'Fazenda Z', participa_estruturacao: true,
      empresa_destino: { denominacao: 'Alfa Ltda' },
      matricula: [{
        numero: '3', impedimento: [{ cancelado: false, impede_transferencia: true }], titularidade: [],
      }],
    }], probs);
    expect(soc.linhas[0].situacao).toBe('Pendente');
    expect(probs.some((p) => p.detalhe.includes('Pendente'))).toBe(false);
  });
});

describe('totaisPorSociedade', () => {
  const imovel = (denominacao: string, destino: string, extra: Partial<BemCru> = {}): BemCru => ({
    tipo_bem: 'IR',
    denominacao,
    vlr_contabil: 999,
    participa_estruturacao: true,
    empresa_destino: { denominacao: destino },
    matricula: [{ numero: `${denominacao}-0`, area_documento: 100, area_unidade: 'ha', vlr_contabil: 10 }],
    ...extra,
  });
