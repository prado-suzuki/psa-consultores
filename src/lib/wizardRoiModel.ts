import type { Etapa, Melhoria, Processo, Responsavel, Sistema } from '@/types';
import { melhoriaIdsDoProcesso } from '@/utils/gargaloMelhorias';
import type { EtapaBreakdown, IndicadoresRoi } from '@/components/equipe/mapa/wizard-roi/types';
import type { RoiProcesso } from '@/utils/roiCalculator';

export function custoHorarioMedio(responsaveis: Responsavel[]): number {
  return responsaveis.length
    ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length
    : 0;
}

export function criarBreakdownEtapas(
  etapas: Etapa[],
  respById: Map<string, Responsavel>,
  custoHM: number,
  etapasFuturo: Etapa[] = [],
): EtapaBreakdown[] {
  const sumLado = (arr: { responsavelId?: string; horas?: number }[] | undefined): { h: number; c: number } => {
    let h = 0;
    let c = 0;
    for (const r of arr || []) {
      const horas = r.horas ?? 0;
      const resp = r.responsavelId ? respById.get(r.responsavelId) : undefined;
      const ch = resp ? (resp.hourly_rate ?? 0) : custoHM;
      h += horas;
      c += horas * ch;
    }
    return { h, c };
  };

  const usarListaFuturo = !etapas.some(etapa => etapa.ficou != null) && etapasFuturo.length > 0;
  const total = usarListaFuturo ? Math.max(etapas.length, etapasFuturo.length) : etapas.length;

  return Array.from({ length: total }, (_, index) => {
    const e = etapas[index];
    const etapaFuturo = usarListaFuturo ? etapasFuturo[index] : undefined;
    const f = etapaFuturo ?? e?.ficou;
    const volEra = e?.volume_per_process || 1;
    const volFicou = (f?.volume_per_process ?? e?.volume_per_process) || 1;
    const exe = sumLado(e?.executadoPor);
    const exeF = sumLado(usarListaFuturo ? f?.executadoPor : (f?.executadoPor ?? e?.executadoPor));
    const horasExec = exe.h * volEra;
    const horasFicou = exeF.h * volFicou;
    const custoExec = exe.c * volEra;
    const custoFicou = exeF.c * volFicou;
    const txRetrab = e?.rework_rate ?? 0;
    const txRetrabFicou = f?.rework_rate ?? (usarListaFuturo ? 0 : txRetrab);

    return {
      id: e?.id ?? etapaFuturo?.id ?? `etapa-${index}`,
      nome: e?.name ?? etapaFuturo?.name ?? `Etapa ${index + 1}`,
      horasExec,
      horasFicou,
      custoExec,
      custoFicou,
      error_rate: e?.error_rate ?? 0,
      taxaErrosFicou: f?.error_rate ?? (usarListaFuturo ? 0 : (e?.error_rate ?? 0)),
      taxaRetrab: txRetrab,
      taxaRetrabFicou: txRetrabFicou,
      custoRetrabExec: custoExec * txRetrab,
      custoRetrabExecFicou: custoFicou * txRetrabFicou,
    };
  });
}

export function sistemasUsadosNasEtapas(etapas: Etapa[], sistemas: Sistema[]): Sistema[] {
  const ids = new Set<string>();
  etapas.forEach(e => (e.sistemas || []).forEach(s => ids.add(s)));
  return sistemas.filter(s => ids.has(s.id) || ids.has(s.nome));
}

export function melhoriasDoProcesso(
  processo: Processo | undefined,
  melhorias: Melhoria[],
): Melhoria[] {
  if (!processo) return [];
  const relevantes = melhoriaIdsDoProcesso(melhorias, processo.id);
  return melhorias.filter(m => relevantes.has(m.id));
}

export function indicadoresAtuais(calc: RoiProcesso | undefined): IndicadoresRoi {
  return {
    annual_cost: calc?.custoAnual ?? 0,
    annual_hours: calc?.horasAnual ?? 0,
    annual_savings: calc?.economiaAnual ?? 0,
    roi_percent: calc?.roiPercentual ?? 0,
    payback_months: calc?.paybackMeses ?? 0,
    hours_freed: calc?.horasLiberadas ?? 0,
    investment: calc?.investimento ?? 0,
  };
}
