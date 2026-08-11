// Aritmética do capital social: o ÚNICO lugar que decide quantas quotas um valor
// vale e quanto valem N quotas. Antes disso, "quota de R$ 1,00" era constante
// implícita espalhada por comentários e por `Math.round(capital)`, e o capital
// era o somatório cru dos valores contábeis — daí a cláusula quinta afirmar
// R$ 558.413,55 divididos em 558.414 quotas de R$ 1,00 (quarenta e cinco
// centavos a mais nas quotas do que no capital).
//
// A regra da casa, decidida com o time (ver docs/sprints/sprint-11, B6): o
// CAPITAL SEGUE AS QUOTAS. A quota é indivisível, o capital do contrato é o
// valor inteiro correspondente às quotas emitidas, e a diferença de centavos tem
// destino declarado — o valor integralizado de cada sócio é ajustado para
// fechar com as quotas dele, em vez de sumir.
//
// As duas identidades que todo consumidor pode assumir:
//
//   Σ quotas dos sócios === totalQuotas
//   totalQuotas × VALOR_NOMINAL_QUOTA === capitalValor
//
// Toda conta roda em CENTAVOS (inteiros): 3 × 0,01 em ponto flutuante é
// 0,030000000000000002, e o campo que o cartório confere não pode depender disso.

/**
 * Valor nominal da quota, em reais. Parâmetro da sociedade, não constante
 * implícita: quem quiser mudá-lo mexe AQUI e em nenhum outro lugar (o valor
 * também é publicado no binding, em {{ sociedade.quotaValorNominal }}, para o
 * bloco imprimir em vez de escrever "R$ 1,00 (um real)" à mão).
 *
 * Quota fracionada (R$ 0,01) e valor nominal por sociedade foram avaliados e
 * descartados: o primeiro produz números de quotas ilegíveis no contrato, o
 * segundo exige campo de cadastro que a Junta não pede.
 */
export const VALOR_NOMINAL_QUOTA = 1;

/** O nominal em centavos — toda a conta é inteira. */
const NOMINAL_CENT = Math.round(VALOR_NOMINAL_QUOTA * 100);

/** Reais → centavos, sem o resíduo binário de `valor * 100`. */
export function emCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Quantas quotas um valor em reais compra, ao valor nominal da casa.
 * Arredondamento comercial (não `floor`): o desvio máximo é meia quota, para
 * cima ou para baixo, e é ele que o ajuste do valor integralizado absorve.
 */
export function quotasDeValor(reais: number): number {
  return Math.round(emCentavos(reais) / NOMINAL_CENT);
}

/** Quanto valem N quotas, em reais — a definição do capital do contrato. */
export function capitalDeQuotas(quotas: number): number {
  return (Math.round(quotas) * NOMINAL_CENT) / 100;
}

/**
 * As quotas de um sócio do quadro societário: as digitadas quando existem, ou o
 * que o valor lançado compra quando só há valor. `null` quando não há nem um nem
 * outro.
 *
 * O quadro MISTO (um sócio com quotas, outro só com valor) é o caso que a conta
 * tem de fechar: sem converter, o sócio sem quotas contribuía zero para o total
 * enquanto a linha dele imprimia o valor cru, e a soma da tabela deixava de bater
 * com a cláusula de capital — o mesmo defeito do B6, entrando por outra porta.
 */
export function quotasDoSocio(quotas: number | null | undefined, vlrTotal: number | null | undefined): number | null {
  if (quotas != null) return quotas;
  return vlrTotal != null ? quotasDeValor(vlrTotal) : null;
}
