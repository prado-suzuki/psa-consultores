// Acumulação por donatário.
//
// O fato gerador é POR DONATÁRIO e a faixa sai da base ACUMULADA, somando as
// doações anteriores recebidas pela mesma pessoa (SPEC §7.1):
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
// Procedência: esta regra vem de relato da OSG sobre o comportamento do sistema
// da SEFAZ, sem documento do fisco que a confirme (SPEC §7.4). Peso diferente da
// forma fechada, que foi conferida contra guia real.

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
