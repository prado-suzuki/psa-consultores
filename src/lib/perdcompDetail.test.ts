import { describe, expect, it, vi } from 'vitest';
import {
  aggregateTributesByDcomp,
  calculateCurrentSelic,
  calculateReimbursementValues,
  calculateRemainingBalance,
  findOriginalDcomp,
  getAvailableTributes,
  getCurrentDcomps,
  getDisplayedDcomps,
  parseCurrencyInput,
  type PerdcompDetailDcomp,
  type PerdcompDetailDistribuicao,
} from '@/lib/perdcompDetail';

const dcomp = (nr_documento: string, nr_dcomp_ret: string | null = null, vlr_compensado = 0) =>
  ({ nr_documento, nr_dcomp_ret, vlr_compensado }) as PerdcompDetailDcomp;
const dist = (
  nr_documento: string,
  tributo: string,
  valor_tributo: number | null,
  valor_original: number | null = null,
) =>
  ({
    nr_documento,
    tributo,
    valor_tributo,
    valor_original,
    competencia: null,
  }) as PerdcompDetailDistribuicao;

describe('retificações e documentos vigentes', () => {
  it('encontra a origem em cadeias e mantém o documento quando a referência falta', () => {
    const rows = [dcomp('D1'), dcomp('D2', 'D1'), dcomp('D3', 'D2'), dcomp('D4', 'ausente')];
    expect(findOriginalDcomp('D3', rows)).toBe('D1');
    expect(findOriginalDcomp('D4', rows)).toBe('D4');
    expect(findOriginalDcomp('desconhecido', rows)).toBe('desconhecido');
  });

  it('encerra ciclos deterministicamente sem travar', () => {
    const rows = [dcomp('A', 'B'), dcomp('B', 'A')];
    expect(findOriginalDcomp('A', rows)).toBe('A');
    expect(findOriginalDcomp('B', rows)).toBe('B');
  });

  it('retorna somente documentos atuais, inclusive em cadeia', () => {
    const rows = [dcomp('D1'), dcomp('D2', 'D1'), dcomp('D3', 'D2'), dcomp('LIVRE')];
    expect(getCurrentDcomps(rows).map((row) => row.nr_documento)).toEqual(['D3', 'LIVRE']);
  });
});

describe('tributos e exibição', () => {
  const rows = [
    dist('D1', 'IRPJ', 10),
    dist('D1', 'CSLL', 20),
    dist('D1', 'IRPJ', 5),
    dist('D2', 'PIS', null),
  ];

  it('deduplica e ordena tributos e agrega por documento/tributo', () => {
    expect(getAvailableTributes(rows)).toEqual(['CSLL', 'IRPJ', 'PIS']);
    expect(aggregateTributesByDcomp(rows)).toEqual({
      D1: { IRPJ: 15, CSLL: 20 },
      D2: { PIS: 0 },
    });
  });

  it('em Todos usa compensado, destaca o maior tributo e ordena o detalhamento', () => {
    const displayed = getDisplayedDcomps(
      [dcomp('D1', null, 99), dcomp('D2', null, 8)],
      '__todos__',
      aggregateTributesByDcomp(rows),
    );
    expect(displayed).toEqual([
      {
        dcomp: expect.objectContaining({ nr_documento: 'D1' }),
        valorExibido: 99,
        tributoExibido: 'CSLL...',
        tributosTodos: [
          { tributo: 'CSLL', valor: 20 },
          { tributo: 'IRPJ', valor: 15 },
        ],
      },
      {
        dcomp: expect.objectContaining({ nr_documento: 'D2' }),
        valorExibido: 8,
        tributoExibido: 'PIS',
        tributosTodos: undefined,
      },
    ]);
  });

  it('filtra pela existência do tributo, mantendo inclusive valor zero', () => {
    expect(
      getDisplayedDcomps([dcomp('D1'), dcomp('D2')], 'PIS', aggregateTributesByDcomp(rows)),
    ).toEqual([
      expect.objectContaining({
        dcomp: expect.objectContaining({ nr_documento: 'D2' }),
        valorExibido: 0,
        tributoExibido: 'PIS',
      }),
    ]);
  });
});

describe('saldo e moeda', () => {
  it('preserva o comportamento legado sem distribuições e usa ressarcido original quando presente', () => {
    expect(
      calculateRemainingBalance({ vlr_credito: 100, vlr_ressarcido_original: null }, [], [], 25),
    ).toBe(75);
    expect(
      calculateRemainingBalance({ vlr_credito: 100, vlr_ressarcido_original: 20 }, [], [], 99),
    ).toBe(80);
  });

  it('considera apenas documentos vigentes, prefere valor original e arredonda centavos', () => {
    const rows = [dist('D1', 'IRPJ', 90, 10.115), dist('antigo', 'IRPJ', 80, 50)];
    expect(
      calculateRemainingBalance(
        { vlr_credito: 20.12, vlr_ressarcido_original: 0 },
        rows,
        ['D1'],
        0,
      ),
    ).toBe(10.01);
  });

  it('normaliza zero negativo e retorna zero sem PER', () => {
    const result = calculateRemainingBalance(
      { vlr_credito: 0, vlr_ressarcido_original: 0.001 },
      [],
      [],
      0,
    );
    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
    expect(calculateRemainingBalance(null, [], [], 0)).toBe(0);
  });

  it.each([
    ['R$ 1.234,56', 1234.56],
    ['- 12,34', 12.34],
    ['', 0],
    ['abc', 0],
    ['0,09', 0.09],
  ])('interpreta entrada monetária %s por seus centavos', (input, expected) => {
    expect(parseCurrencyInput(input)).toBe(expected);
  });
});

describe('SELIC e inversão do ressarcimento', () => {
  it('não corrige sem data, durante carência ou sem fator', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T00:00:00Z'));
    expect(calculateCurrentSelic(undefined, 100, 0.1)).toEqual({ emCarencia: true, value: null });
    expect(calculateCurrentSelic('2026-01-01', 100, 0.1)).toEqual({
      emCarencia: true,
      value: null,
    });
    expect(calculateCurrentSelic('2020-01-01', 100, undefined)).toEqual({
      emCarencia: false,
      value: null,
    });
    vi.useRealTimers();
  });

  it('calcula a parcela atual e limita fator negativo a zero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T00:00:00Z'));
    expect(calculateCurrentSelic('2020-01-01', 200, 0.125)).toEqual({
      emCarencia: false,
      value: { valor: 25, fator: 0.125 },
    });
    expect(calculateCurrentSelic('2020-01-01', 200, -1).value).toEqual({ valor: 0, fator: 0 });
    vi.useRealTimers();
  });

  it('inverte o valor corrigido fora da carência e ignora fator na carência', () => {
    expect(calculateReimbursementValues('2020-01-01', '2026-01-01', 112.5, 0.125)).toEqual({
      emCarencia: false,
      fator: 0.125,
      valorOriginal: 100,
    });
    expect(calculateReimbursementValues('2026-01-01', '2026-06-01', 112.5, 0.125)).toEqual({
      emCarencia: true,
      fator: 0,
      valorOriginal: 112.5,
    });
    expect(calculateReimbursementValues('2020-01-01', '2026-01-01', 50, -0.2)).toEqual({
      emCarencia: false,
      fator: 0,
      valorOriginal: 50,
    });
  });
});
