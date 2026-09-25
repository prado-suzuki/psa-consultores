// Cópia da lei do ITCMD para o capítulo 04, porque a Edge Function não alcança o `src/`.
// `src/lib/osg/cenariosDoCapitulo04.test.ts` falha se ela divergir da calculadora.

// ---------------------------------------------------------------------------
// Dinheiro — cópia de `src/lib/osg/itcmd/dinheiro.ts`
// ---------------------------------------------------------------------------

/** Valor monetário em escala 1e-4 (1 centavo = 100n, 1 real = 10.000n). */
export type Money = bigint;

/** Unidades internas por real. */
export const ESCALA = 10_000n;

/** Unidades internas por centavo — o passo de `quantizar2`. */
export const CENTAVO = 100n;

export const ZERO: Money = 0n;

// Só decimal canônico: aceitar "1,00" ou "1e5" seria adivinhar a intenção de quem chamou.
const DECIMAL_CANONICO = /^-?\d+(\.\d{1,4})?$/;

/** "3324700.00" → 33247000000n. Fora do decimal canônico (até 4 casas) é erro, não zero. */
export function parseMoney(s: string): Money {
  const texto = typeof s === 'string' ? s.trim() : '';
  if (!DECIMAL_CANONICO.test(texto)) {
    throw new Error(
      `Valor monetário inválido: ${JSON.stringify(s)}. `
      + 'Esperado decimal com ponto e até 4 casas (ex.: "3324700.00").',
    );
  }
  const negativo = texto.startsWith('-');
  const semSinal = negativo ? texto.slice(1) : texto;
  const [inteiro, decimais = ''] = semSinal.split('.');
  const casas = decimais.padEnd(4, '0');
  const magnitude = BigInt(inteiro) * ESCALA + BigInt(casas);
  return negativo ? -magnitude : magnitude;
}

/** Arredonda a 2 casas, meio para cima; no negativo o meio se afasta do zero, simétrico. */
export function quantizar2(m: Money): Money {
  const resto = m % CENTAVO;
  if (resto === 0n) return m;
  if (m > 0n) {
    return m - resto + (resto * 2n >= CENTAVO ? CENTAVO : 0n);
  }
  const magnitude = -resto;
  return m - resto - (magnitude * 2n >= CENTAVO ? CENTAVO : 0n);
}

/** Formata com 2 casas e ponto decimal, arredondando meio para cima. */
export function formatMoney(m: Money): string {
  const centavos = quantizar2(m) / CENTAVO;
  const negativo = centavos < 0n;
  const magnitude = negativo ? -centavos : centavos;
  const inteiro = magnitude / 100n;
  const fracao = (magnitude % 100n).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}${inteiro}.${fracao}`;
}

/** Divisão inteira com arredondamento meio para cima, para razão que não é exata. */
export function divArredondado(numerador: bigint, denominador: bigint): bigint {
  if (denominador === 0n) throw new Error('Divisão por zero na apuração do ITCD.');
  const den = denominador < 0n ? -denominador : denominador;
  const num = denominador < 0n ? -numerador : numerador;
  if (num >= 0n) return (2n * num + den) / (2n * den);
  return -((2n * -num + den) / (2n * den));
}

// ---------------------------------------------------------------------------
// As faixas da lei — cópia de `src/lib/osg/itcmd/faixas.ts`
// ---------------------------------------------------------------------------

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

/** Teto da faixa em reais, na competência dada. `null` na faixa sem teto. */
export function tetoDaFaixa(faixa: Faixa, upf: Money): Money | null {
  return faixa.limiteUpf === null ? null : faixa.limiteUpf * upf;
}

// ---------------------------------------------------------------------------
// O imposto de uma guia, aberto faixa a faixa
// ---------------------------------------------------------------------------

// O imposto gravado de uma guia, aberto faixa a faixa para o quadro da instituição: não reapura.
// Se a soma não fechar com o gravado, quem chama avisa.

/**
 * O imposto de cada faixa, exato (escala 1e-4): alíquota × a parte da base entre os tetos. A soma é a
 * forma fechada, porque a dedução de cada faixa é o que as de baixo deixam de cobrar.
 */
export function aberturaExata(base: Money, upf: Money): Money[] {
  if (base % CENTAVO !== 0n) {
    throw new Error('A base da guia tem de ter duas casas para abrir por faixa.');
  }
  let piso = ZERO;
  return FAIXAS.map((faixa) => {
    const teto = tetoDaFaixa(faixa, upf);
    const topo = teto === null || base < teto ? base : teto;
    const parte = topo > piso ? topo - piso : ZERO;
    if (teto !== null) piso = teto;
    return (faixa.aliquotaPercentual * parte) / 100n;
  });
}

export interface AberturaDaGuia {
  /** Cinco valores em centavos (escala 1e-4, múltiplos de 100), somando `total`. */
  faixas: Money[];
  /** O imposto GRAVADO da guia. */
  total: Money;
  /** A lei, com a base gravada, dá o imposto gravado? `false` pede aviso na apresentação. */
  fecha: boolean;
}

/**
 * Abre o imposto gravado em centavos, fechando a soma nele: o centavo que sobra vai para a faixa de
 * maior resto.
 */
export function aberturaDoImposto(base: Money, upf: Money, impostoGravado: Money): AberturaDaGuia {
  const exatas = aberturaExata(base, upf);
  const total = quantizar2(impostoGravado);
  const fecha = quantizar2(exatas.reduce((a, v) => a + v, ZERO)) === total;

  const pisos = exatas.map((v) => v - (v % CENTAVO));
  const faltam = (total - pisos.reduce((a, v) => a + v, ZERO)) / CENTAVO;
  const comValor = exatas.filter((v) => v > ZERO).length;

  if (!fecha || faltam < 0n || faltam > BigInt(comValor)) {
    // Não fecha: cada faixa arredonda sozinha, e o `fecha: false` diz o resto.
    return { faixas: exatas.map(quantizar2), total, fecha: false };
  }

  const porResto = exatas
    .map((v, i) => ({ i, resto: v % CENTAVO }))
    .filter((x) => x.resto > ZERO)
    .sort((a, b) => (b.resto > a.resto ? 1 : b.resto < a.resto ? -1 : a.i - b.i));
  const faixas = [...pisos];
  for (let n = 0n; n < faltam; n++) faixas[porResto[Number(n)].i] += CENTAVO;
  return { faixas, total, fecha: true };
}
