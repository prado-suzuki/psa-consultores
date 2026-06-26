// Combina o cálculo ao vivo (calcularRoi) com snapshots históricos
// (process_scenarios). O cálculo ao vivo dá o BREAKDOWN por processo,
// categoria e investimento — mas pode divergir dos snapshots quando o
// cadastro de etapas usa texto livre ("2 horas", "10/mês") em vez de números
// puros. Quando há snapshots salvos, os TOTAIS (annual_cost/savings/
// investment/hours) e o BREAKDOWN por processo são substituídos pelos valores
// dos snapshots (refletem o ROI consolidado já validado); senão, vêm do
// cálculo ao vivo.

import type { RoiAgregado } from '@/utils/roiCalculator';
import { ratioRoi, ratioPayback } from '@/utils/roiCalculator';
import type { ProcessSnapshot } from '@/types';

export function combinarRoiComSnapshots(
  calculo: RoiAgregado,
  snaps: ProcessSnapshot[],
): RoiAgregado {
  if (snaps.length === 0) return calculo;
  const sum = (k: keyof ProcessSnapshot) =>
    snaps.reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const custoAtualAno = sum('annual_cost');
  const economiaAnual = sum('annual_savings');
  const investimento = sum('investment');
  const horasAtualAno = sum('annual_hours');
  const hoursFreed = sum('hours_freed');
  const economiaMensal = economiaAnual / 12;

  // Reescala custosCategoria pelo ratio (snapshot/calc) — mantém proporções.
  const ratio = calculo.custoAtualAno > 0 ? custoAtualAno / calculo.custoAtualAno : 1;
  const cat = calculo.custosCategoria;
  const catF = calculo.custosCategoriaFicou;
  const escalado = {
    pessoas: cat.pessoas * ratio,
    sistemas: cat.sistemas * ratio,
    retrabalho: cat.retrabalho * ratio,
    externo: cat.externo * ratio,
  };
  const escaladoF = {
    pessoas: catF.pessoas * ratio,
    sistemas: catF.sistemas * ratio,
    retrabalho: catF.retrabalho * ratio,
    externo: catF.externo * ratio,
  };

  // Reescala investimentoBreakdown por ratioInv — sem isso "Execução de
  // Melhorias" (centenas de milhares) coexistiria com Investimento Total
  // do snapshot (R$ 36k).
  const inv = calculo.investimentoBreakdown;
  const ratioInv =
    calculo.investimentoTotal > 0 ? investimento / calculo.investimentoTotal : 1;
  const investBreakdown = {
    treinamentoMelhorias: inv.treinamentoMelhorias * ratioInv,
    sistemas: inv.sistemas * ratioInv,
    execucaoMelhorias: inv.execucaoMelhorias * ratioInv,
    externo: inv.externo * ratioInv,
  };

  // Substitui porProcesso pelos valores do snapshot de cada processo. Mantém
  // a estrutura (etapas, sistemas, execuções) mas com horas/custo/ROI
  // batendo com o snapshot validado.
  const snapByProc = new Map(snaps.map(s => [s.process_id, s]));
  const porProcesso = calculo.porProcesso.map(p => {
    const snap = snapByProc.get(p.processoId);
    if (!snap) return p;
    const horasAnualSnap = Number(snap.annual_hours) || 0;
    const custoAnualSnap = Number(snap.annual_cost) || 0;
    const economiaAnualSnap = Number(snap.annual_savings) || 0;
    const investSnap = Number(snap.investment) || 0;
    const hoursFreedSnap = Number(snap.hours_freed) || 0;
    const ratioCusto = p.custoAnual > 0 ? custoAnualSnap / p.custoAnual : 1;
    return {
      ...p,
      horasAnual: horasAnualSnap || p.horasAnual,
      custoAnual: custoAnualSnap || p.custoAnual,
      horasAnualFicou: Math.max(0, horasAnualSnap - hoursFreedSnap),
      custoAnualFicou: Math.max(0, custoAnualSnap - economiaAnualSnap),
      economiaAnual: economiaAnualSnap,
      economiaMensal: economiaAnualSnap / 12,
      horasLiberadas: hoursFreedSnap,
      investimento: investSnap,
      roiPercentual: ratioRoi(economiaAnualSnap, investSnap),
      paybackMeses: ratioPayback(economiaAnualSnap / 12, investSnap),
      custosCategoria: {
        pessoas: p.custosCategoria.pessoas * ratioCusto,
        sistemas: p.custosCategoria.sistemas * ratioCusto,
        retrabalho: p.custosCategoria.retrabalho * ratioCusto,
        externo: p.custosCategoria.externo * ratioCusto,
      },
      custosCategoriaFicou: {
        pessoas: p.custosCategoriaFicou.pessoas * ratioCusto,
        sistemas: p.custosCategoriaFicou.sistemas * ratioCusto,
        retrabalho: p.custosCategoriaFicou.retrabalho * ratioCusto,
        externo: p.custosCategoriaFicou.externo * ratioCusto,
      },
    };
  });

  return {
    ...calculo,
    porProcesso,
    custoAtualAno,
    custoFuturoAno: Math.max(0, custoAtualAno - economiaAnual),
    horasAtualAno,
    horasFuturoAno: Math.max(0, horasAtualAno - hoursFreed),
    economiaAnual,
    economiaMensal,
    horasLiberadas: hoursFreed,
    investimentoTotal: investimento,
    investimentoBreakdown: investBreakdown,
    custosCategoria: escalado,
    custosCategoriaFicou: escaladoF,
    roiPercentual: ratioRoi(economiaAnual, investimento),
    paybackMeses: ratioPayback(economiaMensal, investimento),
  };
}
