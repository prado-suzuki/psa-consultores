import {
  CENTAVO, divArredondado, formatMoney, parseMoney, quantizar2, type Money,
} from '@/lib/osg/itcmd/dinheiro';

/**
 * APORTE EM MOEDA CORRENTE — dinheiro que entra no capital e vira quotas.
 *
 * É UM CENÁRIO, e é o cenário que dispensa a reserva de usufruto: em vez de doar tudo
 * e guardar o voto, o fundador integraliza dinheiro, recebe quotas novas e chega ao
 * percentual que quer por PROPRIEDADE. Sai mais barato em imposto de usufruto porque
 * não há usufruto — e é isso que a apresentação precisa comparar lado a lado com os
 * cenários de reserva e de instituição.
 *
 * O APORTE NÃO É FATO GERADOR DE ITCD. Ninguém transmite nada: a pessoa entrega
 * dinheiro à sociedade e recebe quotas em troca. Ele muda o imposto do ato por via
 * indireta — o capital cresce, e com ele o denominador de todos os percentuais.
 *
 * ESTE MÓDULO É SÓ DO MOTOR. Ele não escreve no cadastro: o campo de moeda corrente do
 * capital social é outra frente, e enquanto ela não existe o aporte vive na simulação.
 *
 * `number` é proibido aqui, como em todo o motor: dinheiro e quota são `bigint`.
 */

/**
 * QUANTAS QUOTAS R$ `aporte` COMPRA.
 *
 * O preço da quota sai do próprio acervo — `acervo contábil ÷ total de quotas` —, e é o
 * acervo ANTES do aporte: é o valor que a quota tinha no momento em que o dinheiro
 * entrou. Usar o acervo já somado seria circular, e daria menos quotas do que o
 * dinheiro comprou.
 *
 * Nas holdings desta carteira a quota é de R$ 1,00 e a conta é a identidade — mas ela
 * não é assumida: capital com quota de outro valor converte certo.
 *
 * Sem acervo não há preço de quota, e aí o aporte não converte: devolve zero em vez de
 * dividir por zero ou inventar uma paridade.
 */
export function quotasDoAporte(
  aporte: Money,
  acervoContabil: Money,
  totalDeQuotas: bigint,
): bigint {
  if (aporte <= 0n || acervoContabil <= 0n || totalDeQuotas <= 0n) return 0n;
  return divArredondado(aporte * totalDeQuotas, acervoContabil);
}

/**
 * O TEXTO DIGITADO vira `Money`, e digitação incompleta vira zero em vez de erro.
 *
 * O campo é livre e o valor é derivado a cada tecla: "1.", "1,5" e "" precisam passar
 * sem quebrar a tela. Quem barra valor impossível é a trava, não o parser.
 */
export function aporteDigitado(texto: string): Money {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.');
  if (limpo === '' || !/^\d+(\.\d{0,2})?$/.test(limpo)) return 0n;
  // "1500," chega aqui como "1500.", que o `parseMoney` recusa — com razão, ele exige
  // decimal canônico. A vírgula solta é passo de digitação, não valor: vale 1500.
  return quantizar2(parseMoney(limpo.replace(/\.$/, '')));
}

/** Como o valor volta para o campo: em reais, com vírgula e milhar. */
export function aporteEmTexto(m: Money): string {
  if (m <= 0n) return '';
  const centavos = m / CENTAVO;
  const inteiro = (centavos / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${(centavos % 100n).toString().padStart(2, '0')}`;
}

/** Para gravar: decimal com duas casas e ponto, como o `numeric(18,2)` do banco. */
export const aporteParaBanco = (m: Money): string => formatMoney(quantizar2(m));
