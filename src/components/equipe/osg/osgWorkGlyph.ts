/**
 * Peças do ícone OSG Work (Sísifo empurrando a pedra) e a geometria medida da
 * cena, no sistema do selo (viewBox 0 0 512 512).
 *
 * O `OsgWorkIcon` monta o ícone estático e o `OsgWorkLoader` anima a mesma cena;
 * os dois consomem estas constantes para não duplicar path nem número mágico.
 *
 * IMPORTANTE — o glyph do Sísifo é UM path só, vetorizado com potrace: corpo,
 * cabeça, pedra e rampa saíram fundidos num único contorno (mais dois subpaths
 * que são vazados). Não existe "o path da pedra" nem "o path da perna" para animar
 * em separado. O loader resolve assim:
 *
 * - NADA se desloca na ladeira. O Sísifo fica na posição do ícone e só as pernas e
 *   a pedra se mexem, o que faz o ciclo fechar sem costura: não há volta ao ponto
 *   de partida para disfarçar. Como consequência, a rampa que aparece é a do
 *   próprio glyph (não precisa de rampa postiça) e a figura fica no tamanho do
 *   ícone (não precisa de espaço de percurso);
 * - a pedra "gira" por crateras desenhadas por cima do disco branco e recortadas
 *   nele (`OSG_ROCK`). O contorno do disco não muda ao girar, então só as crateras
 *   precisam rodar — e o giro é contínuo, uma volta inteira por ciclo, senão a
 *   volta ao zero apareceria como um salto;
 * - as pernas são recortadas do mesmo contorno e giram no quadril (`OSG_LEGS`).
 */

/** Sísifo empurrando a pedra — contorno único vindo do potrace. */
export const OSG_SISYPHUS_PATH =
  'M1483 4499 c-116 -22 -223 -111 -263 -216 -53 -137 -20 -283 86 -383 79 -75 129 -95 239 -95 76 0 98 4 146 26 79 37 133 90 171 167 30 61 33 75 33 157 -1 109 -21 160 -92 236 -56 60 -117 93 -198 108 -65 12 -63 12 -122 0z M3475 4403 c-96 -15 -203 -50 -300 -98 -195 -97 -332 -234 -430 -430 -51 -102 -94 -241 -95 -305 -1 -24 -1 -25 -16 -5 -32 44 -69 77 -108 98 l-41 22 -656 0 -655 0 -37 -25 c-21 -14 -46 -43 -56 -65 -11 -22 -70 -258 -132 -525 l-113 -485 -4 -364 -4 -364 -156 -281 c-152 -274 -156 -283 -160 -349 -4 -58 0 -75 23 -123 30 -62 85 -108 160 -135 l44 -15 -191 -95 c-191 -95 -228 -121 -228 -166 0 -33 42 -73 78 -73 35 0 4352 2160 4383 2193 40 44 4 127 -56 127 -14 0 -130 -52 -257 -116 l-232 -116 61 66 c120 128 205 281 245 442 32 128 32 333 0 459 -44 175 -160 369 -290 487 -108 96 -267 182 -409 219 -77 20 -298 34 -368 22z m-747 -1356 c128 -274 363 -469 648 -538 96 -24 280 -31 384 -16 30 5 52 6 50 4 -3 -3 -371 -188 -819 -412 -693 -346 -813 -403 -808 -383 3 13 24 162 47 331 40 300 40 310 25 369 -25 99 -74 160 -168 210 -40 22 -55 23 -279 26 -131 2 -238 7 -238 12 0 5 27 125 60 268 33 143 60 263 60 266 0 3 170 6 378 6 240 0 391 4 416 11 55 15 112 55 138 97 l21 35 23 -101 c12 -56 40 -139 62 -185z m-1029 -1064 c-10 -76 -18 -168 -19 -206 0 -110 46 -184 146 -232 l48 -23 -443 -222 -444 -221 25 43 c120 208 313 569 324 606 10 31 14 101 14 219 l0 173 183 0 183 0 -17 -137z';

/**
 * translate(116,116) → canto do box; scale(280/512) → ajusta 512→280;
 * translate(0,512) scale(0.1,-0.1) → desfaz o flip/escala 10× do potrace.
 */
export const OSG_SISYPHUS_TRANSFORM =
  'translate(116 116) scale(0.546875) translate(0 512) scale(0.1 -0.1)';

/** Selo hexagonal e sua borda interna decorativa. */
export const OSG_SEAL_HEX_PATH = 'M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z';
export const OSG_SEAL_INNER_PATH = 'M 256 60 L 425 158 L 425 354 L 256 452 L 87 354 L 87 158 Z';

/**
 * Reta da rampa, medida no glyph renderizado: `y = -0.5004x + 426.53` — um aclive
 * exato de 2:1 (−26,57°) e espessura ~7,9. Não é usada para desenhar nada (a rampa
 * que aparece é a do próprio glyph): serve de referência para o corte do chão em
 * `OSG_LEGS`, que é a reta da FACE DE CIMA dela, 4,42 acima do eixo.
 */
export const OSG_RAMP_AXIS = { slope: -0.5004, intercept: 426.53, width: 7.9 } as const;

/** Disco da pedra, medido por ajuste de círculo nas linhas onde ela fica isolada. */
export const OSG_ROCK = {
  cx: 313.1,
  cy: 207.2,
  r: 52.4,
  /** Raio do recorte das crateras — um fio menor que o disco, que o potrace deixou irregular. */
  clipR: 50,
} as const;

/**
 * RECORTE DAS PERNAS (técnica de boneco de papel).
 *
 * Sem isso o Sísifo desliza rampa acima como um adesivo. Como as pernas não são
 * paths separados, o loader desenha o MESMO contorno três vezes, cada vez com um
 * clip diferente: tronco, perna de trás e perna da frente. As duas pernas giram
 * no quadril; o tronco fica parado (só acompanha a translação da cena).
 *
 * Todos os polígonos estão em coordenadas do selo (viewBox 512) e foram traçados
 * sobre o glyph renderizado com grade:
 *
 * - `groundPolygon` corta tudo abaixo da face de cima da rampa
 *   (`y = -0.5004x + 422.1`) e é aplicado DEPOIS do giro: é o que dá sola chata
 *   ao pé — girando para trás ele sobe e aparece inteiro, girando para frente ele
 *   afunda e some no chão, que é exatamente a leitura de pé plantado.
 * - `groundPolygonInner` é o mesmo corte 1,7 mais alto e é aplicado ANTES do giro,
 *   para a perna não levar consigo o fiozinho da rampa do glyph que passa rente ao
 *   pé — girado, esse fio virava uma lâmina branca saindo da ladeira.
 * - os recortes das pernas AVANÇAM ~6 para dentro da bacia (a sobreposição vai até
 *   onde o desenho é maciço, então não aparece). Sem ela, girar a perna abre um
 *   rasgo na junta: o desencontro na ponta do corte é distância×sen(ângulo), uns 5
 *   no pior caso, e 6 de sobra cobre isso. As bordas em x≈218 separam as duas
 *   pernas pelo vão que já existe entre elas no desenho, também com sobreposição.
 * - o limite em y=223 mantém o braço (que acaba em y=222) fora da perna da frente,
 *   e a borda direita dela acompanha em degraus o arco esquerdo da pedra, 1,5 por
 *   fora — com um simples x=262 o joelho, que vai até x≈270, era decepado. O vão
 *   entre joelho e pedra é fundo do selo no desenho, então essa fronteira não deixa
 *   emenda à vista. `bodyPolygon` repete essa fronteira 1 mais à direita: divergir
 *   muito deixaria um vazio que não pertence a peça nenhuma, e encostar exatamente
 *   deixaria costura de antialiasing entre as duas peças.
 * - `bodyPolygon` recorta o vão das pernas até bem abaixo do chão, então precisa de
 *   `rampPolygon` ao lado dele (o clip do tronco é a UNIÃO dos dois) para devolver a
 *   faixa da rampa que passa por dentro desse vão. Sem isso o trecho de baixo da
 *   ladeira não é desenhado por peça nenhuma e a rampa fica com um buraco.
 */
export const OSG_LEGS = {
  /** Acima da face de cima da rampa; aplicado depois do giro. */
  groundPolygon: '60,392.1 480,181.9 480,60 60,60',
  /** O mesmo corte 1,7 acima; aplicado antes do giro. */
  groundPolygonInner: '60,390.4 480,180.2 480,60 60,60',
  rear: {
    pivotX: 190,
    pivotY: 262,
    polygon: '120,243.1 224,262.2 224,400 120,400',
  },
  front: {
    pivotX: 228,
    pivotY: 242,
    polygon:
      '232.3,223 261.6,223 264,230 268,237 274.3,244 282.8,251 290.5,256 298.5,260 300,400 212,400 212,257.5',
  },
  /**
   * Faixa da rampa; entra no clip do tronco junto do polígono principal. O topo
   * dela fica 2,2 acima da face de cima da rampa, ou seja ACIMA do corte interno
   * das pernas (1,7): senão sobra entre os dois uma banda de 1,2 que peça nenhuma
   * desenha, e ela aparece como um risco de fundo atravessando os pés.
   */
  rampPolygon: '110,364.9 305,267.3 305,420 110,420',
  /** Tudo menos as duas pernas: o mesmo contorno externo com o vão delas recortado. */
  bodyPolygon:
    '60,60 480,60 480,400 301,400 299.5,260 291.5,256 283.8,251 275.3,244 269,237 265,230 262.6,223 239.2,223 218,267.1 120,249.1 120,400 60,400',
} as const;
