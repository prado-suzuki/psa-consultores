import { describe, it, expect } from 'vitest';
import {
  calcularRoi, ratioRoi, ratioPayback, maturidadeProcesso,
  type RoiInput,
} from './roiCalculator';
import type { Processo, Etapa, Melhoria, Responsavel } from '../types';

const r1 = (): Responsavel => ({ id: 'r1', hourly_rate: 100 } as unknown as Responsavel);

// Processo pX (Mensal, ann=12), etapa cai 2h→1h (vol 1) ⇒ economia 1.200/ano.
function etapaComFicou(procId: string): Etapa {
  return {
    id: `e-${procId}`, process_id: procId, name: 'etapa',
    volume_per_process: 1, rework_rate: 0, error_rate: 0,
    executadoPor: [{ responsavelId: 'r1', nome: '', horas: 2 }],
    sistemas: [],
    ficou: { executadoPor: [{ responsavelId: 'r1', nome: '', horas: 1 }], rework_rate: 0, sistemas: [] },
  } as unknown as Etapa;
}
function melhoria(id: string, procId: string, status: string | null, externo = 500): Melhoria {
  return {
    id, improvement_description: id, improvement_status: status,
    processos: [procId], sistemas: [], executadoPor: [],
    training_hours: 0, one_time_external_cost: externo,
  } as unknown as Melhoria;
}
function cenario(melhorias: Melhoria[]): RoiInput {
  return {
    processos: [{ id: 'pX', name: 'pX', frequency: 'Mensal' } as unknown as Processo],
    etapas: [etapaComFicou('pX')],
    responsaveis: [r1()],
    sistemas: [], gargalos: [], melhorias,
  };
}

describe('ratioRoi / ratioPayback — guarda de razões', () => {
  it('ROI: número quando investimento>0 (inclui negativo); null quando investimento≈0', () => {
    expect(ratioRoi(1200, 1000)).toBeCloseTo(120, 6);
    expect(ratioRoi(0, 500)).toBe(0);
    expect(ratioRoi(-500, 1000)).toBeCloseTo(-50, 6);   // cenário pior continua número
    expect(ratioRoi(1200, 0)).toBeNull();
    expect(ratioRoi(1200, 1e-12)).toBeNull();            // abaixo do EPS
  });
  it('Payback: null quando investimento≈0 OU economia mensal≈0', () => {
    expect(ratioPayback(100, 1200)).toBeCloseTo(12, 6);
    expect(ratioPayback(100, 0)).toBeNull();
    expect(ratioPayback(0, 1200)).toBeNull();
    expect(ratioPayback(-10, 1200)).toBeNull();
  });
});

describe('partição Realizado vs Projetado (gate pela conclusão das melhorias)', () => {
  it('todas Concluído ⇒ realizado (economia e investimento realizados)', () => {
    const r = calcularRoi(cenario([melhoria('m1', 'pX', 'Concluído'), melhoria('m2', 'pX', 'Concluído')]));
    const p = r.porProcesso[0];
    expect(p.statusEconomia).toBe('realizado');
    expect(p.economiaRealizada).toBeCloseTo(1200, 6);
    expect(p.economiaProjetada).toBeCloseTo(0, 6);
    expect(p.investimentoRealizado).toBeCloseTo(1000, 6);
    expect(p.roiRealizado).toBeCloseTo(120, 6);
    expect(p.economiaRealizada + p.economiaProjetada).toBeCloseTo(p.economiaAnual, 6);
  });

  it('mista (Concluído + Não iniciado) ⇒ emAndamento; economia em projetada; invest do concluído é realizado', () => {
    const r = calcularRoi(cenario([melhoria('m1', 'pX', 'Concluído'), melhoria('m2', 'pX', 'Não iniciado')]));
    const p = r.porProcesso[0];
    expect(p.statusEconomia).toBe('emAndamento');
    expect(p.economiaRealizada).toBeCloseTo(0, 6);
    expect(p.economiaEmAndamento).toBeCloseTo(1200, 6);
    expect(p.economiaProjetada).toBeCloseTo(1200, 6);
    expect(p.investimentoRealizado).toBeCloseTo(500, 6);   // só m1 (Concluído)
    expect(p.investimentoProjetado).toBeCloseTo(500, 6);
    expect(p.roiRealizado).toBe(0);                        // gastou 500, economia realizada 0
    expect(p.investimentoRealizado + p.investimentoProjetado).toBeCloseTo(p.investimento, 6);
  });

  it('nenhuma avançou ⇒ projetado; roiRealizado null (investimento realizado 0)', () => {
    const r = calcularRoi(cenario([melhoria('m1', 'pX', 'Não iniciado'), melhoria('m2', 'pX', 'Backlog')]));
    const p = r.porProcesso[0];
    expect(p.statusEconomia).toBe('projetado');
    expect(p.economiaProjetada).toBeCloseTo(1200, 6);
    expect(p.investimentoRealizado).toBeCloseTo(0, 6);
    expect(p.roiRealizado).toBeNull();
  });

  it('sem melhoria mas com cenário futuro ⇒ sem-melhoria; economia projetada; sem investimento', () => {
    const r = calcularRoi(cenario([]));
    const p = r.porProcesso[0];
    expect(p.statusEconomia).toBe('sem-melhoria');
    expect(p.economiaRealizada).toBeCloseTo(0, 6);
    expect(p.economiaProjetada).toBeCloseTo(1200, 6);
    expect(p.maturidade.temCenarioFuturo).toBe(true);
    expect(p.maturidade.temInvestimento).toBe(false);
    expect(p.maturidade.implementado).toBe(false);
    expect(p.roiPercentual).toBeNull();
  });
});

describe('maturidadeProcesso — nível = nº de fases preenchidas', () => {
  const base = { id: 'p', name: 'p', frequency: 'Mensal' } as unknown as Processo;
  const etapaSimples = {
    id: 'e', process_id: 'p', rework_rate: 0, error_rate: 0,
    executadoPor: [{ responsavelId: 'r1', nome: '', horas: 1 }], sistemas: [],
  } as unknown as Etapa;

  it('mapeado apenas ⇒ nivel 1', () => {
    const m = maturidadeProcesso({ proc: base, etapasDoProc: [etapaSimples], gargalos: [], melhorias: [], investimento: 0 });
    expect(m.isMapeado).toBe(true);
    expect(m.nivel).toBe(1);
  });

  it('mapeado + diagnóstico (rework>0) ⇒ nivel 2', () => {
    const e = { ...etapaSimples, rework_rate: 0.1 } as unknown as Etapa;
    const m = maturidadeProcesso({ proc: base, etapasDoProc: [e], gargalos: [], melhorias: [], investimento: 0 });
    expect(m.temDiagnostico).toBe(true);
    expect(m.nivel).toBe(2);
  });

  it('todas as fases ⇒ nivel 5', () => {
    const e = { ...etapaSimples, rework_rate: 0.1, ficou: { executadoPor: [], rework_rate: 0, sistemas: [] } } as unknown as Etapa;
    const mel = [melhoria('m', 'p', 'Concluído')];
    const m = maturidadeProcesso({ proc: base, etapasDoProc: [e], gargalos: [], melhorias: mel, investimento: 100 });
    expect(m.nivel).toBe(5);
    expect(m.implementado).toBe(true);
  });
});

describe('cluster-agnóstico (Fiscal por frequência, sem volume/ficou/melhoria)', () => {
  it('isMapeado via FATOR_ANUAL; economia 0; razões null; sem-melhoria', () => {
    const input: RoiInput = {
      processos: [{ id: 'f1', name: 'Fiscal 1', frequency: 'Mensal' } as unknown as Processo],
      etapas: [{
        id: 'fe1', process_id: 'f1', rework_rate: 0, volume_per_process: 1,
        executadoPor: [{ responsavelId: 'r1', nome: '', horas: 4 }], sistemas: [],
      } as unknown as Etapa],
      responsaveis: [r1()], sistemas: [], gargalos: [], melhorias: [],
    };
    const r = calcularRoi(input);
    const p = r.porProcesso[0];
    expect(p.execucoesAnuais).toBe(12);            // FATOR_ANUAL['Mensal']
    expect(p.maturidade.isMapeado).toBe(true);
    expect(p.maturidade.temCenarioFuturo).toBe(false);
    expect(p.economiaAnual).toBeCloseTo(0, 6);
    expect(p.roiPercentual).toBeNull();
    expect(p.statusEconomia).toBe('sem-melhoria');
  });
});
