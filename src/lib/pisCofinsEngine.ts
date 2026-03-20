import type { PisCofsinPeriodo, PisCofinsItemCredito } from '@/types/pisCofins';

// ── CST classification ──────────────────────────────────────────────
export const isDebito = (cst: string): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 1 && n <= 10;
};

export const isExclusao = (cst: string): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 4 && n <= 9;
};

export const isCredito = (cst: string, aliqPis: number): boolean => {
  const n = parseInt(cst, 10);
  return !isNaN(n) && n >= 50 && n <= 69 && aliqPis > 0;
};

// ── Types ───────────────────────────────────────────────────────────
export type FonteValor = 'efd' | 'balancete';

export interface ContaPeriodoValor {
  cod_cta: string;
  descricao_conta: string;
  valores: Record<string, number>; // key = "MM/YYYY"
}

export interface ApuracaoMensal {
  periodo: string;
  baseDebito: number;
  baseCredito: number;
  contribuicaoBrutaPis: number;
  contribuicaoBrutaCofins: number;
  creditoMesPis: number;
  creditoMesCofins: number;
  creditoAnteriorPis: number;
  creditoAnteriorCofins: number;
  pisDevido: number;
  cofinsDevido: number;
  saldoAcumuladoPis: number;
  saldoAcumuladoCofins: number;
}

export interface ApuracaoResult {
  periodos: string[]; // ordered period labels
  resumoAnalitico: ContaPeriodoValor[];
  baseDebitos: ContaPeriodoValor[];
  baseCreditos: ContaPeriodoValor[];
  totaisDebito: Record<string, number>;
  totaisCredito: Record<string, number>;
  apuracaoMensal: ApuracaoMensal[];
}

// ── Helpers ─────────────────────────────────────────────────────────
const formatPeriodo = (dtIni: string): string => {
  const [year, month] = dtIni.split('-');
  return `${month}/${year}`;
};

const getValor = (item: PisCofinsItemCredito, fonte: FonteValor): number =>
  fonte === 'efd' ? item.vlr_efd : item.saldo_periodo;

const upsertConta = (
  map: Map<string, ContaPeriodoValor>,
  item: PisCofinsItemCredito,
  periodo: string,
  valor: number,
) => {
  const key = item.cod_cta;
  if (!map.has(key)) {
    map.set(key, { cod_cta: item.cod_cta, descricao_conta: item.descricao_conta, valores: {} });
  }
  const entry = map.get(key)!;
  entry.valores[periodo] = (entry.valores[periodo] || 0) + valor;
};

// ── Main calculation ────────────────────────────────────────────────
const ALIQ_PIS = 0.0165;
const ALIQ_COFINS = 0.076;

export function calcularApuracao(
  periodos: PisCofsinPeriodo[],
  fonte: FonteValor,
): ApuracaoResult {
  // Sort periods chronologically
  const sorted = [...periodos].sort((a, b) => a.dt_ini.localeCompare(b.dt_ini));
  const periodLabels = sorted.map(p => formatPeriodo(p.dt_ini));

  const resumoMap = new Map<string, ContaPeriodoValor>();
  const debitosMap = new Map<string, ContaPeriodoValor>();
  const creditosMap = new Map<string, ContaPeriodoValor>();

  const totaisDebito: Record<string, number> = {};
  const totaisCredito: Record<string, number> = {};

  // ── Per-period aggregation ──
  const apuracaoMensal: ApuracaoMensal[] = [];
  let saldoAnteriorPis = 0;
  let saldoAnteriorCofins = 0;

  for (const p of sorted) {
    const periodo = formatPeriodo(p.dt_ini);
    let somaDebitos = 0;
    let somaExclusoes = 0;
    let somaCreditos = 0;

    for (const item of p.itens_credito) {
      const valor = getValor(item, fonte);

      // Resumo analítico — all items
      upsertConta(resumoMap, item, periodo, valor);

      // Débitos (CST 01-10)
      if (isDebito(item.cst_pis)) {
        upsertConta(debitosMap, item, periodo, valor);

        if (isExclusao(item.cst_pis)) {
          somaExclusoes += valor;
        } else {
          somaDebitos += valor;
        }
      }

      // Créditos (CST 50-69, aliq > 0)
      if (isCredito(item.cst_pis, item.aliq_pis)) {
        upsertConta(creditosMap, item, periodo, valor);
        somaCreditos += valor;
      }
    }

    const baseDebito = somaDebitos - somaExclusoes;
    const baseCredito = somaCreditos;

    totaisDebito[periodo] = baseDebito;
    totaisCredito[periodo] = baseCredito;

    const contribuicaoBrutaPis = baseDebito * ALIQ_PIS;
    const contribuicaoBrutaCofins = baseDebito * ALIQ_COFINS;
    const creditoMesPis = baseCredito * ALIQ_PIS;
    const creditoMesCofins = baseCredito * ALIQ_COFINS;

    const pisDevido = Math.max(0, contribuicaoBrutaPis - creditoMesPis - saldoAnteriorPis);
    const cofinsDevido = Math.max(0, contribuicaoBrutaCofins - creditoMesCofins - saldoAnteriorCofins);

    const novoSaldoPis =
      pisDevido === 0
        ? saldoAnteriorPis + creditoMesPis - contribuicaoBrutaPis
        : 0;
    const novoSaldoCofins =
      cofinsDevido === 0
        ? saldoAnteriorCofins + creditoMesCofins - contribuicaoBrutaCofins
        : 0;

    apuracaoMensal.push({
      periodo,
      baseDebito,
      baseCredito,
      contribuicaoBrutaPis,
      contribuicaoBrutaCofins,
      creditoMesPis,
      creditoMesCofins,
      creditoAnteriorPis: saldoAnteriorPis,
      creditoAnteriorCofins: saldoAnteriorCofins,
      pisDevido,
      cofinsDevido,
      saldoAcumuladoPis: novoSaldoPis,
      saldoAcumuladoCofins: novoSaldoCofins,
    });

    saldoAnteriorPis = novoSaldoPis;
    saldoAnteriorCofins = novoSaldoCofins;
  }

  return {
    periodos: periodLabels,
    resumoAnalitico: Array.from(resumoMap.values()),
    baseDebitos: Array.from(debitosMap.values()),
    baseCreditos: Array.from(creditosMap.values()),
    totaisDebito,
    totaisCredito,
    apuracaoMensal,
  };
}
