import { describe, expect, it } from 'vitest';
import { derivarValoresDoBem } from '@/lib/osg/valoresDoBem';
import {
  numeroParaDecimal,
  totalizarAcervo,
  type ImovelDoAcervo,
} from '@/lib/osg/acervoItcmd';

// O ITR entra como as outras duas métricas: na matrícula, em `vlr_imposto_anual`.
type Mat = {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  vlr_imposto_anual?: number | null;
};

const imovel = (id: string, matriculas: Mat[], itr: number | null = null): ImovelDoAcervo => ({
  id,
  referencia: id,
  denominacao: id,
  valores: derivarValoresDoBem(
    { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
    matriculas.map((m, i) => ({
      vlr_contabil: m.vlr_contabil,
      vlr_mercado: m.vlr_mercado,
      // o ITR do imóvel fica na primeira matrícula, para o total do cenário ser
      // exatamente o valor informado no caso de teste
      vlr_imposto_anual: m.vlr_imposto_anual ?? (i === 0 ? itr : null),
    })),
  ),
});

describe('acervo do ITCD — totais por cenário', () => {
  it('soma cada cenário e diz quantos imóveis contribuíram', () => {
    const acervo = totalizarAcervo([
      imovel('A', [{ vlr_contabil: 558_413.55, vlr_mercado: 900_000 }], 10_000),
      imovel('B', [{ vlr_contabil: 241_586.45, vlr_mercado: null }], null),
    ]);
    expect(acervo.contabil).toEqual({ total: '800000.00', comValor: 2, semValor: 0, imoveis: 2 });
    // Mercado tem um só imóvel com valor: o total é PARCIAL e se declara assim.
    expect(acervo.mercado).toEqual({ total: '900000.00', comValor: 1, semValor: 1, imoveis: 2 });
    expect(acervo.itr).toEqual({ total: '10000.00', comValor: 1, semValor: 1, imoveis: 2 });
  });

  it('cenário sem nenhum valor devolve total nulo: ausência não é R$ 0,00', () => {
    // É o estado real do sandbox hoje — mercado vazio em 26 de 26 matrículas e
    // ITR vazio em qualquer campo. Zero e ausência são coisas diferentes.
    const acervo = totalizarAcervo([
      imovel('A', [{ vlr_contabil: 100, vlr_mercado: null }]),
      imovel('B', [{ vlr_contabil: null, vlr_mercado: null }]),
    ]);
    expect(acervo.mercado.total).toBeNull();
    expect(acervo.itr.total).toBeNull();
    expect(acervo.contabil.total).toBe('100.00');
    // Zero informado continua sendo um valor, e conta como preenchido.
    const comZero = totalizarAcervo([imovel('A', [{ vlr_contabil: 0, vlr_mercado: null }])]);
    expect(comZero.contabil).toEqual({ total: '0.00', comValor: 1, semValor: 0, imoveis: 1 });
  });

  it('o ITR soma as matrículas, igual aos outros dois cenários', () => {
    // `vlr_imposto_anual` guarda o valor DECLARADO no ITR, apesar do nome. A
    // regra é a mesma do contábil e do mercado, sem exceção.
    const acervo = totalizarAcervo([
      imovel('A', [
        { vlr_contabil: 1, vlr_mercado: null, vlr_imposto_anual: 7_162_722.78 },
        { vlr_contabil: 2, vlr_mercado: null, vlr_imposto_anual: 1_833_039.19 },
      ]),
    ]);
    expect(acervo.itr).toEqual({
      total: '8995761.97', comValor: 1, semValor: 0, imoveis: 1,
    });
  });

  it('número fora da escala de 4 casas é recusado, não truncado em silêncio', () => {
    expect(numeroParaDecimal(558_413.55)).toBe('558413.55');
    expect(numeroParaDecimal(0)).toBe('0');
    expect(() => numeroParaDecimal(0.000_01)).toThrow(/escala/i);
    expect(() => numeroParaDecimal(1e21)).toThrow(/escala/i);
    expect(() => numeroParaDecimal(Number.NaN)).toThrow(/finito/i);
  });

  it('SOMA PARCIAL nao vira base: imovel com matricula sem valor fica de fora', () => {
    // O caso do parecer. Duas matriculas, uma sem valor contabil: a soma de uma
    // parcela e MENOR que o acervo real, e usa-la como base apuraria imposto a menos
    // sem nada dizer que faltou matricula. O imovel entra em `semValor`, o cenario
    // fica indisponivel, e a calculadora se recusa a gravar dizendo o que falta.
    const parcial = {
      id: 'IR-P',
      referencia: 'IR-P',
      denominacao: 'Fazenda desmembrada',
      valores: derivarValoresDoBem(
        { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
        [
          { vlr_contabil: 558_413.55, vlr_mercado: 900_000, vlr_imposto_anual: null },
          { vlr_contabil: null, vlr_mercado: 400_000, vlr_imposto_anual: null },
        ],
      ),
    };

    const totais = totalizarAcervo([parcial]);
    // Contabil: parcial, entao nao ha base.
    expect(totais.contabil.total).toBeNull();
    expect(totais.contabil.comValor).toBe(0);
    expect(totais.contabil.semValor).toBe(1);
    // Mercado: as duas matriculas tem valor, entao a soma vale.
    expect(totais.mercado.total).toBe('1300000.00');
    expect(totais.mercado.comValor).toBe(1);
  });

  it('a soma do acervo nao passa por float', () => {
    // Duas matriculas de 100,10 e 200,20 derrubavam a apuracao: a soma em `number`
    // dava 300.29999999999995 e a fronteira do motor recusava as casas extras.
    const imovel = {
      id: 'IR-F',
      referencia: 'IR-F',
      denominacao: 'Fazenda de duas matriculas',
      valores: derivarValoresDoBem(
        { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
        [
          { vlr_contabil: 100.10, vlr_mercado: null, vlr_imposto_anual: null },
          { vlr_contabil: 200.20, vlr_mercado: null, vlr_imposto_anual: null },
        ],
      ),
    };
    expect(() => totalizarAcervo([imovel])).not.toThrow();
    expect(totalizarAcervo([imovel]).contabil.total).toBe('300.30');
  });
});
