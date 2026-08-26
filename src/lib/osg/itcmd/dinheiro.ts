// Aritmética do ITCD: `bigint` em escala fixa de 1e-4.
//
// A especificação (docs/osg/sucessao/Relatorios/SPEC-motor-itcmd-mt.md §2.3)
// proíbe float, e este projeto não tem biblioteca decimal — nem vai ganhar uma
// por conta de um motor de imposto. `bigint` nativo em escala fixa resolve, e
// resolve de forma EXATA por construção, não aproximada:
//
//   · a base por donatário é quantizada a 2 casas antes da fórmula;
//   · a alíquota é `n/100` (n inteiro), logo alíquota × base tem no máximo 4 casas;
//   · a dedução é `inteiro × UPF`, e a UPF tem 2 casas.
//
// Todo intermediário da fórmula cabe portanto em 1e-4, sem resto. É por isso que
// `imposto.ts` EXIGE base com 2 casas: é essa exigência que fecha a prova.
//
// Fronteira: quem chama de fora passa e recebe `string` decimal ("3324700.00").
// `Money` é detalhe interno; `number` para dinheiro não entra neste diretório.

/** Valor monetário em escala 1e-4 (1 centavo = 100n, 1 real = 10.000n). */
export type Money = bigint;

/** Unidades internas por real. */
export const ESCALA = 10_000n;

/** Unidades internas por centavo — o passo de `quantizar2`. */
export const CENTAVO = 100n;

export const ZERO: Money = 0n;

// Sem separador de milhar, sem vírgula, sem notação exponencial, sem espaço no
// meio: a fronteira é uma string decimal canônica. Aceitar "1,00" ou "1e5" aqui
// seria adivinhar a intenção de quem chamou.
const DECIMAL_CANONICO = /^-?\d+(\.\d{1,4})?$/;

/**
 * "3324700.00" → 33247000000n. Recusa o que não for decimal canônico com até 4
 * casas: string malformada é erro, não zero (ver "sem fallback silencioso" no
 * AGENTS.md).
 */
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

/**
 * Arredonda a 2 casas, **meio para cima**. Para valor positivo é literalmente o
 * "meio para cima" da especificação; para negativo o meio se afasta do zero, de
 * modo que o arredondamento seja simétrico. No motor valor negativo não chega
 * aqui: `imposto.ts` lança erro antes (§2.3 — "imposto negativo é erro").
 */
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

/**
 * Divisão com arredondamento meio para cima, em inteiros — usada onde a razão
 * não é exata (percentual do donatário vezes o total do cenário). Fica aqui, e
 * não repetida em cada módulo, porque é o único ponto do motor em que uma
 * divisão pode deixar resto.
 */
export function divArredondado(numerador: bigint, denominador: bigint): bigint {
  if (denominador === 0n) throw new Error('Divisão por zero na apuração do ITCD.');
  const den = denominador < 0n ? -denominador : denominador;
  const num = denominador < 0n ? -numerador : numerador;
  if (num >= 0n) return (2n * num + den) / (2n * den);
  return -((2n * -num + den) / (2n * den));
}

/** Inteiro sem casas decimais (quotas). Recusa o que não for inteiro. */
export function parseInteiro(s: string): bigint {
  const texto = typeof s === 'string' ? s.trim() : '';
  if (!/^-?\d+$/.test(texto)) {
    throw new Error(`Quantidade inteira inválida: ${JSON.stringify(s)}.`);
  }
  return BigInt(texto);
}
