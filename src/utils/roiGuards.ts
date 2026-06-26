// Guardas de EXIBIÇÃO do ROI/Payback. Quando a razão é null (investimento ≈ 0 →
// ROI/payback indefinidos no motor), a UI mostra "em construção" em vez de um
// número enganoso (0% / 0 meses). Espelha ratioRoi/ratioPayback de roiCalculator,
// que são a fonte do null. Regra do projeto: nada de fallback silencioso.

import { formatDecimal } from './format';

export const ROI_EM_CONSTRUCAO = 'em construção';

/** true quando há investimento informado o bastante para um ROI/payback com sentido. */
export function roiDisponivel(investimento: number | null | undefined): boolean {
  return investimento != null && investimento > 1e-9;
}

/** ROI %: null/undefined → "em construção"; número (inclui negativo) → "12,3%". */
export function fmtRoi(v: number | null | undefined): string {
  if (v == null) return ROI_EM_CONSTRUCAO;
  return formatDecimal(v, '%');
}

/** Payback em meses: null/undefined → "em construção"; número → "6,2 meses". */
export function fmtPayback(v: number | null | undefined): string {
  if (v == null) return ROI_EM_CONSTRUCAO;
  return formatDecimal(v, ' meses');
}
