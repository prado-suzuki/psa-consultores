import { describe, it, expect } from 'vitest';
import { calcularRoi, type RoiInput } from './roiCalculator';
import type { Processo, Etapa, Melhoria, Responsavel, Sistema } from '../types';

// Cenário determinístico, conferível à mão, que cobre TODOS os indicadores e
// séries de gráfico do Dashboard ROI:
//   • Responsáveis: r1=R$100/h, r2=R$200/h → custo médio R$150/h.
//   • p1 (Mensal, ann=12): etapa e1 cai de 2h→1h, volume 3, rework 0,10→0,02,
//     error 0,05, usa sistema s1 (R$100/uso → R$1.200/ano). Melhoria m1 (só p1):
//     treino 4h, execução r2×3h, externo R$1.000.
//   • p2 (Anual, ann=1): etapa e2 com r2×5h, sem ficou (espelha o AS-IS),
//     sem sistema, sem melhoria → economia 0.
//
// Valores esperados (derivados no teste, não mágicos) — ver comentários.
function cenario(): RoiInput {
  const responsaveis = [
    { id: 'r1', hourly_rate: 100 } as unknown as Responsavel,
    { id: 'r2', hourly_rate: 200 } as unknown as Responsavel,
  ];
  const sistemas = [
    { id: 's1', nome: 'Sistema X', custo_variavel_por_uso: 100, clustersRateio: [] } as unknown as Sistema,
  ];
  const processos = [
    { id: 'p1', name: 'Processo 1', frequency: 'Mensal' } as unknown as Processo,
    { id: 'p2', name: 'Processo 2', frequency: 'Anual' } as unknown as Processo,
  ];
  const e1: Etapa = {
    id: 'e1', process_id: 'p1', name: 'etapa 1',
    volume_per_process: 3, rework_rate: 0.1, error_rate: 0.05,
    executadoPor: [{ responsavelId: 'r1', nome: '', horas: 2 }],
    sistemas: ['s1'],
    ficou: {
      executadoPor: [{ responsavelId: 'r1', nome: '', horas: 1 }],
      rework_rate: 0.02, volume_per_process: 3, sistemas: ['s1'],
    },
  } as unknown as Etapa;
  const e2: Etapa = {
    id: 'e2', process_id: 'p2', name: 'etapa 2',
    volume_per_process: 1, rework_rate: 0, error_rate: 0,
    executadoPor: [{ responsavelId: 'r2', nome: '', horas: 5 }],
    sistemas: [],
  } as unknown as Etapa;
  const melhorias = [
    {
      id: 'm1', improvement_description: 'Automação p1', improvement_status: 'Concluído',
      processos: ['p1'], sistemas: [],
      executadoPor: [{ responsavelId: 'r2', nome: '', horas: 3 }],
      training_hours: 4, one_time_external_cost: 1000,
    } as unknown as Melhoria,
  ];
  return { processos, etapas: [e1, e2], responsaveis, sistemas, gargalos: [], melhorias };
}

describe('calcularRoi — todos os indicadores e séries do Dashboard ROI', () => {
  const r = calcularRoi(cenario());
  const p1 = r.porProcesso.find(p => p.processoId === 'p1')!;
  const p2 = r.porProcesso.find(p => p.processoId === 'p2')!;

  it('por processo — p1 (Mensal): horas, custos, retrabalho, economia, investimento, ROI, payback', () => {
    expect(p1.execucoesAnuais).toBe(12);
    // horas/exec = 2h×vol3 = 6; ficou = 1h×3 = 3
    expect(p1.horasAnual).toBeCloseTo(72, 6);        // 6×12
    expect(p1.horasAnualFicou).toBeCloseTo(36, 6);   // 3×12
    expect(p1.horasLiberadas).toBeCloseTo(36, 6);
    // custos anuais
    expect(p1.custosCategoria.pessoas).toBeCloseTo(7200, 6);   // 200×3×12
    expect(p1.custosCategoria.sistemas).toBeCloseTo(1200, 6);  // 100×12×1
    expect(p1.custosCategoria.retrabalho).toBeCloseTo(720, 6); // 600×0,1×12
    expect(p1.custosCategoriaFicou.pessoas).toBeCloseTo(3600, 6);
    expect(p1.custosCategoriaFicou.retrabalho).toBeCloseTo(72, 6); // 300×0,02×12
    expect(p1.custoAnual).toBeCloseTo(9120, 6);       // 7200+1200+720
    expect(p1.custoAnualFicou).toBeCloseTo(4872, 6);  // 3600+1200+72
    expect(p1.economiaAnual).toBeCloseTo(4248, 6);
    expect(p1.economiaMensal).toBeCloseTo(354, 6);
    // taxas médias
    expect(p1.taxaErroMedia).toBeCloseTo(0.05, 6);
    expect(p1.taxaRetrabalhoMedia).toBeCloseTo(0.1, 6);
    expect(p1.taxaRetrabalhoFicouMedia).toBeCloseTo(0.02, 6);
    // investimento (custo único da melhoria, rateio 1/1)
    expect(p1.investimentoBreakdown.treinamentoMelhorias).toBeCloseTo(600, 6); // 4×150
    expect(p1.investimentoBreakdown.execucaoMelhorias).toBeCloseTo(600, 6);    // 3×200
    expect(p1.investimentoBreakdown.externo).toBeCloseTo(1000, 6);
    expect(p1.investimento).toBeCloseTo(2200, 6);
    expect(p1.roiPercentual).toBeCloseTo(193.0909, 3);  // 4248/2200×100
    expect(p1.paybackMeses).toBeCloseTo(6.21469, 4);    // 2200/354
  });

  it('por processo — p2 (Anual, sem ficou): espelha AS-IS, economia e investimento zero', () => {
    expect(p2.execucoesAnuais).toBe(1);
    expect(p2.horasAnual).toBeCloseTo(5, 6);
    expect(p2.horasAnualFicou).toBeCloseTo(5, 6);
    expect(p2.custoAnual).toBeCloseTo(1000, 6);       // 200×5×1
    expect(p2.custoAnualFicou).toBeCloseTo(1000, 6);
    expect(p2.economiaAnual).toBeCloseTo(0, 6);
    expect(p2.investimento).toBeCloseTo(0, 6);
    expect(p2.roiPercentual).toBeNull();   // investimento 0 → razão indefinida (não 0%)
    expect(p2.paybackMeses).toBeNull();
  });

  it('KPIs globais (cards do topo)', () => {
    expect(r.custoAtualAno).toBeCloseTo(10120, 6);    // 9120+1000
    expect(r.custoFuturoAno).toBeCloseTo(5872, 6);    // 4872+1000
    expect(r.horasAtualAno).toBeCloseTo(77, 6);       // 72+5
    expect(r.horasFuturoAno).toBeCloseTo(41, 6);      // 36+5
    expect(r.economiaAnual).toBeCloseTo(4248, 6);
    expect(r.economiaMensal).toBeCloseTo(354, 6);
    expect(r.horasLiberadas).toBeCloseTo(36, 6);
    expect(r.investimentoTotal).toBeCloseTo(2200, 6);
    expect(r.roiPercentual).toBeCloseTo(193.0909, 3);
    expect(r.paybackMeses).toBeCloseTo(6.21469, 4);
    // médias de retrabalho (média simples entre os 2 processos)
    expect(r.taxaRetrabalhoAtual).toBeCloseTo(0.05, 6);   // (0,1+0)/2
    expect(r.taxaRetrabalhoFuturo).toBeCloseTo(0.01, 6);  // (0,02+0)/2
  });

  it('série do gráfico "Custos por categoria" (atual × otimizado)', () => {
    expect(r.custosCategoria).toEqual({
      pessoas: 8200,     // 7200+1000
      sistemas: 1200,
      retrabalho: 720,
      externo: 0,
    });
    expect(r.custosCategoriaFicou).toEqual({
      pessoas: 4600,     // 3600+1000
      sistemas: 1200,
      retrabalho: 72,
      externo: 0,
    });
  });

  it('série do gráfico "Composição do investimento"', () => {
    expect(r.investimentoBreakdown).toEqual({
      treinamentoMelhorias: 600,
      sistemas: 0,
      execucaoMelhorias: 600,
      externo: 1000,
    });
    const totalBreakdown =
      r.investimentoBreakdown.treinamentoMelhorias +
      r.investimentoBreakdown.execucaoMelhorias +
      r.investimentoBreakdown.externo +
      r.investimentoBreakdown.sistemas;
    expect(totalBreakdown).toBeCloseTo(r.investimentoTotal, 6); // breakdown fecha com o total
  });

  it('consistência: somatórios por processo reconstroem os globais', () => {
    expect(p1.custoAnual + p2.custoAnual).toBeCloseTo(r.custoAtualAno, 6);
    expect(p1.economiaAnual + p2.economiaAnual).toBeCloseTo(r.economiaAnual, 6);
    expect(p1.investimento + p2.investimento).toBeCloseTo(r.investimentoTotal, 6);
    expect(p1.horasLiberadas + p2.horasLiberadas).toBeCloseTo(r.horasLiberadas, 6);
  });

  it('partição Realizado vs Projetado + maturidade (m1 Concluído ⇒ p1 realizado)', () => {
    // p1: única melhoria (m1) está Concluído ⇒ economia toda realizada
    expect(p1.statusEconomia).toBe('realizado');
    expect(p1.economiaRealizada).toBeCloseTo(4248, 6);
    expect(p1.economiaProjetada).toBeCloseTo(0, 6);
    expect(p1.investimentoRealizado).toBeCloseTo(2200, 6);
    expect(p1.investimentoProjetado).toBeCloseTo(0, 6);
    expect(p1.roiRealizado).toBeCloseTo(193.0909, 3);
    expect(p1.roiProjetado).toBeCloseTo(193.0909, 3);
    // p1 maturidade: mapeado + diagnóstico (rework>0) + futuro (ficou) + investimento + implementado
    expect(p1.maturidade).toMatchObject({
      isMapeado: true, temDiagnostico: true, temCenarioFuturo: true,
      temInvestimento: true, implementado: true, nivel: 5,
    });
    // p2: sem melhoria ⇒ sem-melhoria, sem cenário futuro
    expect(p2.statusEconomia).toBe('sem-melhoria');
    expect(p2.economiaRealizada).toBeCloseTo(0, 6);
    expect(p2.maturidade).toMatchObject({ temCenarioFuturo: false, temInvestimento: false, implementado: false, nivel: 1 });
    // agregado + invariantes de 2 vias
    expect(r.economiaRealizada).toBeCloseTo(4248, 6);
    expect(r.economiaProjetada).toBeCloseTo(0, 6);
    expect(r.investimentoRealizado).toBeCloseTo(2200, 6);
    expect(r.roiRealizado).toBeCloseTo(193.0909, 3);
    expect(r.economiaRealizada + r.economiaProjetada).toBeCloseTo(r.economiaAnual, 6);
    expect(r.investimentoRealizado + r.investimentoProjetado).toBeCloseTo(r.investimentoTotal, 6);
    // maturidade de escopo: 2 processos, 1 implementado
    expect(r.maturidade.total).toBe(2);
    expect(r.maturidade.implementados).toBe(1);
    expect(r.maturidade.porStatusEconomia.realizado).toBe(1);
    expect(r.maturidade.porStatusEconomia['sem-melhoria']).toBe(1);
  });
});
