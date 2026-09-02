// Acumulação de doações sucessivas.
//
// A CHAVE DA ACUMULAÇÃO é o trio: MESMO DOADOR · MESMO BENEFICIÁRIO · MESMO ANO
// CIVIL. Base legal: Lei 10.488/2016, arts. 3º e 5º — desde 01/04/2017 todas as
// doações desse trio se acumulam para fins de progressividade. O simulador oficial
// da SEFAZ/MT declara a regra e cita os artigos, e a OSG confirmou.
//
// As três dimensões importam, e cada uma exclui:
//   · doador diferente     → apuração separada, uma por doador
//   · ano civil diferente  → apuração separada, uma por ano
//   · beneficiário diferente → sempre foi separado (o fato gerador é dele)
//
// Dentro do trio, a faixa sai da base ACUMULADA:
//
//   devido no ato i = f( soma das bases até i ) − f( soma das bases até i−1 )
//
// A consequência é a invariante do §7.2: a soma dos devidos de todos os atos é
// igual à apuração da base consolidada, qualquer que seja a ordem e o número de
// atos. Fracionar não economiza. Sem isso, 35 doações de R$ 127.100 dariam ZERO
// (cada uma abaixo dos 500 UPF) em vez de R$ 276.768,00.
//
// Legítima e parte disponível **não** são fatos geradores distintos: compõem uma
// base única por donatário no mesmo ato (decisão homologada nº 3).
//
// O QUE ESTE MÓDULO NÃO SABE: ele recebe a base anterior já apurada e não conhece
// doador nem data. Quem garante que a base entregue respeita o trio é quem chama —
// `simulacao.ts`, que apura UMA VEZ POR PAR doador × donatário e passa a doação
// anterior daquele par. Não há ambiguidade com dois doadores no mesmo ato: são duas
// guias, cada uma com o seu acumulado.
//
// A mecânica é a que o Manual da GIA ITCD-e Doação/Outros (SEFAZ/MT, 2025) descreve
// na pág. 8 — "o imposto é recalculado a cada nova doação... serão deduzidos os
// valores dos impostos já pagos" — e que o demonstrativo da pág. 21 mostra em
// números: ITCD 81.489,20 − ITCD anterior 70.285,00 = a recolher 11.204,20.

import { ZERO, type Money } from '@/lib/osg/itcmd/dinheiro';
import { impostoExato } from '@/lib/osg/itcmd/imposto';

export interface AtoAcumulado {
  /** Base do ato, isolada. */
  base: Money;
  /** Base acumulada até este ato, inclusive. */
  baseAcumulada: Money;
  /** Imposto devido NESTE ato: f(acumulada) − f(acumulada anterior). */
  devido: Money;
}

export interface ResultadoAcumulacao {
  atos: AtoAcumulado[];
  baseConsolidada: Money;
  /** Soma exata dos devidos — igual a f(baseConsolidada) pela invariante. */
  totalDevido: Money;
}

/** Devido de um ato sobre uma base já acumulada antes dele. */
export function devidoDoAto(baseAnterior: Money, baseDoAto: Money, upf: Money): Money {
  if (baseDoAto < 0n) {
    throw new Error(
      'Base de doação negativa na acumulação. A acumulação só soma: um ato '
      + 'não devolve base ao donatário.',
    );
  }
  if (baseAnterior < 0n) {
    throw new Error('Base acumulada anterior negativa na acumulação do ITCD.');
  }
  const devido = impostoExato(baseAnterior + baseDoAto, upf)
    - impostoExato(baseAnterior, upf);
  if (devido < 0n) {
    // Inalcançável enquanto f for monótona; a guarda existe para que uma
    // regressão na tabela apareça como erro, e não como crédito de imposto.
    throw new Error('Devido negativo na acumulação do ITCD: apuração inconsistente.');
  }
  return devido;
}

/**
 * Percorre os atos na ordem dada. A ordem muda o devido de cada ato, mas **não**
 * o total — é a invariante do §7.2.
 */
export function acumular(bases: Money[], upf: Money): ResultadoAcumulacao {
  let acumulada = ZERO;
  let total = ZERO;
  const atos: AtoAcumulado[] = [];

  for (const base of bases) {
    const devido = devidoDoAto(acumulada, base, upf);
    acumulada += base;
    total += devido;
    atos.push({ base, baseAcumulada: acumulada, devido });
  }

  return { atos, baseConsolidada: acumulada, totalDevido: total };
}
