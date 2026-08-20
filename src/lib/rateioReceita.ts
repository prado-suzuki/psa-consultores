// A conta do rateio de receita da OS, em função pura.
//
// A regra "a soma precisa fechar 100%" vivia inline no `RateioLista`, que é o
// componente de EDIÇÃO. Quando a aba de Faturamento passou a exibir o mesmo
// rateio em leitura, a alternativa era repetir a conta e a tolerância em dois
// lugares — e duas cópias divergem no dia em que alguém mudar a tolerância.
//
// Medido em produção em 18/08/2026: de 88 OS com rateio, 85 fecham 100% e 3 não.
// Ou seja, o caso de não fechar é real e a tela precisa mostrá-lo, não esconder.

/** Uma linha de rateio, do jeito que o rascunho da OS guarda. */
export interface LinhaRateio {
  percentual_rateio: number;
}

export interface ResumoRateio {
  /** Soma dos percentuais. */
  total: number;
  /** Fecha 100% dentro da tolerância. */
  fecha: boolean;
  /** Quanto falta para 100, ou `0` quando fecha ou excede. */
  faltam: number;
  /** Quanto passou de 100, ou `0` quando fecha ou falta. */
  excede: number;
  vazio: boolean;
}

/**
 * Tolerância de um centésimo, herdada do `RateioLista` sem mudar de valor.
 *
 * Ela existe para RUÍDO DE PONTO FLUTUANTE, não para perdoar centavo faltando.
 * Três linhas de 33,33 somam 99,99 de verdade, e 99,99 não é 100: esse rateio
 * segue pendente, e o certo é uma das linhas levar 33,34. Conferido que a
 * diferença ali dá 0,010000000000005 e por isso fica de fora da folga, o que é o
 * comportamento correto e não um defeito de arredondamento.
 *
 * Não mexer neste número sem decidir junto o efeito no SALVAMENTO: a mesma regra
 * decide se a OS pode ser gravada.
 */
export const TOLERANCIA_RATEIO = 0.01;

/** Soma, veredito e a diferença — tudo o que as duas telas precisam mostrar. */
export function resumoRateio(linhas: readonly LinhaRateio[] | null | undefined): ResumoRateio {
  const lista = linhas ?? [];
  const total = lista.reduce((acc, r) => acc + (r.percentual_rateio || 0), 0);
  const fecha = Math.abs(total - 100) <= TOLERANCIA_RATEIO;

  return {
    total,
    fecha,
    faltam: !fecha && total < 100 ? 100 - total : 0,
    excede: !fecha && total > 100 ? total - 100 : 0,
    vazio: lista.length === 0,
  };
}

/**
 * Percentual como texto curto: sem casas quando é inteiro, duas quando precisa.
 *
 * Existe para 60 aparecer como "60" e não "60,00", que é como o financeiro
 * escreve, mantendo as casas quando o valor realmente as tem.
 */
export function formatarPercentual(valor: number): string {
  return valor.toFixed(2).replace(/\.?0+$/, '');
}
