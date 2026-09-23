/**
 * O glyph do TAX Work: uma peça de Tetris, no viewBox 512 do selo da Tax.
 *
 * POR QUE TETRIS. O selo da OSG carrega Sísifo, que é uma piada do Digital
 * sobre o trabalho que não termina — afetuosa, não ofensiva. O par da Tax segue
 * o mesmo raciocínio e o mesmo tom: as peças caem sem parar, aceleram, e o
 * melhor que acontece é sumir com uma linha. Muda o sotaque (jogo, e não mito),
 * mantém o registro.
 *
 * SÓBRIO QUER DIZER MONOCROMÁTICO. O Tetris de verdade é um arco-íris de sete
 * cores, e é exatamente isso que não pode acontecer aqui: o selo tem paleta
 * fechada (teal, ouro, ciano) e o glyph da OSG é uma silhueta de uma cor só. O
 * que separa a peça do chão não é cor, é OPACIDADE.
 *
 * GEOMETRIA. Tudo é medido contra o hexágono interno do selo
 * (`M 256 60 L 425 158 L 425 354 L 256 452 L 87 354 L 87 158 Z`), que é estreito
 * no topo e embaixo. A peça mora na faixa larga, entre y 158 e y 354: começa em
 * 179 e termina em 349, com 38 de folga de cada lado — a mesma ordem de respiro
 * que o porquinho do `TaxIcon` tem. Ao mexer em qualquer número aqui, confira as
 * bordas nessas duas alturas.
 */

export interface BlocoDoGlyph {
  x: number;
  y: number;
}

/** Lado do bloco e o passo da grade, que deixa 14 de argamassa entre eles. */
export const TETRIS_BLOCO = 78;
const CELULA = 92;
/**
 * Canto da grade: 3 colunas centradas em 256, na faixa larga do hexágono.
 *
 * O `GRADE_Y` desce 8 além do centro geométrico DE PROPÓSITO. A peça T tem três
 * blocos em cima e um embaixo, então a massa visual fica acima do meio: centrada
 * na régua, ela lê como se estivesse escorregando para o topo do selo. O empurrão
 * corrige o olho, não a matemática.
 */
const GRADE_X = 118;
const GRADE_Y = 172;

const emGrade = (coluna: number, linha: number): BlocoDoGlyph => ({
  x: GRADE_X + coluna * CELULA + (CELULA - TETRIS_BLOCO) / 2,
  y: GRADE_Y + linha * CELULA + (CELULA - TETRIS_BLOCO) / 2,
});

/**
 * O tetraminó T: três blocos e um no meio, embaixo.
 *
 * É a peça, e só ela. Duas versões anteriores foram desenhadas, renderizadas e
 * olhadas nos tamanhos de uso antes desta: um tabuleiro 4×4 com oito blocos, que
 * a 46px virava uma mancha de pontos; e uma peça S sobre um chão com vão, que
 * ficou parecendo um cigarro de 8 bits. A conta é simples e vale para o próximo
 * glyph da casa: **no cartão do seletor o ícone tem 46 pixels, então cada bloco
 * precisa de pelo menos 8** — o que dá quatro blocos, não doze.
 *
 * O T foi escolhido entre as sete peças por ser o único simétrico no eixo
 * vertical, o que centra a massa e evita a leitura de "traço".
 */
export const TETRIS_PECA: BlocoDoGlyph[] = [
  emGrade(0, 0),
  emGrade(1, 0),
  emGrade(2, 0),
  emGrade(1, 1),
];

/** Raio do canto: arredondado o bastante para não parecer pixel art. */
export const TETRIS_RAIO = 8;
