// Como a peça se nomeia: constituição ou alteração, e qual alteração.
//
// A alteração contratual não tem modelo próprio (ver a migration
// 20260825143000): ela é gerada a partir do MESMO modelo de contrato social,
// com as resoluções na frente e o consolidado atrás. Quem decide o título, então,
// não é o modelo — é a POSIÇÃO da peça na cadeia de sucessão
// (`documento_gerado.substitui_documento_id`).
//
// O título mora aqui, e não em numeracao.ts, porque o motor de composição é
// agnóstico de documento: ele numera capítulo, cláusula e parágrafo sem nunca
// saber o que é um contrato social. "ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO
// SOCIAL" é vocabulário do domínio, e é daqui que o vocabulário o lê.

import { ordinalExtenso } from './extenso';

/** Título do instrumento quando a peça é a constituição da sociedade. */
export const TITULO_CONSTITUICAO = 'INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA';

/**
 * O título que abre a peça, escrito a partir do número da alteração: 0 (ou
 * null) é a constituição, 1 é a que sucede a constituição registrada, 2 é a que
 * sucede aquela, e assim por diante.
 *
 * O ordinal sai por extenso no feminino, que é o que "alteração" pede, e em
 * caixa alta, como o cabeçalho é impresso.
 */
export function tituloDoInstrumento(numeroAlteracao?: number | null): string {
  if (numeroAlteracao == null || !Number.isFinite(numeroAlteracao) || numeroAlteracao < 1) {
    return TITULO_CONSTITUICAO;
  }
  return `${ordinalExtenso(Math.trunc(numeroAlteracao), 'f').toUpperCase()} ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL`;
}
