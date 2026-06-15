import { describe, it, expect } from 'vitest';
import { calcularRoi, type RoiInput } from './roiCalculator';
import type { Processo, Etapa, Melhoria, Responsavel, Sistema } from '../types';

// Constrói um cenário mínimo: 1 responsável (R$100/h), 2 processos mensais,
// cada um com 1 etapa que cai de 1h (AS-IS) para 0h (TO-BE) -> economia de
// 1h × 100 × 12 = R$1.200/processo. Uma única melhoria (custo único R$1.000)
// está vinculada aos DOIS processos.
function cenario(): RoiInput {
  const responsaveis = [{ id: 'r1', hourly_rate: 100 } as unknown as Responsavel];

  const mkEtapa = (id: string, procId: string): Etapa => ({
    id,
    process_id: procId,
    name: `etapa ${id}`,
    rework_rate: 0,
    executadoPor: [{ responsavelId: 'r1', nome: '', horas: 1 }],
    sistemas: [],
    ficou: {
      executadoPor: [{ responsavelId: 'r1', nome: '', horas: 0 }],
      rework_rate: 0,
      sistemas: [],
    },
  } as unknown as Etapa);

  const processos = [
    { id: 'p1', name: 'Processo 1', frequency: 'Mensal' } as unknown as Processo,
    { id: 'p2', name: 'Processo 2', frequency: 'Mensal' } as unknown as Processo,
  ];

  const melhorias = [
    {
      id: 'm1',
      improvement_description: 'Automação compartilhada',
      processos: ['p1', 'p2'],          // mesma melhoria atende os 2 processos
      sistemas: [],
      executadoPor: [],
      training_hours: 0,
      one_time_external_cost: 1000,     // custo ÚNICO da melhoria
    } as unknown as Melhoria,
  ];

  return {
    processos,
    etapas: [mkEtapa('e1', 'p1'), mkEtapa('e2', 'p2')],
    responsaveis,
    sistemas: [],
    gargalos: [],
    melhorias,
  };
}

describe('calcularRoi — custo único de melhoria (não multiplicado)', () => {
  it('rateia o investimento da melhoria entre os processos atendidos; total = custo único', () => {
    const r = calcularRoi(cenario());

    // O custo da melhoria (R$1.000) é único: somando os 2 processos dá 1.000,
    // não 2.000. (Antes do fix, cada processo somava 1.000 -> total 2.000.)
    expect(r.investimentoTotal).toBeCloseTo(1000, 2);
    expect(r.investimentoBreakdown.externo).toBeCloseTo(1000, 2);

    // Cada processo absorve 1/2 do custo único.
    const [p1, p2] = r.porProcesso;
    expect(p1.investimento).toBeCloseTo(500, 2);
    expect(p2.investimento).toBeCloseTo(500, 2);

    // Economia não é afetada pelo rateio do investimento.
    expect(r.economiaAnual).toBeCloseTo(2400, 2);   // 1.200 × 2 processos
  });

  it('melhoria vinculada a 1 só processo mantém o custo integral nesse processo', () => {
    const input = cenario();
    (input.melhorias[0] as unknown as { processos: string[] }).processos = ['p1'];
    const r = calcularRoi(input);
    expect(r.investimentoTotal).toBeCloseTo(1000, 2);
    expect(r.porProcesso[0].investimento).toBeCloseTo(1000, 2);
    expect(r.porProcesso[1].investimento).toBeCloseTo(0, 2);
  });
});

describe('calcularRoi — custo recorrente de sistema (não multiplicado)', () => {
  // 1 sistema (R$100/mês = R$1.200/ano) usado por 2 processos (sem custo de
  // pessoas, para isolar o custo de sistema).
  function cenarioSistema(nProcessos: number): RoiInput {
    const sistema = { id: 's1', nome: 'Sistema X', custo_variavel_por_uso: 100, clustersRateio: [] } as unknown as Sistema;
    const processos: Processo[] = [];
    const etapas: Etapa[] = [];
    for (let i = 1; i <= nProcessos; i++) {
      processos.push({ id: `p${i}`, name: `Processo ${i}`, frequency: 'Mensal' } as unknown as Processo);
      etapas.push({
        id: `e${i}`, process_id: `p${i}`, name: `etapa ${i}`, rework_rate: 0,
        executadoPor: [], sistemas: ['s1'],
      } as unknown as Etapa);
    }
    return { processos, etapas, responsaveis: [], sistemas: [sistema], gargalos: [], melhorias: [] };
  }

  it('rateia o custo recorrente entre os processos que usam o sistema; total = custo único', () => {
    const r = calcularRoi(cenarioSistema(2));
    // R$1.200/ano contado uma vez (antes do fix: 1.200 × 2 = 2.400).
    expect(r.custoAtualAno).toBeCloseTo(1200, 2);
    expect(r.custosCategoria.sistemas).toBeCloseTo(1200, 2);
    expect(r.porProcesso[0].custosCategoria.sistemas).toBeCloseTo(600, 2);
  });

  it('sistema usado por 1 só processo mantém o custo integral', () => {
    const r = calcularRoi(cenarioSistema(1));
    expect(r.custoAtualAno).toBeCloseTo(1200, 2);
  });
});
