import { describe, it, expect } from 'vitest';
import { combinarRoiComSnapshots } from './combinarRoiComSnapshots';
import type { RoiAgregado, RoiProcesso } from './roiCalculator';
import type { ProcessSnapshot } from '../types';

// RoiAgregado mínimo conferível: 1 processo, custo vivo R$1.000, invest R$500.
function calculoBase(): RoiAgregado {
  const p1: RoiProcesso = {
    processoId: 'p1', processoNome: 'Processo 1',
    execucoesAnuais: 12, horasPorExecucao: 0, custoPorExecucao: 0,
    horasAnual: 25, custoAnual: 1000, horasAnualFicou: 15, custoAnualFicou: 600,
    taxaErroMedia: 0, custoQualidade: 0, taxaRetrabalhoMedia: 0, taxaRetrabalhoFicouMedia: 0,
    custosCategoria: { pessoas: 800, sistemas: 200, retrabalho: 0, externo: 0 },
    custosCategoriaFicou: { pessoas: 400, sistemas: 200, retrabalho: 0, externo: 0 },
    economiaAnual: 400, economiaMensal: 400 / 12, horasLiberadas: 10,
    investimento: 500,
    investimentoBreakdown: { treinamentoMelhorias: 100, sistemas: 0, execucaoMelhorias: 150, externo: 250 },
    statusEconomia: 'projetado',
    economiaRealizada: 0, economiaEmAndamento: 0, economiaProjetada: 400,
    investimentoRealizado: 0, investimentoProjetado: 500,
    roiPercentual: 80, paybackMeses: 15,
    roiRealizado: null, roiProjetado: 80,
    maturidade: {
      isMapeado: true, temDiagnostico: false, temCenarioFuturo: true,
      temInvestimento: true, implementado: false, nivel: 3, statusEconomia: 'projetado',
    },
  };
  return {
    porProcesso: [p1],
    emMapeamento: [],
    custoAtualAno: 1000, custoFuturoAno: 600, horasAtualAno: 25, horasFuturoAno: 15,
    economiaAnual: 400, economiaMensal: 400 / 12, horasLiberadas: 10,
    taxaRetrabalhoAtual: 0, taxaRetrabalhoFuturo: 0,
    investimentoTotal: 500,
    investimentoBreakdown: { treinamentoMelhorias: 100, sistemas: 0, execucaoMelhorias: 150, externo: 250 },
    custosCategoria: { pessoas: 800, sistemas: 200, retrabalho: 0, externo: 0 },
    custosCategoriaFicou: { pessoas: 400, sistemas: 200, retrabalho: 0, externo: 0 },
    economiaRealizada: 0, economiaEmAndamento: 0, economiaProjetada: 400,
    investimentoRealizado: 0, investimentoProjetado: 500,
    roiPercentual: 80, paybackMeses: 15,
    roiRealizado: null, roiProjetado: 80,
    maturidade: {
      total: 1, mapeados: 1, comDiagnostico: 0, comCenarioFuturo: 1,
      comInvestimento: 1, implementados: 0,
      porStatusEconomia: { realizado: 0, emAndamento: 0, projetado: 1, 'sem-melhoria': 0 },
      completudePct: 60,
    },
  };
}

describe('combinarRoiComSnapshots', () => {
  it('sem snapshots: devolve o cálculo ao vivo inalterado', () => {
    const calc = calculoBase();
    expect(combinarRoiComSnapshots(calc, [])).toBe(calc);
  });

  it('com snapshots: totais vêm do snapshot; categorias e breakdown reescalam pelo ratio', () => {
    const calc = calculoBase();
    const snaps = [{
      process_id: 'p1',
      annual_cost: 2000, annual_savings: 600, investment: 1000,
      annual_hours: 50, hours_freed: 20, roi_percent: 60, payback_months: 20,
    } as unknown as ProcessSnapshot];

    const r = combinarRoiComSnapshots(calc, snaps);

    // Totais = somatório dos snapshots
    expect(r.custoAtualAno).toBeCloseTo(2000, 6);
    expect(r.economiaAnual).toBeCloseTo(600, 6);
    expect(r.investimentoTotal).toBeCloseTo(1000, 6);
    expect(r.horasAtualAno).toBeCloseTo(50, 6);
    expect(r.horasLiberadas).toBeCloseTo(20, 6);
    // Derivados
    expect(r.economiaMensal).toBeCloseTo(50, 6);            // 600/12
    expect(r.custoFuturoAno).toBeCloseTo(1400, 6);          // 2000-600
    expect(r.horasFuturoAno).toBeCloseTo(30, 6);            // 50-20
    expect(r.roiPercentual).toBeCloseTo(60, 6);             // 600/1000×100
    expect(r.paybackMeses).toBeCloseTo(20, 6);              // 1000/50

    // custosCategoria reescalado pelo ratio = 2000/1000 = 2
    expect(r.custosCategoria).toEqual({ pessoas: 1600, sistemas: 400, retrabalho: 0, externo: 0 });
    expect(r.custosCategoriaFicou).toEqual({ pessoas: 800, sistemas: 400, retrabalho: 0, externo: 0 });

    // investimentoBreakdown reescalado pelo ratioInv = 1000/500 = 2
    expect(r.investimentoBreakdown).toEqual({
      treinamentoMelhorias: 200, sistemas: 0, execucaoMelhorias: 300, externo: 500,
    });
    const totBd = r.investimentoBreakdown.treinamentoMelhorias + r.investimentoBreakdown.execucaoMelhorias
      + r.investimentoBreakdown.externo + r.investimentoBreakdown.sistemas;
    expect(totBd).toBeCloseTo(r.investimentoTotal, 6);

    // porProcesso substituído pelos valores do snapshot
    const p = r.porProcesso[0];
    expect(p.custoAnual).toBeCloseTo(2000, 6);
    expect(p.economiaAnual).toBeCloseTo(600, 6);
    expect(p.investimento).toBeCloseTo(1000, 6);
    expect(p.horasLiberadas).toBeCloseTo(20, 6);
    expect(p.roiPercentual).toBeCloseTo(60, 6);
    expect(p.custosCategoria.pessoas).toBeCloseTo(1600, 6);  // ratioCusto = 2000/1000 = 2
  });

  it('snapshot com investimento 0: razões ficam null (em construção)', () => {
    const calc = calculoBase();
    const snaps = [{
      process_id: 'p1',
      annual_cost: 2000, annual_savings: 600, investment: 0,
      annual_hours: 50, hours_freed: 20, roi_percent: 0, payback_months: 0,
    } as unknown as ProcessSnapshot];
    const r = combinarRoiComSnapshots(calc, snaps);
    expect(r.roiPercentual).toBeNull();
    expect(r.paybackMeses).toBeNull();
    expect(r.porProcesso[0].roiPercentual).toBeNull();
    expect(r.porProcesso[0].paybackMeses).toBeNull();
  });

  it('partição realizado/projetado e maturidade passam intactas (overlay não as toca)', () => {
    const calc = calculoBase();
    const snaps = [{
      process_id: 'p1',
      annual_cost: 2000, annual_savings: 600, investment: 1000,
      annual_hours: 50, hours_freed: 20, roi_percent: 60, payback_months: 20,
    } as unknown as ProcessSnapshot];
    const r = combinarRoiComSnapshots(calc, snaps);
    expect(r.economiaRealizada).toBe(0);
    expect(r.economiaProjetada).toBe(400);
    expect(r.porProcesso[0].statusEconomia).toBe('projetado');
    expect(r.porProcesso[0].maturidade.nivel).toBe(3);
  });
});
