/**
 * O PERCENTUAL ENQUANTO SE DIGITA — máscara, não validação.
 *
 * O campo aceitava o que se digitasse e só interpretava no fim: `5555` era lido como
 * cinco mil quinhentos e cinquenta e cinco por cento, o teto de 100% aparava, e o campo
 * mostrava 100%. O número que se queria — 55,55 — não era alcançável digitando quatro
 * dígitos, e nada na tela dizia o que tinha acontecido.
 *
 * Nada é REJEITADO aqui: a vírgula entra sozinha, no lugar onde ela cabe.
 *
 * ONDE A VÍRGULA CABE é a única decisão do arquivo. A parte inteira leva o MAIOR
 * PREFIXO QUE NÃO PASSA DE 100, porque é percentual de capital e 100 é o limite físico
 * — mais que isso não é alvo, é dígito que transbordou. O dígito que transbordaria abre
 * as decimais:
 *
 *     5555   →  55,55        (o terceiro 5 faria 555: transbordou)
 *     51     →  51
 *     245    →  24,5
 *     100    →  100          (cabe inteiro: é o limite, não passa dele)
 *     1234   →  12,34
 *
 * Vírgula digitada MANDA: quem escreve `5,5` quer 5,5, e não 55. É o escape para os
 * valores de um dígito, que a regra do prefixo levaria para a parte inteira.
 *
 * Quatro casas decimais porque é a precisão em que a apuração trabalha — participação
 * de 33,3333% de um capital de nove milhões de quotas não fecha com duas.
 */

const soDigitos = (t: string) => t.replace(/\D/g, '');

/** `05` é `5`; `0` continua `0`, que é um valor. */
const semZeroAEsquerda = (d: string) => d.replace(/^0+(?=\d)/, '');

/** Quantos dígitos cabem na parte inteira sem passar de 100. */
function corteDoInteiro(digitos: string): number {
  let corte = 0;
  while (corte < digitos.length && corte < 3) {
    if (Number(digitos.slice(0, corte + 1)) > 100) break;
    corte += 1;
  }
  // O primeiro dígito é sempre da parte inteira: `0` é zero vírgula alguma coisa.
  return corte === 0 ? 1 : corte;
}

/**
 * A CONTA QUE O CAMPO ENTENDE — `/2`, `/3`, `53,4576/2`.
 *
 * Existe por causa de igualar participações num ato que não fecha em 100%. Quando duas
 * irmãs doam entre si e o ato movimenta 53,4576% do capital, "as duas iguais" é
 * 26,7288% para cada, e esse número não se acha de cabeça. Digitar `/2` no campo diz o
 * que se quer sem que ninguém faça a divisão: uma fatia igual, o ato partido em duas.
 *
 * Sem dividendo (`/2`), quem divide é O ATO. Com dividendo (`53,4576/2`), divide-se o
 * número escrito, na régua do campo em que ele está.
 *
 * Não é botão: é o campo entendendo o que se escreveria numa planilha. E o divisor tem
 * no máximo duas casas porque irmão não passa de 99.
 */
export function divisaoNoCampo(texto: string): { esquerda: string; partes: number } | null {
  const m = /^([^/]*)\/(\d{1,2})$/.exec(texto.trim());
  if (m == null) return null;
  const partes = Number(m[2]);
  // Dividir em uma parte é não dividir; em zero não existe. Nos dois casos o texto
  // fica no campo e nada se resolve, que é o que acontece enquanto se digita `/`.
  if (partes < 2) return null;
  return { esquerda: m[1] ?? '', partes };
}

/**
 * A FATIA IGUAL de um total, meio para cima e em `bigint`.
 *
 * A divisão é de QUOTA INTEIRA, e é o que torna a igualdade exata: pelo percentual, com
 * quatro casas sobre nove milhões de quotas, uma casa vale ~956 quotas, e duas linhas
 * que leem o mesmo percentual podem ficar com quotas diferentes. O instrumento declara
 * quota, não percentual.
 */
export function fatiaIgual(total: bigint, partes: number): bigint {
  const n = BigInt(partes);
  return (total * 2n + n) / (2n * n);
}

/** O texto que o campo mostra a cada tecla. */
export function mascararPercentual(texto: string): string {
  const bruto = texto.trim();

  // A CONTA PASSA COMO ESTÁ: `/2` é ordem, não número. A máscara vale para o lado
  // esquerdo, e o divisor entra como dígito puro — senão a vírgula automática cairia
  // dentro do divisor no instante em que ele passasse de dois dígitos.
  const barra = bruto.indexOf('/');
  if (barra >= 0) {
    const divisor = soDigitos(bruto.slice(barra + 1)).slice(0, 2);
    return `${mascararPercentual(bruto.slice(0, barra))}/${divisor}`;
  }

  // Separador digitado: ele fecha a parte inteira exatamente ali.
  if (/[.,]/.test(bruto)) {
    const [antes = '', ...resto] = bruto.split(/[.,]/);
    const inteiro = semZeroAEsquerda(soDigitos(antes).slice(0, 3));
    const decimais = soDigitos(resto.join('')).slice(0, 4);
    return `${inteiro === '' ? '0' : inteiro},${decimais}`;
  }

  const digitos = semZeroAEsquerda(soDigitos(bruto));
  if (digitos === '') return '';
  const corte = corteDoInteiro(digitos);
  const decimais = digitos.slice(corte, corte + 4);
  const inteiro = digitos.slice(0, corte);
  return decimais === '' ? inteiro : `${inteiro},${decimais}`;
}

/**
 * O valor do texto mascarado, em bigint na escala de 1e-4 — a mesma da apuração.
 *
 * `null` quando não há dígito nenhum: campo vazio não é zero por cento, é campo vazio,
 * e quem chama decide o que fazer com isso.
 */
export function percentualEscalado(texto: string): bigint | null {
  const [inteiro = '', decimais = ''] = texto.split(',');
  const i = soDigitos(inteiro);
  const d = soDigitos(decimais);
  if (i === '' && d === '') return null;
  return BigInt((i === '' ? '0' : i) + d.slice(0, 4).padEnd(4, '0'));
}
