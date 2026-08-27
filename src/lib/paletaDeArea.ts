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
 * Blocos de tema esperados no `index.css`: a base e uma classe por área.
 *
 * A `.rotina-theme` entrou depois das outras duas, e é a razão de existir
 * `AREAS_CONGELADAS_NA_BASE`: ela declara o contrato inteiro, mas com os valores
 * da base. Estar nesta lista já a submete a completude, contraste, faixa e
 * separação interna — o que ela cumpre, por ser cópia de uma paleta que cumpre.
 *
 * Fora da lista: `.base-theme`, `.sistema-theme` e `.board-theme`. Nenhum dos
 * três declara `--status-*` próprio (o `.base-theme` congela a base; os outros
 * dois são delta de superfície) — cobrá-los aqui seria medir a paleta da base
 * três vezes com nome diferente. O `.dark` também fica fora: a faixa deste
 * arquivo é calibrada para superfície clara, e a escala escura tem contrato
 * próprio.
 */
export const TEMAS = [':root', '.tax-theme', '.osg-theme', '.rotina-theme'] as const;

/**
 * Áreas que hoje são CÓPIA da base, por decisão registrada e não por esquecimento.
 *
 * A Rotina declarava 1 das 41 variáveis do contrato e herdava as outras 40; o
 * congelamento (ver `.rotina-theme` no `index.css`) escreveu as 40 com os valores
 * que ela já computava, para desacoplá-la da base sem mudar um pixel. O efeito
 * colateral é que a paleta de status dela é, hoje, byte a byte a da base — e a
 * identidade visual própria da Rotina é uma decisão que ainda não foi tomada.
 *
 * `problemasEntreAreas` pula o par (área congelada × `:root`), e SÓ esse par: a
 * área continua sendo comparada com a Tax e com a OSG. O que a exceção diz é
 * "esta área ainda não escolheu a cor dela", não "esta área está dispensada".
 *
 * A exceção não é silenciosa: o teste `ainda é cópia da base` falha no dia em
 * que a Rotina ganhar cor própria, e a mensagem dele manda tirar o nome daqui.
 * Exceção que sobrevive à razão de existir é como papel que ninguém checava.
 */
export const AREAS_CONGELADAS_NA_BASE = ['.rotina-theme'] as const;

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
 * Um par fica fora: área congelada × `:root`, pela razão registrada em
 * `AREAS_CONGELADAS_NA_BASE`. Todos os outros valem, inclusive os da área
 * congelada contra as áreas que já têm cor própria.
 *
 * O campo `tema` traz os dois seletores comparados e `item` o papel, para a
 * mensagem do teste dizer de uma vez qual papel, quais duas áreas e as duas
 * distâncias medidas. Papel não declarado é queixa de `problemasDoTema`; aqui
 * é ignorado, para não duplicar a mesma reclamação em dois testes.
 */
export function problemasEntreAreas(css: string): ProblemaDePaleta[] {
  const paletas = TEMAS.map(seletor => ({ seletor, paleta: paletaDoTema(css, seletor) }));
  const problemas: ProblemaDePaleta[] = [];

  /** Área congelada contra a base é o par exonerado — e só ele. Ver `AREAS_CONGELADAS_NA_BASE`. */
  const congeladoContraABase = (um: string, outro: string) =>
    (um === ':root' && (AREAS_CONGELADAS_NA_BASE as readonly string[]).includes(outro)) ||
    (outro === ':root' && (AREAS_CONGELADAS_NA_BASE as readonly string[]).includes(um));

  for (const papel of PAPEIS_DE_STATUS) {
    for (let i = 0; i < paletas.length; i += 1) {
      for (let j = i + 1; j < paletas.length; j += 1) {
        if (congeladoContraABase(paletas[i].seletor, paletas[j].seletor)) continue;
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
