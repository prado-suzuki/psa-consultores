import { describe, it, expect } from 'vitest';
import { calcularRoi, type RoiInput } from './roiCalculator';
import type { Processo, Etapa, Responsavel } from '../types';

// Motor honesto (Fase 4): processo NÃO-calculável fica FORA de todos os agregados
// (emMapeamento), nunca com número fabricado (sem volume=1, sem custo médio, sem 0).

const resp = { id: 'r1', name: 'A', level: 'pleno', hourly_rate: 100 } as Responsavel;

const proc = (id: string, over: Partial<Processo> = {}): Processo =>
  ({ id, name: id, description: '', volume_executions: 12, ...over }) as Processo;

const etapaCompleta = (id: string, pid: string, over: Partial<Etapa> = {}): Etapa => ({
  id, name: id, description: '', process_id: pid, execution: 'manual',
  rework_rate: 0, volume_per_process: 1,
  docsEntrada: [], docsSaida: [], sistemas: [], volumeMensal: 0,
  executadoPor: [{ responsavelId: 'r1', nome: '', horas: 2 }],
  ...over,
}) as Etapa;

const base = (processos: Processo[], etapas: Etapa[]): RoiInput =>
  ({ processos, etapas, responsaveis: [resp], sistemas: [], gargalos: [], melhorias: [] });

// custoAnual de um processo completo padrão = 100/h × 2h × vol 1 × 12 exec = 2400.
const CUSTO = 2400;

describe('calcularRoi — gating de calculabilidade (motor honesto)', () => {
  it('processo incompleto (etapa sem volume) fica FORA do consolidado, em emMapeamento', () => {
    const r = calcularRoi(base(
      [proc('p1'), proc('p2')],
      [etapaCompleta('e1', 'p1'), etapaCompleta('e2', 'p2', { volume_per_process: undefined })],
    ));
    expect(r.porProcesso.map(p => p.processoId)).toEqual(['p1']);
    expect(r.emMapeamento.map(p => p.processoId)).toEqual(['p2']);
    expect(r.emMapeamento[0].camposFaltando.some(f => f.includes('volume por processo'))).toBe(true);
    // p2 NÃO entra no custo: nem como 0, nem fabricado.
    expect(r.custoAtualAno).toBeCloseTo(CUSTO, 6);
  });

  it('cenário OSG: P1/P2 completos somam; P3 sem etapas fica em mapeamento e não quebra', () => {
    const r = calcularRoi(base(
      [proc('p1'), proc('p2'), proc('p3')],
      [etapaCompleta('e1', 'p1'), etapaCompleta('e2', 'p2')], // p3 sem etapas
    ));
    expect(r.porProcesso.length).toBe(2);
    expect(r.emMapeamento.map(p => p.processoId)).toEqual(['p3']);
    expect(r.emMapeamento[0].camposFaltando).toContain('Nenhuma etapa mapeada');
    // "Como era" consolidado = só os completos, e NUNCA vazio.
    expect(r.custoAtualAno).toBeCloseTo(CUSTO * 2, 6);
    expect(r.custoAtualAno).toBeGreaterThan(0);
  });

  it('processo completo SEM "Como ficou": entra no "Como era" (baseline conta), economia 0', () => {
    const r = calcularRoi(base([proc('p1')], [etapaCompleta('e1', 'p1')]));
    expect(r.porProcesso[0].custoAnual).toBeCloseTo(CUSTO, 6);
    expect(r.economiaAnual).toBeCloseTo(0, 6);
  });

  it('nenhum processo completo → consolidado honestamente vazio (0), todos em mapeamento', () => {
    const r = calcularRoi(base(
      [proc('p1', { volume_executions: null, frequency: null })],
      [etapaCompleta('e1', 'p1')],
    ));
    expect(r.porProcesso).toEqual([]);
    expect(r.custoAtualAno).toBe(0);
    expect(r.emMapeamento.map(p => p.processoId)).toEqual(['p1']);
    expect(r.emMapeamento[0].camposFaltando).toContain('Volume anual do processo');
  });
});
