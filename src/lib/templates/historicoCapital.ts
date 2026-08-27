export interface SnapshotComCapital {
  selecao?: Record<string, Record<string, string>>;
}

export interface HistoricoCapital {
  capitalAnterior: number | null;
  capitalDelta: number | null;
}

/** Converte o valor monetário congelado no snapshot (pt-BR) de volta para número. */
export function numeroDeValorBR(valor: string | undefined): number | null {
  if (!valor) return null;
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Recupera o capital que valeu no documento substituído e calcula o aumento.
 * O binding costuma se chamar `sociedade`, mas a busca pelo campo mantém o
 * snapshot legível caso o autor tenha dado outro nome ao mesmo papel.
 */
export function calcularHistoricoCapital(
  capitalAtual: number | null,
  snapshot: SnapshotComCapital | null | undefined,
): HistoricoCapital {
  const selecao = snapshot?.selecao ?? {};
  const sociedade = selecao.sociedade
    ?? Object.values(selecao).find((campos) => typeof campos.capitalValor === 'string');
  const capitalAnterior = numeroDeValorBR(sociedade?.capitalValor);

  return {
    capitalAnterior,
    capitalDelta: capitalAtual != null && capitalAnterior != null
      ? capitalAtual - capitalAnterior
      : null,
  };
}
