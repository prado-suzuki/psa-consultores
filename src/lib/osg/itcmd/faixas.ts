// Tabela de faixas do ITCD/MT (doação) e série mensal da UPF.
//
// Lei 7.850/02, art. 19: os limites das faixas são MÚLTIPLOS DA UPF, não valores
// fixos — a tabela se move todo mês. A dedução de cada faixa é exatamente o que
// as faixas inferiores deixariam de cobrar, e é ela que faz a forma fechada
// (`imposto.ts`) coincidir com a soma faixa a faixa.
//
// Fonte: docs/osg/sucessao/Relatorios/SPEC-motor-itcmd-mt.md §2.1 e §3.2.

import { parseMoney, type Money } from '@/lib/osg/itcmd/dinheiro';

export interface Faixa {
  ordem: 1 | 2 | 3 | 4 | 5;
  /** Teto da faixa em UPF. `null` na última, que não tem teto. */
  limiteUpf: bigint | null;
  /** Numerador de `n/100`: 0, 2, 4, 6 ou 8. */
  aliquotaPercentual: bigint;
  /** Dedução em UPF: 0, 10, 30, 110 ou 310. */
  deducaoUpf: bigint;
  rotulo: string;
}

export const FAIXAS: readonly Faixa[] = [
  { ordem: 1, limiteUpf: 500n, aliquotaPercentual: 0n, deducaoUpf: 0n, rotulo: 'Isento (até 500 UPF)' },
  { ordem: 2, limiteUpf: 1_000n, aliquotaPercentual: 2n, deducaoUpf: 10n, rotulo: '2% (até 1.000 UPF)' },
  { ordem: 3, limiteUpf: 4_000n, aliquotaPercentual: 4n, deducaoUpf: 30n, rotulo: '4% (até 4.000 UPF)' },
  { ordem: 4, limiteUpf: 10_000n, aliquotaPercentual: 6n, deducaoUpf: 110n, rotulo: '6% (até 10.000 UPF)' },
  { ordem: 5, limiteUpf: null, aliquotaPercentual: 8n, deducaoUpf: 310n, rotulo: '8% (acima de 10.000 UPF)' },
];

/**
 * Série mensal publicada. **Não extrapolar**: entre março e maio de 2026 o passo
 * quadruplica, e projetar a média daria R$ 737,80 de erro por donatário em base
 * acima de 10.000 UPF. Competência ausente é erro, não estimativa.
 *
 * A série vive aqui, e não no banco, porque não há tabela de UPF em lugar nenhum
 * (CADASTRO-para-calculadora.md §2): onde ela vai morar é decisão de modelagem
 * ainda aberta (§3.3 do mesmo documento).
 */
export const COMPETENCIAS_UPF: ReadonlyArray<{ competencia: string; upf: string }> = [
  { competencia: '2026-01', upf: '254.36' },
  { competencia: '2026-02', upf: '255.20' },
  { competencia: '2026-03', upf: '256.04' },
  { competencia: '2026-05', upf: '260.10' },
  { competencia: '2026-08', upf: '263.78' },
];

/** Competências disponíveis, da mais recente para a mais antiga. */
export function competenciasDisponiveis(): string[] {
  return COMPETENCIAS_UPF.map((c) => c.competencia).slice().reverse();
}

/**
 * UPF conhecida da competência, como SUGESTÃO para a tela preencher o campo.
 * `null` quando não há — e aí o analista digita, que é o caminho normal.
 *
 * O valor que a apuração usa é sempre o que está no campo, nunca esta série: a
 * UPF é publicada todo mês pela SEFAZ/MT e lista embutida em código envelhece.
 * A série fica só para poupar digitação nos meses já conhecidos e para os testes
 * de referência conferirem contra guias reais.
 */
export function upfSugerida(competencia: string): string | null {
  return COMPETENCIAS_UPF.find((c) => c.competencia === competencia)?.upf ?? null;
}

/** UPF da competência (`AAAA-MM`). Competência fora da série lança erro. */
export function upfDaCompetencia(competencia: string): Money {
  const linha = COMPETENCIAS_UPF.find((c) => c.competencia === competencia);
  if (!linha) {
    throw new Error(
      `Não há UPF publicada para a competência ${JSON.stringify(competencia)}. `
      + `A série não é linear e não pode ser extrapolada; competências disponíveis: `
      + `${COMPETENCIAS_UPF.map((c) => c.competencia).join(', ')}.`,
    );
  }
  return parseMoney(linha.upf);
}

/** Teto da faixa em reais, na competência dada. `null` na faixa sem teto. */
export function tetoDaFaixa(faixa: Faixa, upf: Money): Money | null {
  return faixa.limiteUpf === null ? null : faixa.limiteUpf * upf;
}

/**
 * Primeira faixa em que `base <= limite × upf`. Base IGUAL ao teto pertence à
 * faixa **de baixo** (SPEC §2.3) — é o `<=` que garante isso.
 */
export function faixaDaBase(base: Money, upf: Money): Faixa {
  for (const faixa of FAIXAS) {
    const teto = tetoDaFaixa(faixa, upf);
    if (teto === null || base <= teto) return faixa;
  }
  // Inalcançável: a última faixa tem `limiteUpf` nulo.
  throw new Error('Tabela de faixas sem faixa final.');
}
