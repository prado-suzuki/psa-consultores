// Rateio do ato: de duas listas para a matriz doador × donatário.
//
// A apuração é por par (uma GIA por par), mas o analista não preenche uma matriz —
// ele diz quanto cada doador transmite e quanto cada donatário recebe. Este módulo
// faz a ponte, e tem de preservar OS DOIS totais ao mesmo tempo:
//
//   soma da linha  = quotas que aquele doador transmite   (senão o quadro não fecha)
//   soma da coluna = quotas que aquele donatário recebe   (idem)
//
// A regra é PROPORCIONAL: cada doador contribui para cada donatário na proporção
// do que esse donatário leva do ato. É o que os atos reais fazem — nas quatro guias
// de dez/2025 os dois doadores dividiram meio a meio entre as duas donatárias, e no
// caso de 2026 os dois dividiram 25,91% / 74,09% igual.
//
// Proporcional puro cai em fração, e quota é inteira. O resto vai para as células de
// maior parte fracionária, respeitando o que falta em cada linha e em cada coluna —
// é o método do maior resto, aplicado nas duas dimensões. Sem isso os totais fecham
// numa direção e furam na outra, e um erro de uma quota aqui vira erro de faixa de
// alíquota quando a base fica na borda.
//
// Não é decisão fiscal e sim de repartição: se o ato realmente destinar bloco
// específico de um doador a um donatário, isso são dois atos e duas simulações.

export interface ParteDoRateio {
  id: string;
  quotas: bigint;
}

/**
 * Reparte `total` entre `pesos`, proporcionalmente, em inteiros que somam exato.
 * Maior resto primeiro; empate pela ordem, para ser determinístico.
 *
 * Serve para o caso em que os doadores transmitem MENOS do que têm — o que
 * acontece quando um herdeiro necessário fica fora do ato: a legítima dele não é
 * doável e permanece com o doador, então o bloco transmitido por cada um é a fatia
 * proporcional do que o ato movimenta, não o patrimônio inteiro.
 */
export function repartirProporcional(total: bigint, pesos: bigint[]): bigint[] {
  if (total < 0n) throw new Error('Total negativo na repartição proporcional.');
  if (pesos.some((p) => p < 0n)) throw new Error('Peso negativo na repartição proporcional.');

  const somaDosPesos = pesos.reduce((a, p) => a + p, 0n);
  if (somaDosPesos === 0n) {
    if (total > 0n) {
      throw new Error(
        `Não há como repartir ${total} quotas: todos os pesos são zero.`,
      );
    }
    return pesos.map(() => 0n);
  }

  const piso = pesos.map((p) => (total * p) / somaDosPesos);
  const restos = pesos
    .map((p, i) => ({ i, resto: (total * p) % somaDosPesos }))
    .sort((a, b) => (a.resto !== b.resto ? (b.resto > a.resto ? 1 : -1) : a.i - b.i));

  let falta = total - piso.reduce((a, q) => a + q, 0n);
  for (const { i } of restos) {
    if (falta === 0n) break;
    piso[i] += 1n;
    falta -= 1n;
  }
  return piso;
}

export interface CelulaDoRateio {
  doadorId: string;
  donatarioId: string;
  quotas: bigint;
}

/**
 * Matriz doador × donatário com somas de linha e de coluna exatas.
 *
 * Células com zero quota saem da lista: par que não transmite nada não é GIA.
 */
export function ratearAto(
  doadores: ParteDoRateio[],
  donatarios: ParteDoRateio[],
): CelulaDoRateio[] {
  if (doadores.some((d) => d.quotas < 0n) || donatarios.some((d) => d.quotas < 0n)) {
    throw new Error('Quotas negativas no rateio do ato.');
  }

  const totalDoado = doadores.reduce((acc, d) => acc + d.quotas, 0n);
  const totalRecebido = donatarios.reduce((acc, d) => acc + d.quotas, 0n);
  if (totalDoado !== totalRecebido) {
    throw new Error(
      `Rateio impossível: os doadores transmitem ${totalDoado} quotas e os donatários `
      + `levam ${totalRecebido}. Nada se cria nem se perde dentro do ato.`,
    );
  }
  if (totalDoado === 0n) return [];

  // Piso proporcional, guardando o resto de cada célula para desempatar depois.
  const quotas: bigint[][] = doadores.map(() => donatarios.map(() => 0n));
  const restos: { i: number; j: number; resto: bigint }[] = [];
  doadores.forEach((doa, i) => {
    donatarios.forEach((don, j) => {
      const exato = doa.quotas * don.quotas;
      quotas[i][j] = exato / totalDoado;
      restos.push({ i, j, resto: exato % totalDoado });
    });
  });

  // O que falta em cada linha e em cada coluna depois do piso.
  const faltaNaLinha = doadores.map(
    (doa, i) => doa.quotas - quotas[i].reduce((a, q) => a + q, 0n),
  );
  const faltaNaColuna = donatarios.map(
    (don, j) => don.quotas - doadores.reduce((a, _, i) => a + quotas[i][j], 0n),
  );
  let aDistribuir = faltaNaLinha.reduce((a, q) => a + q, 0n);

  // Maior resto primeiro; empate resolvido pela ordem das listas, para a mesma
  // entrada dar sempre a mesma matriz.
  restos.sort((a, b) => {
    if (a.resto !== b.resto) return b.resto > a.resto ? 1 : -1;
    return a.i - b.i || a.j - b.j;
  });

  // Cada volta acrescenta pelo menos uma quota: se ainda falta, existe linha e
  // existe coluna com falta, e a célula do cruzamento das duas está na lista.
  while (aDistribuir > 0n) {
    for (const { i, j } of restos) {
      if (aDistribuir === 0n) break;
      if (faltaNaLinha[i] > 0n && faltaNaColuna[j] > 0n) {
        quotas[i][j] += 1n;
        faltaNaLinha[i] -= 1n;
        faltaNaColuna[j] -= 1n;
        aDistribuir -= 1n;
      }
    }
  }

  const celulas: CelulaDoRateio[] = [];
  doadores.forEach((doa, i) => {
    donatarios.forEach((don, j) => {
      if (quotas[i][j] > 0n) {
        celulas.push({ doadorId: doa.id, donatarioId: don.id, quotas: quotas[i][j] });
      }
    });
  });
  return celulas;
}
