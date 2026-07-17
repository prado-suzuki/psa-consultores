import { describe, expect, it } from 'vitest';
import {
  buildCreateRecord,
  buildDistribuicaoRows,
  buildUpdateRecord,
  dcompSchema,
  formatCompetenciaDisplay,
  formatCurrencyDisplay,
  formatDcompNumber,
  getDcompsVigentes,
  getProporcaoOriginal,
  getValorAtualizadoSelicMax,
  groupCodigosByGrupo,
  isCompetenciaValida,
  normalizeMesAno,
  parseCompetenciaInput,
  parseCurrencyToNumber,
  round2,
  toCents,
  validateDistribuicoes,
  type BuildDistribuicoesInput,
  type DcompFormData,
} from '@/lib/dcompForm';

const formData: DcompFormData = {
  nr_documento: '12.345.67890/123456-7890',
  nr_per_orig: 'PER 98.76',
  mes_ano_exercicio: '2026-07',
  dt_envio: '2026-07-17',
  vlr_compensado: 123.45,
  nr_dcomp_ret: 'RET-44',
};

describe('máscaras, parsers e normalização de DCOMP', () => {
  it('limita e mascara o documento por grupos, descartando caracteres não numéricos', () => {
    expect(formatDcompNumber('12345abc67890/123456789012345')).toBe(
      '12345.67890.123456.7.8.90-1234',
    );
    expect(formatDcompNumber('123456')).toBe('12345.6');
  });

  it('converte moeda por centavos, inclusive sinal textual, e formata em BRL', () => {
    expect(parseCurrencyToNumber('R$ 1.234,56')).toBe(1234.56);
    expect(parseCurrencyToNumber('-R$ 12,34')).toBe(12.34);
    expect(parseCurrencyToNumber('')).toBe(0);
    expect(formatCurrencyDisplay(1234.56)).toMatch(/1\.234,56/);
  });

  it('faz parse/display de competência e normaliza somente mês ISO', () => {
    expect(parseCompetenciaInput('07/2026')).toBe('2026-07');
    expect(parseCompetenciaInput('0720')).toBe('07/20');
    expect(parseCompetenciaInput('07')).toBe('07');
    expect(formatCompetenciaDisplay('2026-07-31')).toBe('07/2026');
    expect(formatCompetenciaDisplay('inválida')).toBe('inválida');
    expect(normalizeMesAno('2026-07')).toBe('2026-07-01');
    expect(normalizeMesAno('2026-07-31')).toBe('2026-07-31');
    expect(normalizeMesAno('')).toBe('');
  });

  it('mantém o comportamento regex legado: valida mês, mas não o dia real', () => {
    expect(isCompetenciaValida('2026-02')).toBe(true);
    expect(isCompetenciaValida('2026-02-99')).toBe(true);
    expect(isCompetenciaValida('2026-13-01')).toBe(false);
    expect(isCompetenciaValida('2026-2-01')).toBe(false);
  });
});

describe('validação monetária e schema', () => {
  it('compara somas em centavos e rejeita linha ausente, grupo, zero e competência inválida', () => {
    const validas = validateDistribuicoes(
      [
        {
          grupo_tributo_id: 'G1',
          codigo_receita_id: null,
          valor_tributo: 0.1,
          competencia: '2026-01',
        },
        {
          grupo_tributo_id: 'G2',
          codigo_receita_id: null,
          valor_tributo: 0.2,
          competencia: '2026-02-99',
        },
      ],
      0.3,
    );
    expect(validas).toMatchObject({
      somaIgual: true,
      validas: true,
      totalRateado: 0.30000000000000004,
    });

    expect(validateDistribuicoes([], 0).validas).toBe(false);
    expect(
      validateDistribuicoes(
        [
          {
            grupo_tributo_id: null,
            codigo_receita_id: null,
            valor_tributo: -0.001,
            competencia: 'x',
          },
        ],
        0,
      ),
    ).toMatchObject({
      temGrupoNaoSelecionado: true,
      temValorZero: true,
      temCompetenciaInvalida: true,
    });
    expect(toCents(1.005)).toBe(100);
    expect(toCents(-1.005)).toBe(-100);
    expect(round2(10.126)).toBe(10.13);
    expect(round2(-10.126)).toBe(-10.13);
  });

  it('aceita zero, rejeita valor negativo e aplica defaults do schema', () => {
    expect(
      dcompSchema.parse({ ...formData, vlr_compensado: '0', mes_ano_exercicio: undefined }),
    ).toMatchObject({
      vlr_compensado: 0,
      mes_ano_exercicio: '',
    });
    expect(() => dcompSchema.parse({ ...formData, vlr_compensado: -0.01 })).toThrow(
      'Valor deve ser positivo',
    );
  });
});

describe('payloads e regras derivadas', () => {
  it('constrói payload de criação normalizado e update sem alterar o número original', () => {
    expect(buildCreateRecord(formData)).toEqual({
      nr_documento: '12345678901234567890',
      nr_per_orig: '9876',
      mes_ano_exercicio: '2026-07-01',
      dt_envio: '2026-07-17',
      vlr_compensado: 123.45,
      nr_dcomp_ret: '44',
    });
    expect(buildUpdateRecord({ ...formData, nr_dcomp_ret: '' })).toEqual({
      nr_per_orig: '9876',
      mes_ano_exercicio: '2026-07-01',
      dt_envio: '2026-07-17',
      vlr_compensado: 123.45,
      nr_dcomp_ret: null,
    });
  });

  it('remove da lista os documentos retificados, preservando folhas vigentes', () => {
    const original = { nr_documento: 'D1', mes_ano_exercicio: '2026-01', nr_dcomp_ret: null };
    const retificadora = { nr_documento: 'D2', mes_ano_exercicio: '2026-02', nr_dcomp_ret: 'D1' };
    expect(getDcompsVigentes([original, retificadora])).toEqual([retificadora]);
  });

  it('agrupa códigos sem reordenar e calcula proporção e teto SELIC', () => {
    const codigos = [
      { id: '1', grupo_tributo_id: 'G1' },
      { id: '2', grupo_tributo_id: 'G2' },
      { id: '3', grupo_tributo_id: 'G1' },
    ];
    expect(groupCodigosByGrupo(codigos)).toEqual({
      G1: [codigos[0], codigos[2]],
      G2: [codigos[1]],
    });
    expect(getProporcaoOriginal(0.25)).toBe(0.8);
    expect(getProporcaoOriginal(0)).toBe(1);
    expect(getProporcaoOriginal(-0.1)).toBe(1);
    expect(getValorAtualizadoSelicMax(100, 'P1', 'P1', 0.15)).toBeCloseTo(115);
    expect(getValorAtualizadoSelicMax(undefined, 'P1', 'P1', 0.15)).toBeNull();
    expect(getValorAtualizadoSelicMax(100, 'P2', 'P1', 0.15)).toBeNull();
  });
});

describe('rateio persistido', () => {
  const base: BuildDistribuicoesInput = {
    nrDocumento: 'D1',
    distribuicoes: [],
    existentes: [],
    grupos: [{ id: 'G1', sigla: 'IRPJ' }] as BuildDistribuicoesInput['grupos'],
    isEditing: true,
    dtEnvioMudou: false,
    proporcaoOriginal: 1 / 3,
  };

  it('preserva original somente na matriz edição + mesma data + mesmo valor em centavos', () => {
    const linha = {
      id: 'L1',
      grupo_tributo_id: 'G1',
      codigo_receita_id: 'C1',
      valor_tributo: 10.004,
      competencia: '2026-07',
      valor_original: 8.88,
    };
    const existente = { ...linha, _legacyTributo: 'IRPJ', valor_tributo: 10 };
    const preserved = buildDistribuicaoRows({
      ...base,
      distribuicoes: [linha],
      existentes: [existente],
    });
    expect(preserved[0].valor_original).toBe(8.88);

    for (const overrides of [
      { dtEnvioMudou: true },
      { distribuicoes: [{ ...linha, valor_tributo: 10.01 }] },
      { distribuicoes: [{ ...linha, valor_original: null }] },
      { isEditing: false },
    ]) {
      const [row] = buildDistribuicaoRows({
        ...base,
        distribuicoes: [linha],
        existentes: [existente],
        ...overrides,
      });
      expect(row.valor_original).toBe(round2(row.valor_tributo * base.proporcaoOriginal));
    }
  });

  it('recalcula e arredonda cada linha separadamente, mapeando grupo e competência', () => {
    const rows = buildDistribuicaoRows({
      ...base,
      isEditing: false,
      distribuicoes: [
        {
          grupo_tributo_id: 'G1',
          codigo_receita_id: 'C1',
          valor_tributo: 10,
          competencia: '2026-07',
        },
        {
          grupo_tributo_id: 'ausente',
          codigo_receita_id: null,
          valor_tributo: 20,
          competencia: '2026-08-31',
        },
      ],
    });
    expect(rows).toEqual([
      {
        nr_documento: 'D1',
        tributo: 'IRPJ',
        grupo_tributo_id: 'G1',
        codigo_receita_id: 'C1',
        valor_tributo: 10,
        valor_original: 3.33,
        competencia: '2026-07-01',
      },
      {
        nr_documento: 'D1',
        tributo: '',
        grupo_tributo_id: 'ausente',
        codigo_receita_id: null,
        valor_tributo: 20,
        valor_original: 6.67,
        competencia: '2026-08-31',
      },
    ]);
    expect(rows.reduce((sum, row) => sum + Number(row.valor_original), 0)).toBe(10);
  });
});
