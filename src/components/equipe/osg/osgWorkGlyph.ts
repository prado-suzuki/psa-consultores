/**
 * Peças do Sísifo da OSG Work.
 *
 * Aqui vivem DOIS desenhos da mesma cena, de propósito:
 *
 * - `OSG_SISYPHUS_PATH` — o contorno único vindo do potrace, usado pelo
 *   `OsgWorkIcon`. É o desenho que já está em produção; fica intocado.
 * - `OSG_SCENE` / `OSG_LEGS` — a MESMA cena remontada em peças separadas, usada
 *   pelo `OsgWorkLoader`. É o que permite articular quadril e joelho: o path do
 *   potrace saiu com corpo, cabeça, pedra e rampa fundidos num contorno só, então
 *   nele não existe "o path da perna" para girar.
 *
 * As peças não foram redesenhadas a olho: cada número saiu de medição no raster
 * original (`public/osg-work-sisyphus.png`), pelo cruzamento de 50% de cinza, que
 * é imune ao halo de antialiasing. Remontada em repouso, a versão em peças bate
 * com o desenho original com erro médio de 1,7 nível de cinza — só o halo.
 * Ao mexer em qualquer medida, confira contra o raster antes de aceitar.
 *
 * COORDENADAS: `OSG_SCENE` e `OSG_LEGS` estão no sistema do RASTER (512×512 do
 * desenho original), não no do selo. `OSG_GLYPH_TRANSFORM` faz a ponte. Medir no
 * raster e converter na borda é bem mais simples que medir dentro do selo.
 */

/** Sísifo empurrando a pedra — contorno único vindo do potrace (só o ícone usa). */
export const OSG_SISYPHUS_PATH =
  'M1483 4499 c-116 -22 -223 -111 -263 -216 -53 -137 -20 -283 86 -383 79 -75 129 -95 239 -95 76 0 98 4 146 26 79 37 133 90 171 167 30 61 33 75 33 157 -1 109 -21 160 -92 236 -56 60 -117 93 -198 108 -65 12 -63 12 -122 0z M3475 4403 c-96 -15 -203 -50 -300 -98 -195 -97 -332 -234 -430 -430 -51 -102 -94 -241 -95 -305 -1 -24 -1 -25 -16 -5 -32 44 -69 77 -108 98 l-41 22 -656 0 -655 0 -37 -25 c-21 -14 -46 -43 -56 -65 -11 -22 -70 -258 -132 -525 l-113 -485 -4 -364 -4 -364 -156 -281 c-152 -274 -156 -283 -160 -349 -4 -58 0 -75 23 -123 30 -62 85 -108 160 -135 l44 -15 -191 -95 c-191 -95 -228 -121 -228 -166 0 -33 42 -73 78 -73 35 0 4352 2160 4383 2193 40 44 4 127 -56 127 -14 0 -130 -52 -257 -116 l-232 -116 61 66 c120 128 205 281 245 442 32 128 32 333 0 459 -44 175 -160 369 -290 487 -108 96 -267 182 -409 219 -77 20 -298 34 -368 22z m-747 -1356 c128 -274 363 -469 648 -538 96 -24 280 -31 384 -16 30 5 52 6 50 4 -3 -3 -371 -188 -819 -412 -693 -346 -813 -403 -808 -383 3 13 24 162 47 331 40 300 40 310 25 369 -25 99 -74 160 -168 210 -40 22 -55 23 -279 26 -131 2 -238 7 -238 12 0 5 27 125 60 268 33 143 60 263 60 266 0 3 170 6 378 6 240 0 391 4 416 11 55 15 112 55 138 97 l21 35 23 -101 c12 -56 40 -139 62 -185z m-1029 -1064 c-10 -76 -18 -168 -19 -206 0 -110 46 -184 146 -232 l48 -23 -443 -222 -444 -221 25 43 c120 208 313 569 324 606 10 31 14 101 14 219 l0 173 183 0 183 0 -17 -137z';

/**
 * translate(116,116) → canto do box; scale(280/512) → ajusta 512→280;
 * translate(0,512) scale(0.1,-0.1) → desfaz o flip/escala 10× do potrace.
 */
export const OSG_SISYPHUS_TRANSFORM =
  'translate(116 116) scale(0.546875) translate(0 512) scale(0.1 -0.1)';

/**
 * viewBox do loader: quadrado justo em volta da figura, não o 512 inteiro.
 *
 * Os limites saíram de varrer o ciclo todo e pegar o extremo de cada peça já
 * girada, somando a meia-largura das pontas redondas: x 32,5..480 e y 56,8..449,3.
 * O quadrado de lado 448 centrado nisso cobre tudo, então nada corta em fase
 * nenhuma — inclusive com o joelho no alto da recuperação.
 *
 * Recortar importa: dentro do selo a figura ocupava 280 de 512, ou 55% do lado.
 * Aqui ela ocupa o quadro inteiro, o que a deixa ~1,8× maior no mesmo `size` — é
 * o que torna o glifo legível nos 16-20px dos spinners embutidos em botão.
 */
export const OSG_FIGURE_VIEWBOX = '32 29 448 448';

/** Selo hexagonal e sua borda interna decorativa. */
export const OSG_SEAL_HEX_PATH = 'M 256 40 L 443 148 L 443 364 L 256 472 L 69 364 L 69 148 Z';
export const OSG_SEAL_INNER_PATH = 'M 256 60 L 425 158 L 425 354 L 256 452 L 87 354 L 87 158 Z';

export type OsgPoint = readonly [number, number];

/** Um osso: traço reto de ponta redonda. A ponta redonda é o que faz junta. */
export interface OsgBone {
  readonly from: OsgPoint;
  readonly to: OsgPoint;
  readonly width: number;
}

/**
 * Peças estáticas da cena, medidas no raster.
 *
 * Tudo é pintado da MESMA cor, então sobreposição entre peças é de graça — não
 * precisa clip nem ordem de desenho para esconder emenda. É por isso que o pé
 * pode afundar na faixa da rampa sem aparecer, exatamente como no desenho
 * original. O contraponto é que limbo sobre limbo vira borrão: ver `OSG_LEGS`.
 */
export const OSG_SCENE = {
  /** A ladeira. Não recebe o sobe-e-desce do corpo: é o chão. */
  ramp: { from: [40.5, 441.3], to: [472.0, 225.4], width: 16.0 } as OsgBone,
  rock: { cx: 360.0, cy: 167.0, r: 96.5 },
  head: { cx: 154.2, cy: 96.2, r: 35.4 },
  /** Ombro e braço esticado até a pedra, num traço só. */
  arm: { from: [128.0, 167.6], to: [238.5, 167.6], width: 49.8 } as OsgBone,
  /** Fecha o vão entre as duas coxas, que não pertence a perna nenhuma. */
  pelvis: { from: [105.0, 274.0], to: [151.0, 280.0], width: 40.5 } as OsgBone,
  torso: 'M 109 145 L 170 190 L 157 252 L 157 282 L 83 282 L 83 270 Z',
  /** Largura dos dois ossos de cada perna. Medida em 4 cortes: 52,1. */
  legWidth: 52.0,
} as const;

/**
 * Disco parado em cada quadril, de raio um fio maior que a meia-largura da perna.
 *
 * Sem ele a coxa girando abre uma MOSSA contra o tronco: a junta fica côncava,
 * porque a borda do corpo ali não é um círculo centrado no quadril. Fazendo a coxa
 * girar saindo de um disco maior que ela, a junta é sempre convexa e lisa. Os dois
 * discos ficam dentro da silhueta original, então não engordam o desenho.
 */
export const OSG_HIP_DISCS = [
  { cx: 108.8, cy: 252.0, r: 27.0 },
  { cx: 162.0, cy: 274.0, r: 27.0 },
] as const;

/** Os três pontos de uma perna. O giro acontece em `hip` e em `knee`. */
export interface OsgLegJoints {
  readonly hip: OsgPoint;
  readonly knee: OsgPoint;
  readonly ankle: OsgPoint;
}

/**
 * As duas pernas, cada uma com quadril e joelho de verdade.
 *
 * ASSIMETRIA PROPOSITAL na amplitude de cada uma (os ângulos estão nos keyframes
 * `osg-sisyphus-*` do tailwind.config):
 *
 * - a perna de TRÁS está desenhada quase toda esticada — o tornozelo dela fica a
 *   90 das 96 unidades de alcance do quadril. Ela quase não avança sem o joelho
 *   subir até o quadril da frente, e aí as duas peças se sobrepõem e viram um
 *   vulto só, que lê como "ajoelhado". Por isso ela dá só uma passada curta;
 * - a perna da FRENTE tem folga: o tornozelo cai quase na vertical do próprio
 *   quadril, com ±72 de alcance para os dois lados. É ela que dá a passada larga
 *   (60 unidades, ~7,5 px quando o loader tem 64 px de lado), e é o joelho dela
 *   subindo que faz a leitura de subida.
 *
 * O joelho traseiro (y=330) não foi escolhido: é onde o eixo medido da coxa
 * (x=108,8) cruza o eixo medido da canela (x = −0,5394y + 287,04).
 */
export const OSG_LEGS: { readonly rear: OsgLegJoints; readonly front: OsgLegJoints } = {
  rear: { hip: [108.8, 252.0], knee: [108.8, 330.0], ankle: [76.4, 389.5] },
  front: { hip: [162.0, 272.0], knee: [200.6, 273.5], ankle: [193.1, 333.0] },
};

/**
 * Crateras da pedra, em deslocamento a partir do centro dela.
 *
 * O contorno do disco não muda ao girar, então só as crateras precisam rodar — e
 * elas cabem folgadas dentro do raio (a mais distante chega a 54 de 96,5), o que
 * dispensa clip: nada vaza a pedra em ângulo nenhum.
 */
export const OSG_CRATERS = [
  { dx: -30, dy: -12, r: 22 },
  { dx: 14, dy: -34, r: 15 },
  { dx: 2, dy: 30, r: 11 },
] as const;
