/**
 * As cores dos gráficos do Dashboard ROI, lidas do TEMA no momento em que a
 * tela desenha — e, portanto, no momento em que o PNG é gerado.
 *
 * ## Por que isto existe (decisão dela, 11/09/2026)
 *
 * O Dashboard ROI é a única tela do produto que vira IMAGEM e sai da casa: o
 * `roiVisualExport` rasteriza as seções com `html-to-image` e monta o HTML ou o
 * PDF que vai para a apresentação do cliente. As barras estavam em hex fixo, e
 * o teal delas (`#0d9488`) era o do Tailwind, não o da marca — então um
 * relatório gerado a partir da OSG, que é musgo, saía com o mesmo verde-água de
 * um gerado a partir da Tax, que é petróleo.
 *
 * Decisão: **o gráfico exportado segue o tema da área**. É a promessa da
 * identidade por área chegando na única peça que o cliente leva embora.
 *
 * ## Por que ler do DOM, e não escrever `hsl(var(--x))` no SVG
 *
 * `html-to-image` CLONA o nó e resolve estilo computado; atributo de SVG
 * (`fill="..."`) é copiado como texto. Um `var()` dentro de atributo chega ao
 * clone sem o bloco de tema que o define e resolve para nada — a barra sairia
 * preta no PNG e certa na tela, que é o pior defeito possível: só aparece no
 * arquivo que já foi enviado.
 *
 * Lendo o valor computado aqui, o que vai para o SVG já é cor concreta.
 *
 * ## Fora do navegador
 *
 * Em teste ou SSR não há `getComputedStyle`, e o fallback é a paleta da CASA
 * (o `:root`), não os hex antigos: um gráfico renderizado sem tema deve parecer
 * a PSA, não o estoque do Tailwind.
 */

/** Os papéis que um gráfico de ROI precisa. Nomes por PAPEL, nunca por matiz. */
export interface CoresDoGrafico {
  /** A âncora da área: o que melhora, o resultado, a economia. */
  ancora: string;
  /** A âncora clarinha: a parte ainda não realizada da mesma série. */
  ancoraFraca: string;
  /** O estado anterior, o "como era" — presente, sem opinião. */
  anterior: string;
  /** Custo/investimento: o que sai do caixa. */
  custo: string;
  /** O marco de payback. */
  marco: string;
  /** O ponto de partida da cascata. */
  partida: string;
  /** O ponto de chegada da cascata. */
  chegada: string;
  /** Linhas de grade e conectores. */
  grade: string;
  /** Texto de rótulo dentro do desenho. */
  rotulo: string;
  /**
   * Série CATEGÓRICA — "Pessoas", "Sistemas", "Retrabalho". Categoria não é
   * estado, então veste `--tag-*`, que é o que o contrato reserva para isso.
   * São quatro, e são quatro de propósito: uma quinta categoria no mesmo
   * gráfico não ganha cor nova, ganha rótulo.
   */
  categorias: readonly string[];
  /** Série de ESTADO: o funil de execução. Estes vestem papel, não etiqueta. */
  estados: { parado: string; espera: string; andamento: string; feito: string };
}

/** A paleta da casa, para quando não há DOM (teste, SSR). */
const SEM_DOM: CoresDoGrafico = {
  ancora: 'hsl(175 84% 25%)',
  ancoraFraca: 'hsl(175 84% 25% / 0.45)',
  anterior: 'hsl(180 10% 38%)',
  custo: 'hsl(356 68% 35%)',
  marco: 'hsl(20 72% 32%)',
  partida: 'hsl(212 59% 36%)',
  chegada: 'hsl(32 21% 12%)',
  grade: 'hsl(168 20% 86%)',
  rotulo: 'hsl(178 30% 9%)',
  categorias: ['hsl(112 64% 24%)', 'hsl(211 60% 33%)', 'hsl(289 78% 40%)', 'hsl(339 84% 40%)'],
  estados: {
    parado: 'hsl(32 21% 12%)',
    espera: 'hsl(44 68% 27%)',
    andamento: 'hsl(212 59% 36%)',
    feito: 'hsl(128 63% 21%)',
  },
};

function ler(estilo: CSSStyleDeclaration, token: string, alfa?: number): string | null {
  const bruto = estilo.getPropertyValue(token).trim();
  if (!bruto) return null;
  // Os tokens guardam o triplo HSL sem a função (`175 84% 25%`), que é o que o
  // Tailwind espera para poder aplicar alfa. Aqui fechamos a função na mão.
  return alfa === undefined ? `hsl(${bruto})` : `hsl(${bruto} / ${alfa})`;
}

/**
 * Lê a paleta do tema aplicado agora. Token que não resolve cai no valor da
 * casa, um a um — nunca a paleta inteira, para que uma variável renomeada não
 * arraste o gráfico todo de volta ao piso.
 */
export function coresDoGrafico(): CoresDoGrafico {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return SEM_DOM;
  const estilo = getComputedStyle(document.documentElement);
  return {
    ancora: ler(estilo, '--primary') ?? SEM_DOM.ancora,
    ancoraFraca: ler(estilo, '--primary', 0.45) ?? SEM_DOM.ancoraFraca,
    anterior: ler(estilo, '--muted-foreground') ?? SEM_DOM.anterior,
    custo: ler(estilo, '--status-ajuste') ?? SEM_DOM.custo,
    marco: ler(estilo, '--status-alerta') ?? SEM_DOM.marco,
    partida: ler(estilo, '--status-fila') ?? SEM_DOM.partida,
    chegada: ler(estilo, '--status-neutro') ?? SEM_DOM.chegada,
    grade: ler(estilo, '--border') ?? SEM_DOM.grade,
    rotulo: ler(estilo, '--foreground') ?? SEM_DOM.rotulo,
    categorias: [
      ler(estilo, '--tag-a') ?? SEM_DOM.categorias[0],
      ler(estilo, '--tag-b') ?? SEM_DOM.categorias[1],
      ler(estilo, '--tag-c') ?? SEM_DOM.categorias[2],
      ler(estilo, '--tag-d') ?? SEM_DOM.categorias[3],
    ],
    estados: {
      parado: ler(estilo, '--status-neutro') ?? SEM_DOM.estados.parado,
      espera: ler(estilo, '--status-espera') ?? SEM_DOM.estados.espera,
      andamento: ler(estilo, '--status-fila') ?? SEM_DOM.estados.andamento,
      feito: ler(estilo, '--status-feito') ?? SEM_DOM.estados.feito,
    },
  };
}
