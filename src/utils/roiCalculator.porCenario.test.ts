import { describe, it, expect } from 'vitest';
import { calcularRoi, type RoiInput } from './roiCalculator';
import type { Processo, Etapa, Responsavel } from '../types';

// Modelo por-cenário (Fase 2): o cenário "ficou" vem da lista de etapas TO-BE
// (etapasFuturo), independente das AS-IS, quando o processo NÃO tem `.ficou`.
// r1 = R$100/h; processo Anual (ann=1) para conferência à mão.

const r1 = { id: 'r1', hourly_rate: 100 } as unknown as Responsavel;
const proc = { id: 'p1', name: 'P1', frequency: 'Anual' } as unknown as Processo;

function etapa(id: string, horas: number, extra: Record<string, unknown> = {}): Etapa {
  return {
    id, process_id: 'p1', name: id,
    volume_per_process: 1, rework_rate: 0, error_rate: 0,
    executadoPor: [{ responsavelId: 'r1', nome: '', horas }],
    sistemas: [],
    ...extra,
  } as unknown as Etapa;
}

describe('calcularRoi — modelo por-cenário (etapasFuturo, despareado)', () => {
  it('calcula o ficou a partir da lista TO-BE quando não há .ficou', () => {
    const input: RoiInput = {
      processos: [proc],
      etapas: [etapa('a1', 2), etapa('a2', 2)],   // era: 4h → R$400/ano
      etapasFuturo: [etapa('t1', 1)],             // ficou: 1h → R$100/ano
      responsaveis: [r1], sistemas: [], gargalos: [], melhorias: [],
    };
    const p = calcularRoi(input).porProcesso[0];
    expect(p.custoAnual).toBe(400);
    expect(p.custoAnualFicou).toBe(100);
    expect(p.economiaAnual).toBe(300);
    expect(p.horasAnual).toBe(4);
    expect(p.horasAnualFicou).toBe(1);
    expect(p.horasLiberadas).toBe(3);
    expect(p.maturidade.temCenarioFuturo).toBe(true);
  });

  it('sem .ficou e sem etapasFuturo ⇒ ficou = era (economia 0)', () => {
    const input: RoiInput = {
      processos: [proc],
      etapas: [etapa('a1', 2), etapa('a2', 2)],
      responsaveis: [r1], sistemas: [], gargalos: [], melhorias: [],
    };
    const p = calcularRoi(input).porProcesso[0];
    expect(p.economiaAnual).toBe(0);
    expect(p.custoAnualFicou).toBe(p.custoAnual);
    expect(p.maturidade.temCenarioFuturo).toBe(false);
  });

  it('processo com .ficou (pareado legado) IGNORA etapasFuturo — back-compat', () => {
    const asisComFicou = etapa('a1', 2, {
      ficou: { executadoPor: [{ responsavelId: 'r1', nome: '', horas: 1 }], volume_per_process: 1, rework_rate: 0, sistemas: [] },
    });
    const input: RoiInput = {
      processos: [proc],
      etapas: [asisComFicou],            // era 2h; ficou 1h (via .ficou)
      etapasFuturo: [etapa('t1', 10)],   // deve ser IGNORADO (há .ficou)
      responsaveis: [r1], sistemas: [], gargalos: [], melhorias: [],
    };
    const p = calcularRoi(input).porProcesso[0];
    expect(p.custoAnual).toBe(200);        // 2h × 100
    expect(p.custoAnualFicou).toBe(100);   // .ficou 1h × 100 (não 10h da lista)
    expect(p.economiaAnual).toBe(100);
  });
});
