/**
 * Contrato das paletas de área (papéis de status + tons de tag).
 *
 * Cada área declara a paleta dela num bloco de `src/index.css` (`.tax-theme`,
 * `.osg-theme`, …) e o `:root` guarda a base do sistema. As funções aqui leem
 * esses blocos e checam o que uma revisão humana não pega de olho:
 *
 * 1. **Completude** — a área declara TODOS os papéis e tons. Papel faltando não
 *    quebra nada visível: a área herda silenciosamente o valor da base e a tela
 *    fica com duas identidades misturadas.
 * 2. **Contraste** — texto sobre a pílula e branco sobre o tom cheio ficam em AA.
 * 3. **Faixa** — luminosidade e saturação dentro do registro combinado. É o que
 *    impede que uma área nova entre neon e destoe das outras: as paletas devem
 *    conversar, não só existir.
 * 4. **Separação par a par** — dois papéis distintos não podem virar a mesma
 *    bolinha de 8px. Ver `SEPARACAO` e `problemasDeSeparacao`.
 * 5. **Separação entre áreas** — o MESMO papel, em dois temas, não pode ser a
 *    mesma cor: senão a legenda do Gantt da Tax e a da OSG viram a mesma
 *    imagem. Ver `SEPARACAO_ENTRE_AREAS` e `problemasEntreAreas`.
 *
 * O teste que aplica isso ao `index.css` real é `paletaDeArea.test.ts`.
 */

/** Papéis de status. A ordem é a do ciclo de vida, do não-começado ao alerta. */
export const PAPEIS_DE_STATUS = [
  'neutro',
  'fila',
  'andamento',
  'revisao',
  'espera',
  'ajuste',
  'feito',
  'alerta',
] as const;

/**
 * Tons categóricos. Servem a dois empregos: o chip da tag de texto livre
 * (sorteado por hash) e a paleta categórica dos GRÁFICOS (`SERIES`, em
 * `components/equipe/board/clientes-os/shared.ts`).
 *
 * São quatro, e o número não é folgado: dentro da faixa de luminosidade que o
 * contraste do chip permite, protanopia/deutanopia deixam só quatro classes
 * separáveis (quente-escuro, quente-claro, frio-escuro, frio-claro). Um quinto
 * tom colidiria com algum dos quatro sob daltonismo. As checagens deste arquivo
 * NÃO enxergam daltonismo — quem mede isso é o `validate_palette.js` da skill
 * `dataviz`; ver `docs/geral/paleta-por-area.md`.
 */
export const TONS_DE_TAG = ['a', 'b', 'c', 'd'] as const;

/**
 * Blocos de tema esperados no `index.css`: a base e uma classe por área que
 * tenha paleta de status própria.
 *
 * A `.rotina-theme` esteve aqui e SAIU em 29/08/2026, junto com o bloco dela no
 * `index.css`. Ela declarava o contrato inteiro com os valores da base, e a
 * exceção `AREAS_CONGELADAS_NA_BASE` existia só para registrar isso. A Rotina é
 * a casa, a casa é o piso, e área cuja âncora é a do piso não tem paleta a
 * declarar — o bloco era uma cópia, e a exceção era o recibo dela. Saíram juntos.
 *
 * Fora da lista: `.base-theme`, `.sistema-theme` e `.board-theme`. Nenhum dos
 * três declara `--status-*` próprio (o `.base-theme` congela a base; os outros
 * dois são delta de superfície) — cobrá-los aqui seria medir a paleta da base
 * três vezes com nome diferente. O `.dark` também fica fora: a faixa deste
 * arquivo é calibrada para superfície clara, e a escala escura tem contrato
 * próprio.
 */
export const TEMAS = [':root', '.tax-theme', '.osg-theme'] as const;

/**
 * Papéis semânticos do sistema: o vermelho de excluir, o verde de deu certo, o
 * amarelo de atenção, o azul de informação. São TOKENS DE SINAL, não paleta de
 * área — e é por isso que ficaram fora deste arquivo, que nasceu para os oito
 * papéis de status. O `--warning` atravessou esse tempo a 2,13:1 como texto:
 * nenhum teste olhava.
 *
 * O `--info` entra mesmo passando com folga nos quatro temas, e entra por isso
 * mesmo: quem já cumpre é barato de travar, e a lacuna que deixou o amarelo
 * passar não foi um valor errado — foi um token que nada media.
 *
 * Diferenças de tratamento em relação a `PAPEIS_DE_STATUS`, e o porquê:
 *
 * - **Sem faixa e sem teto de saturação.** Faixa serve para as paletas de área
 *   conversarem entre si; sinal não conversa, ele interrompe. O `--warning` a
 *   92% de saturação é escolha, não desvio.
 * - **Sem separação par a par.** Vermelho, verde, amarelo e azul: matiz
 *   suficiente por construção.
 * - **Sem separação entre áreas.** O contrário: o vermelho de excluir PODE ser
 *   o mesmo em duas áreas, e na maioria delas é.
 *
 * O que sobra — e é o que `problemasDosSemanticos` cobra — são as duas maneiras
 * como o token de fato aparece na tela: preenchimento com o `-foreground` por
 * cima (botão, pílula) e texto solto sobre a superfície do tema (`text-warning`).
 */
export const PAPEIS_SEMANTICOS = ['destructive', 'success', 'warning', 'info'] as const;

/**
 * Faixa do registro comum. Não é gosto: são os limites que mantêm as paletas
 * conversando entre si e legíveis nas duas pontas do par.
 */
export const FAIXA = {
  /** Fundo da pílula: claro, mas não branco. */
  softLuminosidade: [76, 96],
  /** Tom cheio: escuro o bastante para receber texto branco. */
  cheioLuminosidade: [12, 40],
  /** Teto de saturação — o que barra neon. */
  saturacaoMaxima: 85,
  /** Contraste mínimo (WCAG AA para texto normal). */
  contrasteMinimo: 4.5,
} as const;

/**
 * Separação exigida entre os tons CHEIOS de dois papéis quaisquer.
 *
 * Por que existe: o tom cheio não pinta só o texto da pílula — ele pinta a
 * **bolinha** da legenda do Gantt (`bg-status-<papel>`, 8px, sem rótulo colado).
 * Na pílula a cor vem acompanhada da palavra "Revisão"; na bolinha ela é a única
 * informação. A primeira versão desta paleta usou uma rampa de MATIZ ÚNICO
 * (`fila`/`andamento`/`revisao` no mesmo teal, variando só 27%→21%→15% de
 * luminosidade): legível na pílula, indistinguível na bolinha. Este contrato é o
 * que impede o erro de voltar.
 *
 * O critério é um OU, porque são os dois canais que uma bolinha pequena entrega:
 * ou os papéis estão em famílias de cor diferentes (matiz), ou um é visivelmente
 * mais escuro que o outro (luminosidade). Um só dos dois basta — exigir os dois
 * tornaria oito papéis impossíveis dentro da faixa combinada.
 *
 * `saturacaoQueDaMatiz` é o pedágio do caminho da matiz: matiz só se enxerga
 * quando a cor tem croma. Dois cinzas a 180° de distância continuam sendo o
 * mesmo cinza, e sem esse piso o teste aprovaria esse par.
 */
export const SEPARACAO = {
  /** Graus de matiz que já separam duas cores cromáticas, sozinhos. */
  matizMinima: 20,
  /** Pontos de luminosidade que já separam duas cores, sozinhos. */
  luminosidadeMinima: 8,
  /** Saturação mínima (nas DUAS cores) para o caminho da matiz valer. */
  saturacaoQueDaMatiz: 20,
} as const;

/**
 * Separação exigida entre o MESMO papel em DOIS TEMAS diferentes.
 *
 * Por que existe: `SEPARACAO` garante que os oito papéis se distinguem DENTRO
 * de uma paleta, e nada mais. Duas áreas podiam declarar paletas idênticas e
 * passar em tudo — foi exatamente o que aconteceu. Medido antes desta regra, o
 * `alerta` da Tax (`43 68% 28%`) e o da OSG (`44 66% 28%`) estavam a 1° de matiz
 * e 0 ponto de luminosidade; os quatro quentes inteiros ficaram entre 1° e 6°.
 * Resultado: a legenda do Gantt na Tax e na OSG liam como a mesma paleta, e a
 * área deixou de ser reconhecível pela cor.
 *
 * O critério é o mesmo OU de `SEPARACAO` — matiz ou luminosidade —, com
 * limiares MENORES, e a diferença de limiar é deliberada:
 *
 * - Dentro de uma paleta as oito bolinhas aparecem JUNTAS, na mesma legenda, e
 *   a comparação é lado a lado: exige-se mais (20° / 8 pontos).
 * - Entre áreas a comparação nunca é simultânea — ninguém vê a legenda da Tax e
 *   a da OSG na mesma tela. O que precisa mudar é o *caráter* da paleta, e para
 *   isso basta menos. Cobrar 20° dos dois lados tornaria o sistema insolúvel: o
 *   arco quente útil (carmim → dourado) tem ~55° e precisa acomodar quatro
 *   papéis em três áreas.
 *
 * 12° / 6 pontos é o piso, e as paletas em uso passam com meia distância
 * sobrando: quando quem resolve é a matiz, o pior caso real é 18° (1,5× o
 * piso); quando é a luminosidade, 9 pontos (1,5× também). O piso não é a meta —
 * é o alarme.
 */
export const SEPARACAO_ENTRE_AREAS = {
  /** Graus de matiz que já separam o mesmo papel em duas áreas. */
  matizMinima: 12,
  /** Pontos de luminosidade que já separam o mesmo papel em duas áreas. */
  luminosidadeMinima: 6,
  /** Saturação mínima (nas DUAS cores) para o caminho da matiz valer. */
  saturacaoQueDaMatiz: 20,
} as const;

export type Hsl = { h: number; s: number; l: number };
export type Paleta = Record<string, Hsl>;

/**
 * Apaga os comentários do CSS preservando as posições: cada caractere vira
 * espaço e as quebras de linha ficam, então recorte de bloco e número de linha
 * continuam valendo.
 *
 * Existe porque o `index.css` CITA declaração em prosa. O comentário do
 * `.base-theme` explica um caso antigo escrevendo `--destructive: var(--osg-red)`
 * no meio da frase; sem esta limpeza o parser lê a citação como declaração, e o
 * `.base-theme` passa a "declarar" o vermelho da OSG. Um comentário que termine
 * em `  }` também cortaria o bloco antes do fim.
 */
function semComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '));
}

/** Recorta um bloco `seletor { … }` do CSS, já sem comentários. Devolve '' se o seletor não existir. */
export function blocoDoTema(css: string, seletor: string): string {
  const limpo = semComentarios(css);
  const inicio = limpo.indexOf(`${seletor} {`);
  if (inicio === -1) return '';
  const fim = limpo.indexOf('\n  }', inicio);
  return fim === -1 ? limpo.slice(inicio) : limpo.slice(inicio, fim);
}

/**
 * Cadeia de herança de um tema de área, na ordem em que o navegador resolve.
 *
 * O `areaTheme.ts` aplica SEMPRE `base-theme` no `<html>` e a classe da área por
 * cima; o `:root` fica embaixo dos dois, e é onde moram as primitivas de marca
 * (`--osg-red`, `--teal-500`). Token que a área não declara vem de um destes dois
 * blocos — e as três áreas dependem disso: nenhuma declara `--card` própria.
 */
const HERANCA = ['.base-theme', ':root'] as const;

/** Declarações de um bloco, valor cru: `h s% l%` ou `var(--outra)`. */
function declaracoesDoTema(css: string, seletor: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const [, nome, valor] of blocoDoTema(css, seletor).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    mapa[nome] = valor.trim();
  }
  return mapa;
}

/**
 * Valor final de UMA variável para UM tema, com herança e `var()` resolvidos.
 *
 * `paletaDoTema` não serve aqui: ela só lê o que o bloco declara literalmente em
 * HSL, e os semânticos da OSG são `var(--osg-moss)` / `var(--osg-highlighter)` —
 * apontam para primitivas que moram no `:root`. Ler apenas o literal daria "não
 * declarado" justamente na área que mais personalizou os três.
 *
 * Devolve `null` quando a variável não existe em nenhum bloco da cadeia, ou
 * quando a cadeia de `var()` não termina em HSL (referência quebrada, ou cor
 * escrita em hex — que este arquivo não sabe ler).
 */
export function corDoTema(css: string, seletor: string, nome: string): Hsl | null {
  const blocos = [seletor, ...HERANCA.filter(bloco => bloco !== seletor)].map(bloco =>
    declaracoesDoTema(css, bloco),
  );
  const buscar = (chave: string, profundidade: number): Hsl | null => {
    if (profundidade > 5) return null;
    const cru = blocos.map(bloco => bloco[chave]).find(valor => valor !== undefined);
    if (cru === undefined) return null;
    const hsl = cru.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
    if (hsl) return { h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) };
    const referencia = cru.match(/^var\(--([a-z0-9-]+)\)$/);
    return referencia ? buscar(referencia[1], profundidade + 1) : null;
  };
  return buscar(nome, 0);
}

/** Variáveis `--status-*` e `--tag-*` de um bloco, já em HSL numérico. */
export function paletaDoTema(css: string, seletor: string): Paleta {
  const bloco = blocoDoTema(css, seletor);
  const paleta: Paleta = {};
  const padrao = /--(status-[a-z-]+|tag-[a-d]):\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/g;
  for (const [, nome, h, s, l] of bloco.matchAll(padrao)) {
    paleta[nome] = { h: Number(h), s: Number(s), l: Number(l) };
  }
  return paleta;
}

/** HSL → RGB normalizado (0..1), na fórmula do CSS. */
export function hslParaRgb({ h, s, l }: Hsl): [number, number, number] {
  const sat = s / 100;
  const lum = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) => lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** Luminância relativa (WCAG 2.x). */
export function luminancia(rgb: [number, number, number]): number {
  const canal = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contraste(a: Hsl, b: Hsl): number {
  const [maior, menor] = [luminancia(hslParaRgb(a)), luminancia(hslParaRgb(b))].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

/**
 * Distância entre matizes, em graus (0–180), no círculo de cor.
 *
 * Para separar dois tons ESCUROS, contraste de luminância não serve: verde
 * musgo e tijolo dão razão ~1:1 e ainda assim ninguém os confunde. Quem responde
 * "essas duas cores se distinguem?" nesse caso é a matiz.
 */
export function distanciaDeMatiz(a: Hsl, b: Hsl): number {
  const bruta = Math.abs(a.h - b.h) % 360;
  return bruta > 180 ? 360 - bruta : bruta;
}

/**
 * Duas cores se distinguem como bolinha de 8px? Ver `SEPARACAO` para o porquê
 * do critério. Devolve `null` quando passam, ou o motivo da colisão.
 */
export function colisaoDeTomCheio(a: Hsl, b: Hsl): string | null {
  const matiz = distanciaDeMatiz(a, b);
  const luz = Math.abs(a.l - b.l);
  const temCroma = Math.min(a.s, b.s) >= SEPARACAO.saturacaoQueDaMatiz;
  if (temCroma && matiz >= SEPARACAO.matizMinima) return null;
  if (luz >= SEPARACAO.luminosidadeMinima) return null;
  const ressalva = temCroma ? '' : ` (matiz não conta: saturação abaixo de ${SEPARACAO.saturacaoQueDaMatiz}%)`;
  return `${matiz.toFixed(0)}° de matiz e ${luz.toFixed(0)} pontos de luminosidade — precisa de ${SEPARACAO.matizMinima}° OU ${SEPARACAO.luminosidadeMinima} pontos${ressalva}`;
}

/**
 * O mesmo papel, em duas áreas, ainda é reconhecível como área diferente?
 * Devolve `null` quando passa, ou o motivo da colisão. Ver
 * `SEPARACAO_ENTRE_AREAS` para o porquê dos limiares serem menores que os de
 * `SEPARACAO`.
 */
export function colisaoEntreAreas(a: Hsl, b: Hsl): string | null {
  const matiz = distanciaDeMatiz(a, b);
  const luz = Math.abs(a.l - b.l);
  const temCroma = Math.min(a.s, b.s) >= SEPARACAO_ENTRE_AREAS.saturacaoQueDaMatiz;
  if (temCroma && matiz >= SEPARACAO_ENTRE_AREAS.matizMinima) return null;
  if (luz >= SEPARACAO_ENTRE_AREAS.luminosidadeMinima) return null;
  const ressalva = temCroma ? '' : ` (matiz não conta: saturação abaixo de ${SEPARACAO_ENTRE_AREAS.saturacaoQueDaMatiz}%)`;
  return `${matiz.toFixed(0)}° de matiz e ${luz.toFixed(0)} pontos de luminosidade — precisa de ${SEPARACAO_ENTRE_AREAS.matizMinima}° OU ${SEPARACAO_ENTRE_AREAS.luminosidadeMinima} pontos${ressalva}`;
}

const BRANCO: Hsl = { h: 0, s: 0, l: 100 };

export interface ProblemaDePaleta {
  tema: string;
  item: string;
  /** O que falhou, em uma frase — vai direto para a mensagem do teste. */
  motivo: string;
}

/**
 * Confere um tema inteiro: completude, contraste e faixa. Lista vazia = aprovado.
 *
 * A tag é checada como o componente a usa (`bg-tag-x/15 text-tag-x`): texto do
 * próprio tom sobre 15% dele mesmo em cima do card claro.
 */
export function problemasDoTema(css: string, seletor: string): ProblemaDePaleta[] {
  const paleta = paletaDoTema(css, seletor);
  const problemas: ProblemaDePaleta[] = [];

  for (const papel of PAPEIS_DE_STATUS) {
    const cheio = paleta[`status-${papel}`];
    const soft = paleta[`status-${papel}-soft`];
    if (!cheio || !soft) {
      problemas.push({
        tema: seletor,
        item: papel,
        motivo: `papel não declarado (${cheio ? '' : `--status-${papel} `}${soft ? '' : `--status-${papel}-soft`}) — a área herdaria o valor da base`,
      });
      continue;
    }
    const pilula = contraste(cheio, soft);
    if (pilula < FAIXA.contrasteMinimo) {
      problemas.push({ tema: seletor, item: papel, motivo: `texto sobre a pílula em ${pilula.toFixed(2)}:1, abaixo de ${FAIXA.contrasteMinimo}:1` });
    }
    const solido = contraste(BRANCO, cheio);
    if (solido < FAIXA.contrasteMinimo) {
      problemas.push({ tema: seletor, item: papel, motivo: `branco sobre o tom cheio em ${solido.toFixed(2)}:1, abaixo de ${FAIXA.contrasteMinimo}:1` });
    }
    if (soft.l < FAIXA.softLuminosidade[0] || soft.l > FAIXA.softLuminosidade[1]) {
      problemas.push({ tema: seletor, item: papel, motivo: `luminosidade do soft em ${soft.l}%, fora de ${FAIXA.softLuminosidade.join('–')}%` });
    }
    if (cheio.l < FAIXA.cheioLuminosidade[0] || cheio.l > FAIXA.cheioLuminosidade[1]) {
      problemas.push({ tema: seletor, item: papel, motivo: `luminosidade do tom cheio em ${cheio.l}%, fora de ${FAIXA.cheioLuminosidade.join('–')}%` });
    }
    for (const [rotulo, cor] of [['soft', soft], ['tom cheio', cheio]] as const) {
      if (cor.s > FAIXA.saturacaoMaxima) {
        problemas.push({ tema: seletor, item: papel, motivo: `saturação do ${rotulo} em ${cor.s}%, acima do teto de ${FAIXA.saturacaoMaxima}% (neon)` });
      }
    }
  }

  for (const tom of TONS_DE_TAG) {
    const cor = paleta[`tag-${tom}`];
    if (!cor) {
      problemas.push({ tema: seletor, item: `tag-${tom}`, motivo: 'tom não declarado — a área herdaria o valor da base' });
      continue;
    }
    const rgb = hslParaRgb(cor);
    // Chip = 15% do tom sobre o card claro; aproximação suficiente para o piso de AA.
    const fundo = rgb.map(canal => 0.85 + 0.15 * canal) as [number, number, number];
    const razao = (() => {
      const [maior, menor] = [luminancia(rgb), luminancia(fundo)].sort((x, y) => y - x);
      return (maior + 0.05) / (menor + 0.05);
    })();
    if (razao < FAIXA.contrasteMinimo) {
      problemas.push({ tema: seletor, item: `tag-${tom}`, motivo: `texto sobre o chip em ${razao.toFixed(2)}:1, abaixo de ${FAIXA.contrasteMinimo}:1` });
    }
    if (cor.s > FAIXA.saturacaoMaxima) {
      problemas.push({ tema: seletor, item: `tag-${tom}`, motivo: `saturação em ${cor.s}%, acima do teto de ${FAIXA.saturacaoMaxima}% (neon)` });
    }
    if (cor.l > FAIXA.cheioLuminosidade[1]) {
      problemas.push({ tema: seletor, item: `tag-${tom}`, motivo: `luminosidade em ${cor.l}%, acima de ${FAIXA.cheioLuminosidade[1]}%` });
    }
  }

  return problemas;
}

/**
 * Confere os três papéis semânticos de um tema. Lista vazia = aprovado.
 *
 * Duas medidas, uma para cada emprego real do token (ver `PAPEIS_SEMANTICOS`
 * para o que este contrato deliberadamente NÃO cobra):
 *
 * - **preenchido** — o token pinta o fundo e o `-foreground` escreve por cima.
 *   É o botão de excluir, o toast de sucesso, a pílula de aviso. O par tem que
 *   fechar AA sozinho: quem olha não escolhe as duas cores, elas vêm juntas.
 * - **texto** — `text-destructive`, `text-success`, `text-warning` sobre a
 *   superfície do tema (`--card`, ou `--background` quando a área não declara
 *   card). Este é o emprego que ninguém estava medindo, e o mais frágil: o
 *   token foi calibrado para receber texto branco, não para SER o texto.
 *
 * A superfície entra pela herança (`corDoTema`) porque nenhuma área declara
 * `--card` própria — medir contra o branco puro daria um número que não existe
 * em nenhuma tela.
 */
export function problemasDosSemanticos(css: string, seletor: string): ProblemaDePaleta[] {
  const problemas: ProblemaDePaleta[] = [];
  const superficie = corDoTema(css, seletor, 'card') ?? corDoTema(css, seletor, 'background');
  if (!superficie) {
    problemas.push({
      tema: seletor,
      item: 'superfície',
      motivo: 'nem --card nem --background resolvem — sem superfície não há como medir o token como texto',
    });
  }

  for (const papel of PAPEIS_SEMANTICOS) {
    const cor = corDoTema(css, seletor, papel);
    const porCima = corDoTema(css, seletor, `${papel}-foreground`);
    if (!cor || !porCima) {
      problemas.push({
        tema: seletor,
        item: papel,
        motivo: `não resolve (${cor ? '' : `--${papel} `}${porCima ? '' : `--${papel}-foreground`}) — var() apontando para o vazio, ou cor escrita em hex`,
      });
      continue;
    }
    const preenchido = contraste(cor, porCima);
    if (preenchido < FAIXA.contrasteMinimo) {
      problemas.push({
        tema: seletor,
        item: `${papel} · preenchido`,
        motivo: `--${papel}-foreground sobre --${papel} em ${preenchido.toFixed(2)}:1, abaixo de ${FAIXA.contrasteMinimo}:1`,
      });
    }
    if (superficie) {
      const texto = contraste(cor, superficie);
      if (texto < FAIXA.contrasteMinimo) {
        problemas.push({
          tema: seletor,
          item: `${papel} · texto`,
          motivo: `text-${papel} sobre a superfície do tema em ${texto.toFixed(2)}:1, abaixo de ${FAIXA.contrasteMinimo}:1`,
        });
      }
    }
  }

  return problemas;
}

/**
 * Confere se os tons cheios de dois papéis quaisquer se distinguem entre si.
 * Lista vazia = aprovado. Papel não declarado é problema de `problemasDoTema`;
 * aqui ele é apenas ignorado, para não duplicar a mesma queixa em dois testes.
 */
export function problemasDeSeparacao(css: string, seletor: string): ProblemaDePaleta[] {
  const paleta = paletaDoTema(css, seletor);
  const problemas: ProblemaDePaleta[] = [];

  for (let i = 0; i < PAPEIS_DE_STATUS.length; i += 1) {
    for (let j = i + 1; j < PAPEIS_DE_STATUS.length; j += 1) {
      const [um, outro] = [PAPEIS_DE_STATUS[i], PAPEIS_DE_STATUS[j]];
      const a = paleta[`status-${um}`];
      const b = paleta[`status-${outro}`];
      if (!a || !b) continue;
      const colisao = colisaoDeTomCheio(a, b);
      if (colisao) {
        problemas.push({ tema: seletor, item: `${um} × ${outro}`, motivo: `mesma bolinha: ${colisao}` });
      }
    }
  }

  return problemas;
}

/**
 * Confere se cada papel muda de cara ao trocar de área. Percorre os pares de
 * temas, papel a papel. Lista vazia = aprovado.
 *
 * Nenhum par fica de fora. Houve um — `.rotina-theme` × `:root`, exonerado
 * porque a Rotina era cópia da base — e ele saiu quando o bloco copiado saiu.
 * A exceção durou exatamente o tempo da razão dela.
 *
 * O campo `tema` traz os dois seletores comparados e `item` o papel, para a
 * mensagem do teste dizer de uma vez qual papel, quais duas áreas e as duas
 * distâncias medidas. Papel não declarado é queixa de `problemasDoTema`; aqui
 * é ignorado, para não duplicar a mesma reclamação em dois testes.
 */
export function problemasEntreAreas(css: string): ProblemaDePaleta[] {
  const paletas = TEMAS.map(seletor => ({ seletor, paleta: paletaDoTema(css, seletor) }));
  const problemas: ProblemaDePaleta[] = [];

  for (const papel of PAPEIS_DE_STATUS) {
    for (let i = 0; i < paletas.length; i += 1) {
      for (let j = i + 1; j < paletas.length; j += 1) {
        const a = paletas[i].paleta[`status-${papel}`];
        const b = paletas[j].paleta[`status-${papel}`];
        if (!a || !b) continue;
        const colisao = colisaoEntreAreas(a, b);
        if (colisao) {
          problemas.push({
            tema: `${paletas[i].seletor} × ${paletas[j].seletor}`,
            item: papel,
            motivo: `mesma área aparente: ${colisao}`,
          });
        }
      }
    }
  }

  return problemas;
}

/* ─── Cor por camada ────────────────────────────────────────────────────────
   O que vem daqui para baixo descreve um modelo DIFERENTE do que as checagens
   acima medem, e por ora convive com elas sem ser chamado por ninguém.

   As checagens acima partem de que cada área é dona dos oito papéis e as cobram
   por SEPARAÇÃO: o `alerta` da Tax tem que ser reconhecivelmente outra cor que o
   da OSG, senão a área deixa de ser reconhecível pela cor. Isso resolveu o
   problema de duas áreas ficarem idênticas, e criou outro: se cada área escolhe
   os oito livremente, "alerta" deixa de ser um conceito do sistema e vira oito
   cores sem parentesco, uma por tela.

   O modelo abaixo separa as duas coisas em camadas. O SIGNIFICADO é do sistema:
   matiz e luminosidade de cada papel são as MESMAS em toda área, para que
   `alerta` seja uma cor que a pessoa aprende uma vez. A ÂNCORA é da área e pinta
   o que é grande — cabeçalho, botão, primeira série do gráfico — e nunca papel
   de status. A identidade da área continua existindo, mas mora no que ocupa
   espaço, não na bolinha de 8px.

   O parentesco entre as duas camadas vem por um canal só, a saturação: cada área
   puxa a saturação dos oito na direção da âncora dela. É pouco o bastante para
   não desmanchar o significado e o bastante para a tela inteira parecer da mesma
   família.

   As duas afirmações não convivem: `problemasEntreAreas` exige que o mesmo papel
   MUDE de área para área, e `problemasDeDivergencia` exige que ele NÃO mude
   além da saturação. Trocar uma pela outra é passo próprio; nada aqui é chamado
   ainda. */

export type PapelDeStatus = (typeof PAPEIS_DE_STATUS)[number];

/**
 * Os oito papéis antes de qualquer área — matiz e luminosidade definitivas.
 *
 * Estes dois canais são o significado, e é por isso que nenhuma área os toca:
 * a matiz diz de que família a cor é, a luminosidade diz o peso dela na tela.
 * Só a saturação sobra para a área mexer (ver `harmonizar`).
 *
 * Os sete papéis de trabalho estão em duas trilhas, e a trilha é a informação:
 *
 * - **Fria — o trabalho andando.** `fila` → `andamento` → `revisao` → `feito`
 *   gira numa direção só no círculo de cor (212° → 186° → 160° → 128°) e escurece
 *   junto (36% → 26% → 22% → 21%). Quem vê a sequência duas vezes já lê progresso
 *   sem legenda: a cor fecha e adensa conforme a coisa termina.
 * - **Quente — parado por alguém.** `espera` → `alerta` → `ajuste` (44° → 20° →
 *   356°) desce do dourado ao carmim, e a urgência sobe junto. A trilha quente
 *   NÃO é a continuação da fria: é o eixo perpendicular, "esperando gente" contra
 *   "andando sozinho".
 *
 * `neutro` fica fora das duas de propósito: não é etapa nem espera, é ausência de
 * estado. Ele é o único quase acromático (16%), e por isso também é o único cuja
 * saturação a área quase não move.
 */
export const SIGNIFICADO: Record<PapelDeStatus, Hsl> = {
  neutro: { h: 32, s: 16, l: 12 },
  fila: { h: 212, s: 50, l: 36 },
  andamento: { h: 186, s: 60, l: 26 },
  revisao: { h: 160, s: 52, l: 22 },
  espera: { h: 44, s: 62, l: 27 },
  ajuste: { h: 356, s: 62, l: 35 },
  feito: { h: 128, s: 56, l: 21 },
  alerta: { h: 20, s: 68, l: 32 },
};

/**
 * A cor grande de cada área. Pinta cabeçalho, botão e primeira série do gráfico;
 * NUNCA papel de status. Em `harmonizar` ela entra só pela saturação.
 *
 * De onde cada uma veio, porque nenhuma foi escolhida no olho:
 *
 * - `casa` — o teal institucional da marca PSA, medido nos pixels da logo e
 *   conferido contra o manual. Vale para o Portal do Cliente, o Board e a Rotina:
 *   são as telas que não são de uma área específica, e a casa é a identidade
 *   delas.
 * - `tax` — a cor do porquinho do `TaxLoader.tsx`, que já era a imagem que a
 *   área tinha de si mesma antes de existir tema.
 * - `auditoria` — medida no documento de identidade da área. Há uma segunda cor
 *   lá, mais clara, para preenchimento e gráfico; ela não entra aqui porque não
 *   é a que puxa a saturação, e ainda não tem consumidor.
 * - `osg` — o verde musgo que já mora no `index.css` como primitiva.
 * - `juridico` — o marinho do branding book do Prado Advogados. É a única acima
 *   do teto de `PUXADA.tetoDoAlvo`, e a razão de o teto existir.
 */
export const ANCORAS = {
  casa: { h: 175, s: 82, l: 29 },
  tax: { h: 192, s: 73, l: 20 },
  auditoria: { h: 191, s: 30, l: 36 },
  osg: { h: 149, s: 66, l: 22 },
  juridico: { h: 218, s: 100, l: 15 },
} as const satisfies Record<string, Hsl>;

export type NomeDeArea = keyof typeof ANCORAS;

/**
 * Quanto a área puxa a saturação dos oito na direção da âncora dela.
 *
 * `forca` é 28% e não é arredondamento de nada — é o máximo que passa o contrato
 * de contraste com a luminosidade TRAVADA. Foi medido nos dois regimes: deixando
 * a luminosidade acompanhar a puxada, a força máxima que ainda mantém os oito em
 * AA nas cinco áreas cai para 4%, o que não se vê; travando a luminosidade, sobe
 * para 44%. 28% fica com folga dentro do segundo regime — o teto não é a meta.
 *
 * `forcaDoNeutro` é 8% porque o neutro é quase acromático por definição. Puxá-lo
 * como aos outros o tiraria do papel: um cinza que ganha 18 pontos de saturação
 * deixa de ler como "sem estado" e passa a ler como mais um status.
 *
 * `tetoDoAlvo` limita o ALVO, não o resultado: uma âncora a 100% de saturação
 * puxaria os oito para perto do neon, e o marinho do Jurídico é exatamente esse
 * caso. Derivado de `FAIXA.saturacaoMaxima` de propósito — é o mesmo "sem neon",
 * e separar os dois números deixaria a puxada gerar valores que a própria faixa
 * reprova. Com o alvo abaixo do teto e os oito significados também abaixo,
 * o resultado da interpolação nunca passa dele.
 */
export const PUXADA = {
  /** Fração da distância até a saturação da âncora, para os sete papéis de trabalho. */
  forca: 0.28,
  /** A mesma fração, para o `neutro`. */
  forcaDoNeutro: 0.08,
  /** Teto do ALVO da puxada. */
  tetoDoAlvo: FAIXA.saturacaoMaxima,
} as const;

/**
 * O papel de status como ele fica NA área: significado com a saturação puxada
 * na direção da âncora. Esta é a fórmula que gera os valores do `index.css`.
 *
 * A força não é parâmetro: ela é parte do modelo, e deixá-la aberta permitiria a
 * quem chama pedir uma puxada que o contraste não sustenta. Quem escolhe entre
 * `forca` e `forcaDoNeutro` é o papel.
 *
 * Matiz e luminosidade saem intactas — é o que faz `alerta` ser a mesma cor
 * aprendida em toda área.
 */
export function harmonizar(papel: PapelDeStatus, ancora: Hsl): Hsl {
  const significado = SIGNIFICADO[papel];
  const forca = papel === 'neutro' ? PUXADA.forcaDoNeutro : PUXADA.forca;
  const alvo = Math.min(ancora.s, PUXADA.tetoDoAlvo);
  return { ...significado, s: significado.s + (alvo - significado.s) * forca };
}

/**
 * Tolerância da comparação de saturação, em pontos.
 *
 * A puxada quase sempre dá fração e o CSS carrega inteiro.
 * Meio ponto é exatamente "o valor declarado é o arredondamento correto do
 * calculado" — apertado o bastante para pegar um dígito trocado à mão, folgado
 * o bastante para não brigar com o arredondamento.
 *
 * Matiz e luminosidade não têm tolerância nenhuma: elas são o significado, e
 * significado não chega perto, chega igual.
 */
export const TOLERANCIA_DE_SATURACAO = 0.5;

/**
 * Confere se os tons cheios declarados por uma área são os que a fórmula gera.
 * Lista vazia = aprovado. Papel não declarado é queixa de `problemasDoTema`;
 * aqui é ignorado, para não duplicar a mesma reclamação em dois testes.
 *
 * É esta checagem que muda a natureza do `index.css`: os valores das áreas
 * deixam de ser escolhas escritas uma a uma e passam a ser derivados de dois
 * dados — o significado e a âncora. Editar um valor à mão deixa de ser
 * invisível e vira erro com o nome do papel dentro.
 *
 * A âncora entra por parâmetro em vez de sair de um mapa seletor → âncora
 * porque a lista de temas do CSS e a lista de áreas do produto não são a mesma
 * coisa e nem sempre casam uma a uma — o Portal do Cliente, o Board e a Rotina
 * dividem a âncora da casa. Quem sabe amarrar as duas é quem chama.
 */
export function problemasDeDivergencia(css: string, seletor: string, ancora: Hsl): ProblemaDePaleta[] {
  const paleta = paletaDoTema(css, seletor);
  const problemas: ProblemaDePaleta[] = [];

  for (const papel of PAPEIS_DE_STATUS) {
    const declarado = paleta[`status-${papel}`];
    if (!declarado) continue;
    const esperado = harmonizar(papel, ancora);

    const desvios: string[] = [];
    if (declarado.h !== esperado.h) desvios.push(`matiz ${declarado.h}° onde o significado é ${esperado.h}°`);
    if (declarado.l !== esperado.l) desvios.push(`luminosidade ${declarado.l}% onde o significado é ${esperado.l}%`);
    if (Math.abs(declarado.s - esperado.s) > TOLERANCIA_DE_SATURACAO) {
      desvios.push(`saturação ${declarado.s}% onde a puxada dá ${esperado.s.toFixed(2)}%`);
    }
    if (desvios.length > 0) {
      problemas.push({ tema: seletor, item: papel, motivo: `valor não derivado: ${desvios.join('; ')}` });
    }
  }

  return problemas;
}
