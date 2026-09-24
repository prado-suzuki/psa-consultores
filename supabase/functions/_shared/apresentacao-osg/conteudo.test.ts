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
  fmtBRL,
  fmtPct,
  MATRICULA_NAO_SE_APLICA,
  montaPatrimonial,
  montaQuadroDerivado,
  nomesTitulares,
  rateioDaMatricula,
  SOCIEDADE_A_DEFINIR,
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

  it('fora da estruturação nao entra, e o aviso diz quantos', () => {
    const probs: ProblemaDoDeck[] = [];
    const r = montaPatrimonial([bem(), bem({ participa_estruturacao: false })], probs);
    expect(r[0].linhas).toHaveLength(1);
    expect(probs.some((p) => p.detalhe.includes('1 bem está fora da estruturação'))).toBe(true);
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
