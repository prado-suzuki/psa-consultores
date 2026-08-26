// Orquestração dos seis passos do FLUXO (docs/osg/sucessao/Relatorios/
// FLUXO-calculo-itcmd.md §2). Entram os totais do acervo por cenário, o universo
// de quotas da sociedade e as quotas de cada donatário; sai o quadro por
// donatário × cenário.
//
// O que este módulo NÃO faz (SPEC §1 e spec 01 §2.5): não aplica fator de
// usufruto — a base é sempre integral —, não calcula Patrimônio Líquido
// Ajustado, não equaliza participação final, não deriva valor de mercado de
// produtividade por hectare, não lê banco e não conhece React.
//
// Fronteira pública em `string` decimal: `bigint` é detalhe interno (§2.3).

import {
  CENTAVO,
  divArredondado,
  formatMoney,
  parseInteiro,
  parseMoney,
  quantizar2,
  ZERO,
  type Money,
} from '@/lib/osg/itcmd/dinheiro';
import { upfDaCompetencia } from '@/lib/osg/itcmd/faixas';
import { devidoDoAto } from '@/lib/osg/itcmd/acumulacao';

export type Cenario = 'contabil' | 'itr' | 'mercado';

export const CENARIOS: readonly Cenario[] = ['contabil', 'itr', 'mercado'];

export const ROTULO_CENARIO: Record<Cenario, string> = {
  contabil: 'Valor contábil',
  itr: 'Valor de ITR',
  mercado: 'Valor de mercado',
};

export interface EntradaDonatario {
  donatarioId: string;
  nome: string;
  /** Quotas que este donatário recebe neste ato — inteiro, em string. */
  quotasRecebidas: string;
  /**
   * Base já recebida em doações anteriores, DECLARADA pelo analista. `null` =
   * nenhuma. Nunca derivada do quadro societário: ele é foto do estado, não
   * histórico, e deduzir dele conta duas vezes (SPEC §4 e negativo N5).
   */
  doacaoAnterior: string | null;
}

export interface EntradaSimulacao {
  /** Competência da UPF (`AAAA-MM`). A simulação guarda a UPF que usou (§3.1). */
  competencia: string;
  /** Universo de quotas da sociedade. */
  totalDeQuotas: string;
  /** Total do acervo em cada cenário. `null` = cenário sem valor informado. */
  totaisDoAcervo: Record<Cenario, string | null>;
  donatarios: EntradaDonatario[];
}

export interface ApuracaoDoCenario {
  base: string;
  imposto: string;
}

export interface LinhaDoDonatario {
  donatarioId: string;
  nome: string;
  quotasRecebidas: string;
  /** Participação em %, com 4 casas (ex.: "50.0000"). */
  percentual: string;
  doacaoAnterior: string | null;
  /** `null` no cenário sem valor informado — ausência não é zero. */
  porCenario: Record<Cenario, ApuracaoDoCenario | null>;
}

export interface SaidaSimulacao {
  competencia: string;
  upf: string;
  totalDeQuotas: string;
  linhas: LinhaDoDonatario[];
  /** Soma das bases dos donatários, por cenário. */
  basesPorCenario: Record<Cenario, string | null>;
  /**
   * Soma dos impostos JÁ ARREDONDADOS de cada donatário. É a convenção do §2.3:
   * arredondar por donatário e somar dá um centavo de diferença do somar-e-depois
   * arredondar do WP, e a convenção está escrita justamente por isso.
   */
  totaisPorCenario: Record<Cenario, string | null>;
  cenariosIndisponiveis: Cenario[];
}

export function simular(entrada: EntradaSimulacao): SaidaSimulacao {
  const upf = upfDaCompetencia(entrada.competencia);
  const totalDeQuotas = parseInteiro(entrada.totalDeQuotas);
  if (totalDeQuotas <= 0n) {
    throw new Error('O total de quotas da sociedade tem de ser positivo.');
  }

  const quotasPorDonatario = entrada.donatarios.map((d) => parseInteiro(d.quotasRecebidas));
  if (quotasPorDonatario.some((q) => q < 0n)) {
    throw new Error('Quotas recebidas negativas na simulação do ITCD.');
  }
  const quotasDistribuidas = quotasPorDonatario.reduce((acc, q) => acc + q, 0n);
  if (quotasDistribuidas > totalDeQuotas) {
    throw new Error(
      `As quotas distribuídas (${quotasDistribuidas}) passam do universo de quotas `
      + `da sociedade (${totalDeQuotas}).`,
    );
  }

  // Passo 1 já vem pronto na entrada: totalizar o acervo é leitura de cadastro,
  // não cálculo do motor. Cenário sem valor entra como `null` e sai como `null`.
  const totais = new Map<Cenario, Money | null>(
    CENARIOS.map((c) => {
      const bruto = entrada.totaisDoAcervo[c];
      return [c, bruto == null ? null : quantizar2(parseMoney(bruto))];
    }),
  );

  const linhas: LinhaDoDonatario[] = entrada.donatarios.map((d, i) => {
    const quotas = quotasPorDonatario[i];
    // Passo 5 — a doação anterior compõe a base acumulada do donatário.
    const anterior = d.doacaoAnterior == null
      ? ZERO
      : quantizar2(parseMoney(d.doacaoAnterior));
    if (anterior < 0n) {
      throw new Error(`Doação anterior negativa para ${d.nome}.`);
    }

    const porCenario = {} as Record<Cenario, ApuracaoDoCenario | null>;
    for (const cenario of CENARIOS) {
      const total = totais.get(cenario) ?? null;
      if (total === null) {
        porCenario[cenario] = null;
        continue;
      }
      // Passos 3 e 4 — percentual × total do cenário, quantizado a 2 casas
      // ANTES da fórmula. A formulação é por percentual, e não por valor de
      // quota: se a quota valer R$ 1,00 ou R$ 2,00 o imposto não muda (§5).
      const base = baseDoDonatario(total, quotas, totalDeQuotas);
      // Passo 6 — a tabela, com o arredondamento uma única vez.
      const imposto = quantizar2(devidoDoAto(anterior, base, upf));
      porCenario[cenario] = { base: formatMoney(base), imposto: formatMoney(imposto) };
    }

    return {
      donatarioId: d.donatarioId,
      nome: d.nome,
      quotasRecebidas: quotas.toString(),
      percentual: formatarPercentual(quotas, totalDeQuotas),
      doacaoAnterior: d.doacaoAnterior == null ? null : formatMoney(anterior),
      porCenario,
    };
  });

  const basesPorCenario = {} as Record<Cenario, string | null>;
  const totaisPorCenario = {} as Record<Cenario, string | null>;
  const cenariosIndisponiveis: Cenario[] = [];

  for (const cenario of CENARIOS) {
    if (totais.get(cenario) == null) {
      basesPorCenario[cenario] = null;
      totaisPorCenario[cenario] = null;
      cenariosIndisponiveis.push(cenario);
      continue;
    }
    let somaBases = ZERO;
    let somaImpostos = ZERO;
    for (const linha of linhas) {
      const apuracao = linha.porCenario[cenario];
      if (!apuracao) continue;
      somaBases += parseMoney(apuracao.base);
      somaImpostos += parseMoney(apuracao.imposto);
    }
    basesPorCenario[cenario] = formatMoney(somaBases);
    totaisPorCenario[cenario] = formatMoney(somaImpostos);
  }

  return {
    competencia: entrada.competencia,
    upf: formatMoney(upf),
    totalDeQuotas: totalDeQuotas.toString(),
    linhas,
    basesPorCenario,
    totaisPorCenario,
    cenariosIndisponiveis,
  };
}

/**
 * `base = (quotas ÷ total de quotas) × total do cenário`, arredondada meio para
 * cima direto na segunda casa. É esse arredondamento que reproduz o WP: no
 * cenário de ITR a base exata é 14.577.996,025 e a publicada é 14.577.996,03.
 */
function baseDoDonatario(totalDoCenario: Money, quotas: bigint, totalDeQuotas: bigint): Money {
  const centavos = divArredondado(totalDoCenario * quotas, totalDeQuotas * CENTAVO);
  return centavos * CENTAVO;
}

/** Participação em percentual, 4 casas, meio para cima. */
function formatarPercentual(quotas: bigint, totalDeQuotas: bigint): string {
  const escalado = divArredondado(quotas * 100n * 10_000n, totalDeQuotas);
  const inteiro = escalado / 10_000n;
  const fracao = (escalado % 10_000n).toString().padStart(4, '0');
  return `${inteiro}.${fracao}`;
}
