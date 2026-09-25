/**
 * De onde a âncora de uma área PODE vir, e quão perto ela pode chegar das outras.
 *
 * `paletaDeArea.ts` mede a paleta DERIVADA de cada âncora — os oito papéis, os
 * quatro tons, as superfícies. Nada lá olha a âncora em si, e por isso a troca
 * de uma âncora por um tom da paleta de pontinhos passou por todos os testes.
 *
 * As duas regras aqui são independentes e pegam coisas diferentes: a primeira é
 * exata e diz de onde a cor vem, a segunda é perceptiva e diz onde ela cai. Ver
 * `docs/geral/duas-cores-de-area.md` para o porquê das duas existirem.
 */

import { ANCORAS, corDoTema, hslParaRgb, type Hsl } from '@/lib/paletaDeArea';

/** Quantos tons `--area-*` o `:root` declara. Ver `TOTAL_DE_TONS` em `corDaArea.ts`. */
const TONS_DE_PONTINHO = 8;

/**
 * Distância perceptiva mínima entre duas âncoras, em ΔE sobre OKLab.
 *
 * Não usa o critério de `SEPARACAO` (20° de matiz OU 8 pontos de luminosidade)
 * porque ele não enxerga croma: `casa × auditoria` reprova nele tanto com a
 * âncora medida no documento de identidade quanto com o `--area-4` que a
 * substituiu, e o que separa as duas é justamente a saturação.
 *
 * O piso é 10 e a folga é curta de propósito — o par mais apertado do conjunto
 * de referência está em 11,6. Subir o piso exigiria mexer numa âncora que tem
 * fonte externa, o que este arquivo não pode decidir.
 */
export const SEPARACAO_DE_ANCORAS = { distanciaMinima: 10 } as const;

const aoCubo = (n: number) => Math.cbrt(n);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** HSL → OKLab. Espaço perceptivo: distância euclidiana aqui aproxima diferença vista. */
export function oklab(cor: Hsl): [number, number, number] {
  const [r, g, b] = hslParaRgb(cor).map(linear);
  const l = aoCubo(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = aoCubo(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = aoCubo(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** ΔE entre duas cores, na escala em que os comentários do `index.css` já falam. */
export function distanciaPerceptiva(a: Hsl, b: Hsl): number {
  const [la, aa, ba] = oklab(a);
  const [lb, ab, bb] = oklab(b);
  return Math.hypot((la - lb) * 150, (aa - ab) * 150, (ba - bb) * 150);
}

export interface ProblemaDeAncora {
  area: string;
  motivo: string;
}

/**
 * Âncora que é, valor a valor, um dos `--area-*`.
 *
 * Os oito tons servem ao ponto de 12px ao lado de um nome escrito, e a faixa
 * estreita de luminosidade deles (32–42%) é o que os faz família. Cor de tela
 * responde outra pergunta e não sai daí: ela vem de fonte de identidade da área.
 */
export function ancorasQueRepetemPontinho(css: string): ProblemaDeAncora[] {
  const pontinhos = Array.from({ length: TONS_DE_PONTINHO }, (_, i) => {
    const nome = `area-${i + 1}`;
    return { nome, cor: corDoTema(css, ':root', nome) };
  });
  const problemas: ProblemaDeAncora[] = [];
  for (const [area, ancora] of Object.entries(ANCORAS)) {
    const igual = pontinhos.find(
      ({ cor }) => cor && cor.h === ancora.h && cor.s === ancora.s && cor.l === ancora.l,
    );
    if (igual) {
      problemas.push({
        area,
        motivo: `âncora é o --${igual.nome}, um tom da paleta de pontinhos — a cor de tela vem de fonte de identidade da área`,
      });
    }
  }
  return problemas;
}

/** Pares de âncora abaixo do piso de `SEPARACAO_DE_ANCORAS`. */
export function ancorasQueSeAproximam(): ProblemaDeAncora[] {
  const areas = Object.entries(ANCORAS);
  const problemas: ProblemaDeAncora[] = [];
  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const [nomeA, corA] = areas[i];
      const [nomeB, corB] = areas[j];
      const distancia = distanciaPerceptiva(corA, corB);
      if (distancia < SEPARACAO_DE_ANCORAS.distanciaMinima) {
        problemas.push({
          area: `${nomeA} × ${nomeB}`,
          motivo: `ΔE ${distancia.toFixed(1)}, abaixo do piso de ${SEPARACAO_DE_ANCORAS.distanciaMinima} — uma área lê como a outra levemente errada`,
        });
      }
    }
  }
  return problemas;
}
