// Volume anual do processo — módulo-folha (sem dependências de cálculo) para
// quebrar o ciclo roiCalculator ↔ processoCalculavel. O multiplicador anual do
// ROI é `volume_executions`; `frequency` é fallback legado de volume (processos
// ainda não migrados), NÃO um fallback silencioso de cálculo.

import type { Processo, FrequenciaProcesso } from '../types';

export const FATOR_ANUAL: Record<FrequenciaProcesso, number> = {
  'Diária': 252,
  'Semanal': 52,
  'Quinzenal': 26,
  'Mensal': 12,
  'Trimestral': 4,
  'Anual': 1,
};

// Execuções anuais. Retorna 0 (não 1) quando não há volume nem frequência —
// é sinal de dado faltante, tratado como NÃO-calculável pelo doutor.
export function execucoesAnuais(p: Pick<Processo, 'frequency' | 'volume_executions'>): number {
  if (p.volume_executions != null && p.volume_executions > 0) return p.volume_executions;
  if (p.frequency && FATOR_ANUAL[p.frequency]) return FATOR_ANUAL[p.frequency];
  return 0;
}
