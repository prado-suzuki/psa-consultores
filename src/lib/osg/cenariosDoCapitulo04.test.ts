import { describe, expect, it } from 'vitest';

import { simulacaoSalva } from '@/components/equipe/osg/calculadora-itcmd/simulacaoSalvaFixture';
import {
  bloqueioDe, cadeiasEscolhidas, conflitoDeUpf, escolhaPadrao, opcoesDeCenario,
} from '@/lib/osg/cenariosDoCapitulo04';
import { slidesDoCapitulo04 } from '../../../supabase/functions/_shared/apresentacao-osg/paginacao.ts';
import * as leiDoSlide from '../../../supabase/functions/_shared/apresentacao-osg/itcmd.ts';
import * as textoDoSlide from '../../../supabase/functions/_shared/apresentacao-osg/texto.ts';
import { divArredondado, formatMoney, parseMoney, quantizar2 } from '@/lib/osg/itcmd/dinheiro';
import { FAIXAS, tetoDaFaixa } from '@/lib/osg/itcmd/faixas';
import { impostoExato } from '@/lib/osg/itcmd/imposto';
import { nomesCurtos } from '@/lib/osg/nomeCurto';
import { cardinalExtenso, romano, valorExtenso } from '@/lib/templates/extenso';

/* O histórico da Agro Aliança no sandbox: v2 "Cenário I", v3 → v4, v6 "Cenário III" e duas não aprovadas. */
const sim = (versao: number, campos: Parameters<typeof simulacaoSalva>[0] = {}) =>
  simulacaoSalva({ id: `V${versao}`, versao, status: 'aprovada', nome: `Cenário ${versao}`, ...campos });

const HISTORICO = [
  sim(1, { status: 'gerada', nome: null }),
  sim(2, { nome: 'Cenário I' }),
  sim(3, { nome: 'Cenário 2.1 - Doação entre as irmãs' }),
  sim(4, { nome: 'Cenário 2.2', origemSimulacaoId: 'V3' }),
  sim(5, { status: 'gerada' }),
  sim(6, { nome: 'Cenário III' }),
];

describe('as opções', () => {
  it('só as aprovadas, e só a ponta de cada cadeia: a 2.1 vem dentro da 2.2', () => {
    const opcoes = opcoesDeCenario(HISTORICO);
    expect(opcoes.map((o) => o.simulacao.versao)).toEqual([2, 4, 6]);
    expect(opcoes.find((o) => o.simulacao.id === 'V4')!.cadeia.map((a) => a.versao)).toEqual([3, 4]);
  });

  it('a anterior aprovada aparece quando a que a continua ainda não foi aprovada', () => {
    // Sozinha, ela é um cenário: a continuação ainda é ensaio.
    const opcoes = opcoesDeCenario([sim(3), sim(4, { origemSimulacaoId: 'V3', status: 'gerada' })]);
    expect(opcoes.map((o) => o.simulacao.id)).toEqual(['V3']);
  });

  it('sem nome, ou com ato não aprovado na cadeia, não entra — e diz por quê', () => {
    const opcoes = opcoesDeCenario([
      sim(1, { status: 'gerada' }),
      sim(2, { origemSimulacaoId: 'V1' }),
      sim(3, { nome: '  ' }),
    ]);
    expect(opcoes[0].motivoDeFora).toMatch(/não está aprovada/);
    expect(opcoes[1].motivoDeFora).toMatch(/Dê um nome/);
  });
});

describe('o que já vem marcado', () => {
  it('as pontas das cadeias: I, a 2.2 (com a 2.1 dentro) e III — os três cenários do deck', () => {
    expect(escolhaPadrao(opcoesDeCenario(HISTORICO))).toEqual(['V2', 'V4', 'V6']);
  });

  it('até três, e da mesma sociedade da primeira', () => {
    const muitas = [sim(1), sim(2), sim(3, { empresaPessoaId: 'OUTRA' }), sim(4), sim(5)];
    expect(escolhaPadrao(opcoesDeCenario(muitas))).toEqual(['V1', 'V2', 'V4']);
  });
});

describe('o que não pode ser marcado', () => {
  const opcoes = opcoesDeCenario(HISTORICO);
  const opcao = (id: string) => opcoes.find((o) => o.simulacao.id === id)!;

  it('outra sociedade, e o quarto cenário', () => {
    const mistas = opcoesDeCenario([sim(1), sim(2, { empresaPessoaId: 'OUTRA' })]);
    expect(bloqueioDe(mistas[1], ['V1'], mistas)).toMatch(/outra sociedade/);
    const quatro = opcoesDeCenario([sim(1), sim(2), sim(3), sim(4)]);
    expect(bloqueioDe(quatro[3], ['V1', 'V2', 'V3'], quatro)).toMatch(/até 3/);
  });

  it('a já marcada sempre desmarca', () => {
    expect(bloqueioDe(opcao('V2'), ['V2', 'V4', 'V6'], opcoes)).toBeNull();
  });
});

describe('a contagem de slides', () => {
  it('é a mesma conta do gerador, sobre as cadeias escolhidas', () => {
    const opcoes = opcoesDeCenario(HISTORICO);
    const cadeias = cadeiasEscolhidas(['V2', 'V4', 'V6'], opcoes).map((o) => o.cadeia);
    // Cada simulação da fixture: 1 guia, reserva e 1 instituição. I: 1 + 1 + 1 + 1;
    // II: 2 simulações + 1 resumo + 1 + 1; III: 4. Mais 5 fixos e 2 no fim.
    expect(slidesDoCapitulo04(cadeias)).toBe(5 + 4 + 5 + 4 + 2);
  });
});

/* A lei e o texto do slide são cópias dos da calculadora e dos documentos: estes casos falham se o
   original mudar e a cópia não. */
describe('a cópia do capítulo 04 dá o mesmo que a calculadora e os documentos', () => {
  const UPF = parseMoney('254.36');

  it('a tabela das faixas', () => {
    expect(leiDoSlide.FAIXAS).toEqual(FAIXAS);
    for (const f of FAIXAS) expect(leiDoSlide.tetoDaFaixa(f, UPF)).toBe(tetoDaFaixa(f, UPF));
  });

  it('o dinheiro', () => {
    for (const s of ['0', '0.005', '0.0049', '-0.005', '1234567.8912', '3324700.00', '-42.4250']) {
      const m = parseMoney(s);
      expect(leiDoSlide.parseMoney(s)).toBe(m);
      expect(leiDoSlide.quantizar2(m)).toBe(quantizar2(m));
      expect(leiDoSlide.formatMoney(m)).toBe(formatMoney(m));
    }
    for (const [n, d] of [[7n, 2n], [-7n, 2n], [7n, -2n], [10n, 3n], [2n, 4n]]) {
      expect(leiDoSlide.divArredondado(n, d)).toBe(divArredondado(n, d));
    }
  });

  // A abertura por faixa soma exatamente a forma fechada da calculadora, em qualquer
  // faixa e nos limites — é o que deixa o slide abrir o imposto GRAVADO sem reapurar.
  it('a abertura por faixa soma o imposto da calculadora', () => {
    for (const base of ['0.00', '127180.00', '127180.01', '254360.00', '1017440.00', '1017440.01',
      '2543600.00', '2543600.01', '30094185.22', '426052.00']) {
      const soma = leiDoSlide.aberturaExata(parseMoney(base), UPF).reduce((a, v) => a + v, 0n);
      expect(soma).toBe(impostoExato(parseMoney(base), UPF));
    }
  });

  it('o extenso e o numeral romano', () => {
    const amostra = [
      ...Array.from({ length: 2001 }, (_, i) => i),
      872_674, 558_413, 1_000_000, 1_001_000, 2_000_000, 3_974_751, 9_557_946,
    ];
    for (const n of amostra) {
      expect(textoDoSlide.cardinalExtenso(n)).toBe(cardinalExtenso(n));
      expect(textoDoSlide.cardinalExtenso(n, true)).toBe(cardinalExtenso(n, true));
    }
    for (const v of [0, 0.01, 1, 1.5, 100, 9411.28, 558413.55, 1_000_000, 2_882_249.7]) {
      expect(textoDoSlide.valorExtenso(v)).toBe(valorExtenso(v));
    }
    for (let n = 1; n <= 50; n++) expect(textoDoSlide.romano(n)).toBe(romano(n));
  });

  it('o nome curto, com colisão e homônimo', () => {
    const pessoas = [
      { id: '1', nome: 'AVELINO NERI BOCOLLI' }, { id: '2', nome: 'AVELINO COSTA' },
      { id: '3', nome: 'MARIA DA SILVA' }, { id: '4', nome: 'MARIA DA SILVA' },
      { id: '5', nome: 'REGINA KIELBA BOCOLLI VILA' },
    ];
    expect(textoDoSlide.nomesCurtos(pessoas)).toEqual(nomesCurtos(pessoas));
  });
});

describe('a UPF das simulações marcadas', () => {
  /* A Tributação atual tem uma tabela da lei só: UPFs de valor diferente não geram juntas. */
  it('mesma UPF, mesmo em meses diferentes: gera', () => {
    const opcoes = opcoesDeCenario([sim(2, { competencia: '2026-08' }), sim(6, { competencia: '2026-09' })]);
    expect(conflitoDeUpf(opcoes)).toBeNull();
  });

  it('UPF diferente: não gera, e diz o nome e a UPF de cada uma para saber qual refazer', () => {
    const opcoes = opcoesDeCenario([
      sim(2, { nome: 'Cenário I', upf: '263.78', competencia: '2026-08' }),
      sim(6, { nome: 'Cenário III', upf: '270.00', competencia: '2026-09' }),
    ]);
    const motivo = conflitoDeUpf(opcoes)!;
    expect(motivo).toContain('"Cenário I" (R$ 263,78, 2026-08) e "Cenário III" (R$ 270,00, 2026-09)');
    expect(motivo).toContain('Gere uma nova simulação na Calculadora de ITCMD com a mesma UPF das outras e aprove-a.');
  });

  it('o ato anterior da cadeia também conta', () => {
    const opcoes = opcoesDeCenario([sim(3, { upf: '263.78' }), sim(4, { origemSimulacaoId: 'V3', upf: '255.20' })]);
    expect(conflitoDeUpf(opcoes)).toMatch(/UPFs diferentes/);
  });
});
