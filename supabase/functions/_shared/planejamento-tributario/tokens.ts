/**
 * O mapa de token do capítulo 03: do deck para os slots do molde.
 *
 * **Mora separado do `slides.ts` de propósito.** Aquele módulo é puro conteúdo e
 * não sabe o que é um token; este é a fronteira com o arquivo, e é o contrato que
 * o molde `TEMPLATE_TRIBUTARIO_V2.pptx` cumpre. Ficar fora do `index.ts` é o que
 * permite testá-lo: a função da Edge importa por URL e o vitest não a alcança.
 *
 * **A contagem é a trava.** O molde tem 194 tokens distintos, contados no
 * arquivo, e o teste ao lado cobra o mesmo número daqui. Se alguém acrescentar
 * linha num quadro e esquecer o outro lado, quebra aqui e não na apresentação.
 */
import {
  ANOS_NO_QUADRO,
  CENARIOS_NO_QUADRO,
  LINHAS_DO_QUADRO_01,
  LINHAS_DO_QUADRO_02,
  PARCELAS_NO_FLUXO,
  type Deck,
} from './slides.ts';

/** Quantos tokens distintos o molde do padrão visual novo tem. Medido no arquivo. */
export const TOKENS_DO_MOLDE = 194;

/**
 * O mapa de token do capítulo inteiro, do deck para o molde.
 *
 * **Um mapa só para os sete slides**, porque o nome do token já diz onde ele
 * cai: `Q1_L04_A2` é a quarta linha do QUADRO 01 no segundo exercício. Isso é
 * possível porque o slot é fixo; no molde antigo a posição vinha da ordem das
 * linhas clonadas, e por isso era preciso um encaixe por índice de coluna.
 *
 * O nome do slot é 1-based e com zero à esquerda (`L04`, não `L4`) para o mapa
 * ficar legível ao lado do quadro impresso, onde as linhas se contam a partir de
 * um.
 */
export function tokensDoDeck(deck: Deck): Record<string, string> {
  const t: Record<string, string> = { CLIENTE: deck.cliente ?? 'Cliente' };

  /* Os três exercícios do estudo, que aparecem nos dois quadros e na premissa. */
  for (let i = 0; i < ANOS_NO_QUADRO; i += 1) {
    t[`ANO${i + 1}`] = deck.anos[i] === undefined ? '-' : String(deck.anos[i]);
  }
  t.ANO_BASE = deck.anoBase;
  t.CRESCIMENTO = deck.crescimento;

  /* A proporção da parceria, a ponta maior à esquerda em cada cenário. */
  t.PARC_C1_PF = deck.parceria.cenario01[0];
  t.PARC_C1_PJ = deck.parceria.cenario01[1];
  t.PARC_C2_OPER = deck.parceria.cenario02[0];
  t.PARC_C2_PATR = deck.parceria.cenario02[1];

  /* QUADRO 01: onze linhas por três exercícios. */
  for (let li = 0; li < LINHAS_DO_QUADRO_01; li += 1) {
    for (let ai = 0; ai < ANOS_NO_QUADRO; ai += 1) {
      t[`Q1_L${String(li + 1).padStart(2, '0')}_A${ai + 1}`] = deck.quadro01[li]?.[ai] ?? '-';
    }
  }

  /* A transferência: dois números e o fluxo de seis parcelas com seus anos. */
  t.TR_BENS = deck.transferencia.bens;
  t.TR_DIVIDAS = deck.transferencia.dividas;
  for (let i = 0; i < PARCELAS_NO_FLUXO; i += 1) {
    const parcela = deck.transferencia.parcelas[i];
    t[`ANO_P${i + 1}`] = parcela?.ano ?? '-';
    t[`TR_P${i + 1}`] = parcela?.valor ?? '-';
  }

  /* QUADRO 02: quatorze linhas por três exercícios por três cenários. */
  for (let li = 0; li < LINHAS_DO_QUADRO_02; li += 1) {
    for (let ai = 0; ai < ANOS_NO_QUADRO; ai += 1) {
      for (let ci = 0; ci < CENARIOS_NO_QUADRO; ci += 1) {
        const slot = `Q2_L${String(li + 1).padStart(2, '0')}_A${ai + 1}C${ci + 1}`;
        t[slot] = deck.quadro02[li]?.[ai]?.[ci] ?? '-';
      }
    }
  }

  /*
   * A faixa de variação, só das colunas comparadas. A coluna do primeiro cenário
   * é a base e o molde já escreve "base" nela, em texto fixo: não há token.
   */
  for (let ai = 0; ai < ANOS_NO_QUADRO; ai += 1) {
    for (let ci = 1; ci < CENARIOS_NO_QUADRO; ci += 1) {
      t[`Q2_VAR_A${ai + 1}C${ci + 1}`] = deck.variacao[ai]?.[ci] ?? '-';
    }
  }

  /* Os cartões do topo do Resumo. O primeiro não tem variação: é o base. */
  for (let ci = 0; ci < CENARIOS_NO_QUADRO; ci += 1) {
    t[`RES_SOMA_C${ci + 1}`] = deck.cartoes[ci]?.soma ?? '-';
    if (ci > 0) t[`RES_VAR_C${ci + 1}`] = deck.cartoes[ci]?.variacao ?? '-';
  }

  return t;
}

