import React from 'react';

/**
 * O selo hexagonal da área Tax, sem o glyph.
 *
 * POR QUE ISTO EXISTE. O selo nasceu dentro do `TaxIcon`, com o porquinho
 * embutido. Em 22/09/2026 a área ganhou uma segunda porta (o TAX Work) e um
 * segundo glyph, e copiar o selo para o ícone novo significaria duplicar o
 * hexágono, a borda interna, a sombra, o brilho e os quatro valores de cor
 * crua — cinco decisões visuais passando a existir em dois lugares, que é
 * exatamente como elas divergem sem ninguém ver.
 *
 * As cores continuam sendo hexadecimais e não tokens, e isso NÃO é descuido: o
 * selo é uma marca, não uma superfície de produto. Ele tem que ser o mesmo nos
 * dois temas e em qualquer fundo, como o selo da OSG também é. O que os tokens
 * governam é a tela em volta.
 *
 * O `glowOpacity` é o único parâmetro do selo porque é o único valor que o
 * `TaxIcon` já alternava entre claro e escuro.
 *
 * O BRILHO DO TOPO ERA CIANO VIVO (`#22d3ee`, opacidade 0.18) e virou o acento
 * da própria borda, em 0.12, em 22/09/2026. O selo da OSG usa um teal apagado a
 * 0.12 justamente para o brilho ser um detalhe; aqui o ciano puxava o olho para
 * o vértice de cima e destoava do resto da paleta, que é teal e ouro. Foi
 * apontado olhando os dois selos lado a lado.
 */
/**
 * O acento do selo: o teal `#0d9488` da MARCA da Tax.
 *
 * Era o dourado `#c49a6c`, que é da OSG, e a consultoria perguntou em 22/09/2026
 * se aquela linha em volta do ícone era mesmo do tema da Tax. Não era, e o
 * sistema de cores já tinha decidido isso por escrito, em `src/index.css`:
 *
 *   "A OSG tinha identidade consolidada (musgo, dourado, carmim, taupe) antes
 *    deste sistema de papéis existir (...) Os quentes deixaram de ser vocabulário
 *    comum. Eram carmim + dourado IDÊNTICOS aos da OSG, e por isso as duas
 *    legendas liam como a mesma paleta."
 *
 * O mesmo arquivo nomeia a âncora da Tax: "o teal #0d9488 da marca". Ele é mais
 * claro que o fundo do selo (`#0e4b5a`), então continua lendo como aro, que é o
 * papel que o dourado fazia para a OSG.
 *
 * Hexadecimal e não token, pelo motivo do bloco acima: o selo é marca.
 */
const ACENTO_DA_TAX = '#0d9488';

export const TaxSeal = ({
  glowOpacity,
  children,
}: {
  glowOpacity: number;
  children: React.ReactNode;
}) => (
  <>
    {/* Sombra do selo */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#032630"
      opacity="0.2"
      transform="translate(0, 5)"
    />

    {/* Selo hexagonal/diamante — fundo teal (azulado, não verde) */}
    <path
      d="M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z"
      fill="#0e4b5a"
      stroke={ACENTO_DA_TAX}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* Borda interna decorativa */}
    <path
      d="M 256 60 L 425 158 L 425 354 L 256 452 L 87 354 L 87 158 Z"
      fill="none"
      stroke={ACENTO_DA_TAX}
      strokeWidth="1.5"
      opacity="0.4"
    />

    {children}

    {/* Brilho no topo do selo */}
    <circle cx="256" cy="40" r="9" fill={ACENTO_DA_TAX} opacity={glowOpacity} />
    <circle cx="256" cy="40" r="2.5" fill={ACENTO_DA_TAX} opacity="0.5" />
  </>
);

export default TaxSeal;
