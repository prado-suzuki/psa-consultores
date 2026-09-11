// Detecta colunas de "Check/Diferença" e devolve a classe do papel de status.
// Para checks derivados (em BRL), calcula a divergência relativa contra o campo
// base, comparada aos thresholds de conferência.
//
// A COR SAI DAQUI, E DAQUI SÓ. Esta é a escada de conferência do ICMS Saídas, e
// ela era `emerald`/`amber`/`red` cru até 10/09/2026. Duas coisas a moveram:
//
// · a escada tem TRÊS degraus com significado, não é gradiente de gravidade: o
//   valor confere, o valor merece atenção, o valor divergiu. Três estados
//   nomeados vestem papel; rampa contínua não veste, e é por isso que o
//   `CORES_MOTIVO` do `AuditPendenciasTable` (seis níveis) segue de fora. A
//   distinção está no `docs/geral/cor-o-que-falta.md`, §2;
// · e a escada estava DUPLICADA em forma binária: o `T01ApuracaoTab` decidia
//   `diferenca === 0 ? verde : vermelho` em QUATRO lugares, à mão, sobre o mesmo
//   conceito de divergência. Virou `classeDeConferencia`, aqui embaixo.
//
// Medido na conversão, sobre cartão branco com o fundo a 60%:
//
//   antes  emerald-700/emerald-50  5,31   amber-700/amber-50  4,91   red-700/red-50  6,13
//   depois feito/feito-soft        7,62   alerta/alerta-soft  6,09   ajuste/ajuste-soft  6,49
//
// E o binário do T01 estava REPROVANDO: o emerald-600 do estoque sobre branco dá 3,77,
// abaixo do 4,5 do AA, em quatro células de valor. `status-feito` dá 8,68.
// Os fundos antigos também não separavam do cartão (1,02 a 1,06); os novos vão a
// 1,14–1,30, porque o `-soft` do contrato mora em 86% e não em 95%.

const CHECK_KEY_RE = /(_CHECK$|^CHECK_?$|^DIF$|EFD.*CHECK|E116.*CHECK|_DIF$)/i;

const VERDE = 0.005; // < 0.5% — divergência insignificante
const AMARELO = 0.02; // < 2% — atenção

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Para cada Check derivado, qual campo serve de base p/ % relativo. */
const CHECK_BASE_MAP: Record<string, string[]> = {
  ICMS_RECOLHER_E116_CHECK: ['ICMS_RECOLHER'],
  ICMS_DEVIDO_E116_CHECK: ['ICMS_DEVIDO'],
  FUNDES_E116_CHECK: ['FUNDES'],
  FUNDED_E116_CHECK: ['FUNDED'],
  FUNDEIC_E116_CHECK: ['FUNDEIC'],
  ICMS_C190_CHECK: [
    'ICMS_NORMAL',
    'ICMS_17_CALCULADO',
    'icms_17_calculado',
    'VALOR_ICMS',
    'ICMS_17',
  ],
  C190_CHECK: [
    'ICMS_NORMAL',
    'ICMS_17_CALCULADO',
    'icms_17_calculado',
    'VALOR_ICMS',
    'ICMS_17',
  ],
  CHECK_DIF: [
    'ICMS_ST_PRADO',
    'VALOR_ICMS_ST',
    'C190_ICMS_ST',
    'ICMS_NORMAL',
  ],
};

export function isCheckKey(key: string): boolean {
  return CHECK_KEY_RE.test(key);
}

/**
 * Retorna a classe Tailwind para colorir a célula de Check.
 * Quando `row` é fornecida e o key é um Check derivado, calcula a divergência
 * relativa (|diff/base|). Caso contrário, usa o valor em si (assumindo que já
 * é um percentual, como nos Checks originais da planilha).
 */
export function checkColorClass(
  key: string,
  value: unknown,
  row?: Record<string, unknown>,
): string {
  if (!isCheckKey(key)) return '';
  const num = coerceNumber(value);
  if (num === null) return '';

  let relativeAbs = Math.abs(num);
  const baseKeys = CHECK_BASE_MAP[key];
  if (baseKeys && row) {
    for (const bk of baseKeys) {
      const base = coerceNumber(row[bk]);
      if (base !== null && base !== 0) {
        relativeAbs = Math.abs(num / base);
        break;
      }
    }
  }

  if (relativeAbs < VERDE) return 'text-status-feito bg-status-feito-soft/60';
  if (relativeAbs < AMARELO) return 'text-status-alerta bg-status-alerta-soft/60';
  return 'text-status-ajuste bg-status-ajuste-soft/60 font-semibold';
}

/**
 * A forma BINÁRIA da mesma escada: o valor confere, ou divergiu.
 *
 * Existe porque o `T01ApuracaoTab` não tem threshold — ele compara `diferenca`
 * com zero — e decidia a cor à mão em quatro lugares. É o mesmo conceito de
 * divergência do `checkColorClass`, então usa os mesmos dois extremos da escada
 * e mora no mesmo arquivo. Sem `-soft`: ali a cor pinta LETRA, não célula.
 *
 * Devolve só a cor. O `font-semibold` que algumas chamadas acrescentam é
 * tipografia da linha contra o total, não parte do mapa, e fica no local.
 */
export function classeDeConferencia(confere: boolean): string {
  return confere ? 'text-status-feito' : 'text-status-ajuste';
}
