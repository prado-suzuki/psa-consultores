// Legítima e parte disponível, em QUOTAS (inteiros).
//
// Código Civil, art. 1.846: a legítima é metade do patrimônio de CADA doador,
// dividida entre os herdeiros necessários (SPEC §6.1):
//
//   legítima_por_herdeiro = Σ  teto( patrimônio_do_doador ÷ 2 ÷ n_herdeiros )
//                        doadores
//
// O teto é ao inteiro, **por doador e por herdeiro**, e a disponível absorve a
// diferença. Arredondar a legítima para cima é a direção segura: ela não pode
// ser menor que a metade.
//
// Somar os patrimônios antes de dividir dá OUTRO número — 1.831.719 contra os
// 1.831.720 publicados no Santa Terezinha (SPEC §6.2). A regra por doador é a
// que reproduz os seis valores publicados nos dois clientes.
//
// O que este módulo NÃO faz: não decide quem é herdeiro necessário (o art. 1.829
// é confirmação do analista, SPEC §4) e não escolhe o destino da disponível —
// ela é ENTRADA, não saída (§6.3). Também não classifica doação por ordem: o
// motor lê o rótulo, que nos instrumentos da OSG é a declaração expressa dos
// arts. 2.005/2.006 (§6.4).

export interface PatrimonioDoDoador {
  doadorId: string;
  /** Quotas do doador na sociedade — inteiro, nunca fracionado. */
  quotas: bigint;
}

export interface LegitimaDoDoador extends PatrimonioDoDoador {
  /** teto(quotas ÷ 2 ÷ n_herdeiros) — a parcela deste doador na legítima. */
  legitimaPorHerdeiro: bigint;
}

export interface Distribuicao {
  porDoador: LegitimaDoDoador[];
  /** Σ das parcelas por doador. */
  legitimaPorHerdeiro: bigint;
  legitimaTotal: bigint;
  /**
   * Quantos herdeiros necessários EXISTEM. É o divisor da legítima, e não tem
   * relação com quantos recebem no ato — ver `tetoDoAto`.
   */
  numeroDeHerdeiros: number;
  patrimonioDoado: bigint;
  /**
   * patrimônio − legítima total. Pode ficar NEGATIVA num caso degenerado (poucas
   * quotas para muitos herdeiros), porque o teto por herdeiro arredonda para
   * cima. Sai como é: truncar em zero esconderia que não há disponível.
   */
  disponivelTotal: bigint;
}

/** Divisão inteira arredondando para CIMA (teto), para numerador não negativo. */
const teto = (numerador: bigint, denominador: bigint): bigint =>
  (numerador + denominador - 1n) / denominador;

export function calcularLegitima(
  doadores: PatrimonioDoDoador[],
  numeroDeHerdeiros: number,
): Distribuicao {
  if (!Number.isInteger(numeroDeHerdeiros) || numeroDeHerdeiros <= 0) {
    throw new Error(
      `Número de herdeiros necessários inválido: ${numeroDeHerdeiros}. `
      + 'A legítima é dividida entre eles e exige pelo menos um.',
    );
  }
  if (doadores.some((d) => d.quotas < 0n)) {
    throw new Error('Patrimônio de doador negativo na apuração da legítima.');
  }

  const n = BigInt(numeroDeHerdeiros);
  const porDoador = doadores.map((d) => ({
    ...d,
    legitimaPorHerdeiro: teto(d.quotas, 2n * n),
  }));

  const legitimaPorHerdeiro = porDoador.reduce((acc, d) => acc + d.legitimaPorHerdeiro, 0n);
  const patrimonioDoado = doadores.reduce((acc, d) => acc + d.quotas, 0n);
  const legitimaTotal = legitimaPorHerdeiro * n;

  return {
    porDoador,
    legitimaPorHerdeiro,
    legitimaTotal,
    numeroDeHerdeiros,
    patrimonioDoado,
    disponivelTotal: patrimonioDoado - legitimaTotal,
  };
}

/**
 * Quanto se pode doar NESTE ato, dado quantos dos herdeiros são donatários dele.
 *
 *   teto = legítima_por_herdeiro × herdeiros_que_recebem  +  disponível_total
 *
 * É a trava que impede dar tudo a um só herdeiro. O divisor da legítima é o número
 * de herdeiros que EXISTEM, não o de quem recebe: com dois filhos, cada um tem
 * metade da legítima, e a metade do que não participa **não vira disponível** —
 * ela simplesmente fica com o doador. Dividir pelos selecionados dobraria a
 * legítima de quem sobrou e deixaria doar o acervo inteiro a um filho.
 *
 * Exemplo, patrimônio 4.448.500 e dois filhos:
 *   legítima por herdeiro    1.112.125     disponível  2.224.250
 *   os dois recebem  →  teto  4.448.500    (tudo, e é o caso real da GIA 337978)
 *   só um recebe     →  teto  3.336.375    (a legítima do outro não é doável)
 */
export function tetoDoAto(
  distribuicao: Distribuicao,
  herdeirosQueRecebem: number,
): bigint {
  if (!Number.isInteger(herdeirosQueRecebem) || herdeirosQueRecebem < 0) {
    throw new Error(
      `Número de herdeiros donatários inválido: ${herdeirosQueRecebem}.`,
    );
  }
  if (herdeirosQueRecebem > distribuicao.numeroDeHerdeiros) {
    throw new Error(
      `${herdeirosQueRecebem} donatários herdeiros, mas só existem `
      + `${distribuicao.numeroDeHerdeiros} herdeiros necessários. `
      + 'A legítima não pode ser dividida por menos gente do que a recebe.',
    );
  }
  const legitimaDoAto = distribuicao.legitimaPorHerdeiro * BigInt(herdeirosQueRecebem);
  const disponivel = distribuicao.disponivelTotal > 0n ? distribuicao.disponivelTotal : 0n;
  return legitimaDoAto + disponivel;
}
