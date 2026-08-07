import { describe, expect, it } from 'vitest';
import {
  compararPeriodo,
  hojeAnalyticsUso,
  recortarSerie,
  resolverIntervaloPeriodo,
  somar,
} from './periodo';

const serie = [
  { mes: '2026-01', chamadas: 10 },
  { mes: '2026-02', chamadas: 20 },
  { mes: '2026-03', chamadas: 30 },
  { mes: '2026-04', chamadas: 40 },
];

describe('recortarSerie', () => {
  it('preserva a série completa quando o período é tudo', () => {
    expect(recortarSerie(serie, 0)).toEqual({
      serie,
      parcial: false,
      rotulo: 'Todo o período',
    });
  });

  it('mantém somente os últimos meses solicitados', () => {
    expect(recortarSerie(serie, 2)).toEqual({
      serie: serie.slice(-2),
      parcial: true,
      rotulo: '2026-03 a 2026-04',
    });
  });
});

describe('compararPeriodo', () => {
  it('compara duas janelas completas de mesmo tamanho para métricas aditivas', () => {
    expect(compararPeriodo(serie, (item) => item.chamadas, 2)).toEqual({
      atual: 70,
      anterior: 30,
      pct: 4 / 3,
      rotulo: 'vs. 2 meses anteriores',
    });
  });

  it('não inventa uma janela anterior para todo o período', () => {
    expect(compararPeriodo(serie, (item) => item.chamadas, 0)).toEqual({
      atual: 100,
      anterior: null,
      pct: null,
      rotulo: 'todo o período',
    });
  });

  it('não compara janelas de tamanhos diferentes', () => {
    expect(compararPeriodo(serie.slice(-3), (item) => item.chamadas, 2)).toMatchObject({
      atual: 70,
      anterior: null,
      pct: null,
    });
  });
});

describe('somar', () => {
  it('soma somente métricas aditivas da série recebida', () => {
    expect(somar(serie, (item) => item.chamadas)).toBe(100);
  });
});

describe('resolverIntervaloPeriodo', () => {
  it('gera datas reais para os últimos três meses incluindo o mês corrente', () => {
    expect(resolverIntervaloPeriodo('3m', '2026-08-06')).toEqual({
      inicio: '2026-06-01',
      fim: '2026-08-06',
      mesesRecorte: 3,
    });
  });

  it('atravessa a mudança de ano sem depender do timezone do navegador', () => {
    expect(resolverIntervaloPeriodo('6m', '2026-02-10').inicio).toBe('2025-09-01');
  });

  it('formata a data civil de Cuiabá sem usar a data UTC', () => {
    expect(hojeAnalyticsUso(new Date('2026-08-07T02:30:00.000Z'))).toBe('2026-08-06');
  });
});
