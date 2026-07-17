import { describe, expect, it } from 'vitest';
import {
  applyDifalClassifications,
  buildProcessoDifalStats,
  buildProcessoDifalSyncPayload,
  mapDifalApiItems,
} from '@/lib/processoDifal';
import type { ClassificacaoExistente, DifalGroupedItem } from '@/types/difal';

const item = (overrides: Partial<DifalGroupedItem> = {}): DifalGroupedItem => ({
  groupKey: 'Produto|P1|1000',
  xProd: 'Produto',
  cod_produto: 'P1',
  cod_ncm: '1000',
  id_contribuinte: 'contrib-1',
  cfop: '2102',
  cst_icms: '00',
  aliq_icms: 17,
  pRedBC: null,
  count: 2,
  totalValue: 150,
  nfesCount: 1,
  status: 'pendente',
  classificacao: null,
  ...overrides,
});

describe('processoDifal', () => {
  it('mapeia integralmente o contrato agrupado da API e normaliza pRedBC ausente', () => {
    expect(
      mapDifalApiItems(
        [
          {
            cProd: 'P1',
            xProd: 'Produto',
            NCM: '1000',
            CFOP: '2102',
            CST: null,
            tot_itens: 3,
            tot_nfes: 2,
            vlr_total: 99.9,
            aliq_prod: 12,
            pRedBC: undefined as never,
          },
        ],
        'contrib-1',
      ),
    ).toEqual([
      {
        groupKey: 'Produto|P1|1000',
        xProd: 'Produto',
        cod_produto: 'P1',
        cod_ncm: '1000',
        id_contribuinte: 'contrib-1',
        cfop: '2102',
        cst_icms: null,
        aliq_icms: 12,
        pRedBC: null,
        count: 3,
        totalValue: 99.9,
        nfesCount: 2,
        status: 'pendente',
        classificacao: null,
      },
    ]);
  });

  it('classificação remota prevalece no valor e decisão local prevalece no status', () => {
    const classification: ClassificacaoExistente = {
      decisao: 'SEM_ST',
      id_icms_st: null,
      aliquota_st: null,
      percentual_reducao: null,
      classificado_em: '2026-01-01',
      classificado_por: 'user-1',
    };
    const groups = [item(), item({ cod_produto: 'P2', groupKey: 'Produto 2|P2|1000' })];
    const result = applyDifalClassifications(
      groups,
      {
        'contrib-1|P1|1000': classification,
      },
      new Set(['contrib-1|P2|1000']),
    );

    expect(result.map(({ status, classificacao }) => ({ status, classificacao }))).toEqual([
      { status: 'validado', classificacao: classification },
      { status: 'validado', classificacao: undefined },
    ]);
  });

  it('mantém pendente quando a classificação mapeada é null', () => {
    expect(
      applyDifalClassifications(
        [item()],
        {
          'contrib-1|P1|1000': null,
        },
        new Set(),
      )[0],
    ).toMatchObject({ status: 'pendente', classificacao: null });
  });

  it('calcula estatísticas preservando os valores recebidos e fallback apenas no total', () => {
    expect(buildProcessoDifalStats(7, 4)).toEqual({ total: 11, validados: 7, pendentes: 4 });
    expect(buildProcessoDifalStats(0, Number.NaN)).toEqual({
      total: 0,
      validados: 0,
      pendentes: Number.NaN,
    });
  });

  it('sincroniza somente itens da página atual que compartilham o NCM da decisão', () => {
    const payload = buildProcessoDifalSyncPayload(
      'sessao-1',
      [
        {
          cod_ncm: '1000',
          decisao: 'REGRA_SELECIONADA',
          id_icms_st_bq: 'regra-1',
        },
      ],
      [
        item(),
        item({ cod_produto: 'P2', groupKey: 'Produto 2|P2|1000' }),
        item({ cod_produto: 'P3', cod_ncm: '2000', groupKey: 'Produto 3|P3|2000' }),
        item(),
      ],
    );

    expect(payload).toEqual({
      sessao_id: 'sessao-1',
      decisoes: [
        {
          id_contribuinte: 'contrib-1',
          cod_produto: 'P1',
          cod_ncm: '1000',
          decisao: 'REGRA_SELECIONADA',
          id_icms_st: 'regra-1',
        },
        {
          id_contribuinte: 'contrib-1',
          cod_produto: 'P2',
          cod_ncm: '1000',
          decisao: 'REGRA_SELECIONADA',
          id_icms_st: 'regra-1',
        },
      ],
    });
  });

  it('preserva o fan-out atual por NCM, sem exigir cod_produto na decisão', () => {
    const payload = buildProcessoDifalSyncPayload(
      'sessao-1',
      [
        {
          cod_ncm: '1000',
          decisao: 'SEM_ST',
          id_icms_st_bq: null,
        },
      ],
      [item(), item({ cod_produto: 'P2' })],
    );
    expect(payload.decisoes.map(({ cod_produto }) => cod_produto)).toEqual(['P1', 'P2']);
  });
});
