import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildControlePagination,
  buildLatestSituacoesMap,
  calculateControleTotals,
  calculateSelicCorrections,
  filterControlePers,
  getCurrentDcompDocumentNumbers,
  getControlePerValues,
  getRectifiedDcompNumbers,
  getRectifiedPerNumbers,
  sortControlePers,
  sumCompensatedByPer,
  sumOriginalDistributedByPer,
  type ControleDcomp,
  type ControlePer,
} from '@/lib/controlePerdcomp';

function per(overrides: Partial<ControlePer> & Pick<ControlePer, 'nr_per'>): ControlePer {
  return {
    dt_solicitada: '2024-01-10',
    exercicio: 2024,
    tri_exercicio: 1,
    tp_credito: 'IPI',
    vlr_credito: 1_000,
    vlr_ressarcido: 0,
    vlr_ressarcido_original: null,
    ...overrides,
  } as ControlePer;
}

function dcomp(
  overrides: Partial<ControleDcomp> & Pick<ControleDcomp, 'nr_documento' | 'nr_per_orig'>,
): ControleDcomp {
  return { vlr_compensado: 0, nr_dcomp_ret: null, ...overrides } as ControleDcomp;
}

afterEach(() => vi.useRealTimers());

describe('controle PER/DCOMP', () => {
  it('identifica retificações e mantém somente os documentos DCOMP vigentes', () => {
    const pers = [per({ nr_per: '111' }), per({ nr_per: '222', nr_proc_ret: '111' })];
    const dcomps = [
      dcomp({ nr_documento: '10', nr_per_orig: '222' }),
      dcomp({ nr_documento: '20', nr_per_orig: '222', nr_dcomp_ret: '10' }),
    ];

    expect([...getRectifiedPerNumbers(pers)]).toEqual(['111']);
    const rectifiedDcomps = getRectifiedDcompNumbers(dcomps);
    expect([...rectifiedDcomps]).toEqual(['10']);
    expect(getCurrentDcompDocumentNumbers(dcomps, rectifiedDcomps)).toEqual(['20']);
  });

  it('preserva a situação mais recente da entrada previamente ordenada', () => {
    expect(
      buildLatestSituacoesMap([
        {
          nr_proc_per: '1',
          situacao: 'Deferido',
          criado_em: '2026-02-01',
          dt_pagamento: '2026-02-02',
        },
        { nr_proc_per: '1', situacao: 'Em Análise', criado_em: '2026-01-01', dt_pagamento: null },
        { nr_proc_per: '2', situacao: 'Pago', criado_em: null, dt_pagamento: null },
      ]),
    ).toEqual({
      '1': { situacao: 'Deferido', criado_em: '2026-02-01', dt_pagamento: '2026-02-02' },
      '2': { situacao: 'Pago', criado_em: '', dt_pagamento: null },
    });
  });

  it('agrega valores atualizados e originais, inclusive linhas legadas mistas', () => {
    const dcomps = [
      dcomp({ nr_documento: 'antiga', nr_per_orig: 'PER-A', vlr_compensado: 70 }),
      dcomp({
        nr_documento: 'atual',
        nr_per_orig: 'PER-A',
        vlr_compensado: 90,
        nr_dcomp_ret: 'antiga',
      }),
      dcomp({ nr_documento: 'outra', nr_per_orig: 'PER-B', vlr_compensado: 30 }),
    ];
    const rectified = getRectifiedDcompNumbers(dcomps);

    expect(sumCompensatedByPer(dcomps, rectified)).toEqual({ 'PER-A': 90, 'PER-B': 30 });
    expect(
      sumOriginalDistributedByPer(
        [
          { nr_documento: 'atual', valor_original: 60, valor_tributo: 90 },
          { nr_documento: 'atual', valor_original: null, valor_tributo: 15 },
          { nr_documento: 'outra', valor_original: 20, valor_tributo: null },
          { nr_documento: 'antiga', valor_original: 999, valor_tributo: 999 },
        ],
        dcomps,
        rectified,
      ),
    ).toEqual({ 'PER-A': 75, 'PER-B': 20 });
  });

  it('combina exercício, situação e processo com pontuação, excluindo PER retificado', () => {
    const pers = [
      per({ nr_per: '123456789012345678901234', exercicio: 2025 }),
      per({ nr_per: '999', exercicio: 2025, nr_proc_ret: '123456789012345678901234' }),
      per({ nr_per: '777', exercicio: 2024 }),
    ];
    const dcomps = [dcomp({ nr_documento: '555444333222111000999888', nr_per_orig: '999' })];
    const situations = { '999': { situacao: 'Deferido', criado_em: '', dt_pagamento: null } };

    expect(
      filterControlePers(pers, dcomps, situations, {
        exercicio: '2025',
        processo: '555.444.333/2221-11.000999-8/88',
        situacoes: ['Deferido'],
      }).map(({ nr_per }) => nr_per),
    ).toEqual(['999']);
  });

  it('representa carência com fator zero e calcula SELIC sobre saldo original', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00'));
    const pers = [
      per({ nr_per: 'carencia', dt_solicitada: '2026-01-01' }),
      per({
        nr_per: 'corrigido',
        dt_solicitada: '2024-01-01',
        vlr_credito: 1_000,
        vlr_ressarcido: 80,
        vlr_ressarcido_original: 50,
      }),
      per({ nr_per: 'sem-data', dt_solicitada: null }),
    ];

    const corrections = calculateSelicCorrections(
      pers,
      { carencia: { fator: 0.5 }, corrigido: { fator: 0.1 } },
      { corrigido: 300 },
      { corrigido: 200 },
    );

    expect(corrections.carencia).toEqual({ valorCorrigido: 0, fator: 0 });
    expect(corrections.corrigido.fator).toBe(0.1);
    expect(corrections.corrigido.valorCorrigido).toBeCloseTo(825);
    expect(corrections['sem-data']).toBeUndefined();
    expect(getControlePerValues(pers[1], { corrigido: 300 }, { corrigido: 200 })).toEqual({
      compensated: 300,
      original: 200,
      refunded: 80,
      refundedOriginal: 50,
      balance: 750,
    });
  });

  it('totaliza crédito, compensado, ressarcido, saldo e valor corrigido de todo o conjunto', () => {
    const pers = [
      per({ nr_per: 'A', vlr_credito: 1_000, vlr_ressarcido: 50, vlr_ressarcido_original: 40 }),
      per({ nr_per: 'B', vlr_credito: 500, vlr_ressarcido: 10 }),
    ];
    const totals = calculateControleTotals(
      pers,
      { A: 300, B: 100 },
      { A: 250 },
      { A: { fator: 0.1, valorCorrigido: 781 } },
    );
    expect(totals).toMatchObject({ credito: 1_500, compensado: 400, ressarcido: 60, saldo: 1_100 });
    expect(totals.corrigido).toBeCloseTo(781);
  });

  it('ordena textos e valores derivados nas duas direções sem alterar a entrada', () => {
    const pers = [per({ nr_per: 'B', vlr_credito: 500 }), per({ nr_per: 'A', vlr_credito: 1_000 })];
    const situations = {
      A: { situacao: 'Pago', criado_em: '', dt_pagamento: null },
      B: { situacao: 'Analisado', criado_em: '', dt_pagamento: null },
    };

    expect(
      sortControlePers(pers, 'situacao', 'asc', situations, {}, {}, {}).map((item) => item.nr_per),
    ).toEqual(['B', 'A']);
    expect(
      sortControlePers(pers, 'saldo', 'desc', situations, { A: 900, B: 50 }, {}, {}).map(
        (item) => item.nr_per,
      ),
    ).toEqual(['B', 'A']);
    expect(pers.map((item) => item.nr_per)).toEqual(['B', 'A']);
  });

  it('pagina com limites e contagem globais corretos', () => {
    const pers = Array.from({ length: 23 }, (_, index) => per({ nr_per: String(index + 1) }));
    const page = buildControlePagination(pers, 3, 10);

    expect(page).toMatchObject({ totalPages: 3, start: 21, end: 23 });
    expect(page.items.map((item) => item.nr_per)).toEqual(['21', '22', '23']);
  });
});
