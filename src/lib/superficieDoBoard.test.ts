import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { corDoTema, hslParaRgb, luminancia, TEMAS, type Hsl } from '@/lib/paletaDeArea';

/**
 * Catraca da superfície do Board: **o cartão dele é a MESMA tinta do `<Card>`.**
 *
 * O DEFEITO QUE ISTO FECHA. Em 12/09/2026 o cartão do produto desceu de `--card`
 * para `bg-superficie-cartao` (35% de `--muted`). A mudança foi no componente, e
 * **o Board não passa por lá**: ele pinta com CSS escrito à mão — `.v3-card`,
 * `.v4-card`, `.kpi`, `.mc` — que lê `--bd-surface`, e `--bd-surface` era
 * `hsl(var(--card))`. Resultado: cartão do Board branco, cartão do resto tingido.
 * Mesma coisa com dois tratamentos, e ninguém escolheu isso. Ela decidiu em
 * 17/09/2026: *"O board acompanha então."*
 *
 * O alcance de uma linha aqui são três frentes — `/equipe/board`,
 * `/gerencial/desempenho` e `/gerencial/performance` —, e é por isso que a
 * primeira asserção RECALCULA o alfa em vez de olhar o número: quem mexer no
 * `superficie-cartao` do `tailwind.config.ts` precisa ouvir que o Board anda
 * junto, sem precisar saber que o Board existe.
 *
 * ── O ACHADO QUE ESTA CATRACA EXISTE PARA GUARDAR ──
 *
 * **Alfa não empilha de graça.** A tinta é translúcida, então toda caixa que
 * pintava `--bd-surface` SOBRE outra superfície deixou de ficar na altura do
 * cartão e passou a escurecer em silêncio. Foram sete, e duas delas eram
 * regressão de verdade, não de tom:
 *
 * · a **pastilha ligada do segmentado** (`.v3-seg.on`, `.v4-seg-btn.on`) fica
 *   sobre o trilho de acento, que já está sobre o cartão. Medida, ela ia de
 *   1,150:1 mais CLARA que o trilho para 1,003:1 mais escura na casa — ou seja,
 *   o controle parava de dizer qual opção está ligada;
 * · a **célula grudada** da matriz de `clientes-os/shared.ts` é `position:
 *   sticky`, e fundo translúcido deixa passar a coluna que rola por baixo.
 *
 * As duas saídas estão nos tokens: `--bd-control` (o branco que o `--bd-surface`
 * era, seguindo a área) e `--bd-surface-op` (a mesma tinta, composta sobre a
 * página, opaca). O inventário da terceira asserção é quem impede os sete de
 * voltarem — nenhum deles dá erro de build, de tipo ou de lint ao voltar.
 *
 * O QUE ESTA CATRACA NÃO COBRE, de propósito:
 *
 * · **O sinal do degrau da zebra e da divisória** (`--bd-surface2`,
 *   `--bd-line2`). É a segunda metade da tarefa, e é decisão dela: sobre o
 *   cartão tingido a zebra da casa INVERTE de direção, e a razão quase não muda
 *   — uma asserção que medisse só a razão daria verde. Enquanto a decisão não
 *   vier, não há número certo para cobrar.
 * · **`--bd-warn` e `--bd-risk`**, que estão em hexadecimal no `index.css`.
 *   `corDoTema` não lê hex de propósito, e converter no meio desta passada
 *   misturaria duas medições.
 */

const RAIZ = resolve(__dirname, '../..');
const CSS = readFileSync(resolve(RAIZ, 'src/index.css'), 'utf8');
const TAILWIND = readFileSync(resolve(RAIZ, 'tailwind.config.ts'), 'utf8');

/** Valor cru de um `--bd-*` do `index.css`. Falha alto: token que a busca não
    acha é token que a asserção estaria medindo de mentira. */
function tokenDoBoard(nome: string): string {
  const achado = CSS.match(new RegExp(`--${nome}:\\s*([^;]+);`));
  expect(achado, `\`--${nome}\` não foi encontrado no index.css`).not.toBeNull();
  return achado![1].trim();
}

/** Um `hsl(h s% l%)` escrito à mão, como a rampa de tinta do Board. */
function hslCravado(valor: string, onde: string): Hsl {
  const m = valor.match(/^hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)$/);
  expect(m, `${onde} deixou de ser um hsl() literal: "${valor}"`).not.toBeNull();
  return { h: Number(m![1]), s: Number(m![2]), l: Number(m![3]) };
}

type Rgb = [number, number, number];

/** `frente` sobre `fundo` com alfa, em RGB — é o que o navegador faz. */
function misturar(frente: Rgb, fundo: Rgb, alfa: number): Rgb {
  return [0, 1, 2].map(i => frente[i] * alfa + fundo[i] * (1 - alfa)) as Rgb;
}

function razao(a: Rgb, b: Rgb): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** A superfície do cartão do Board, composta, por tema. */
function superficieTingida(tema: string, alfa: number): Rgb {
  const pagina = corDoTema(CSS, tema, 'background');
  const muted = corDoTema(CSS, tema, 'muted');
  expect(pagina, `${tema}: --background não resolve`).not.toBeNull();
  expect(muted, `${tema}: --muted não resolve`).not.toBeNull();
  return misturar(hslParaRgb(muted as Hsl), hslParaRgb(pagina as Hsl), alfa);
}

/** O alfa da tinta, lido de onde ele mora de verdade. */
function alfaDoCartao(): number {
  const m = TAILWIND.match(/'superficie-cartao':\s*'hsl\(var\(--muted\)\s*\/\s*([\d.]+)\)'/);
  expect(m, 'o alfa de `superficie-cartao` não foi achado no tailwind.config.ts').not.toBeNull();
  return Number(m![1]);
}

describe('superfície do Board', () => {
  it('o cartão do Board é a mesma tinta do `<Card>` do produto', () => {
    /*
     * Não compara cor renderizada, compara FONTE: os dois têm de sair do mesmo
     * `--muted` e do mesmo alfa. Comparar o pixel passaria com dois valores
     * iguais por coincidência, que é exatamente o estado que a lista dupla do
     * `--bd-*` tinha antes de 31/08 — e que voltou a divergir sozinha em 12/09.
     */
    const declarado = tokenDoBoard('bd-surface');
    const m = declarado.match(/^hsl\(var\(--muted\)\s*\/\s*(\d*\.?\d+)\)$/);

    expect(
      m,
      '`--bd-surface` deixou de ser a tinta do cartão.\n'
        + `Está como \`${declarado}\`, e precisa ser \`hsl(var(--muted) / .35)\` — o\n`
        + 'mesmo `--muted` e o mesmo alfa do `superficie-cartao` no\n'
        + 'tailwind.config.ts. Se o alfa de lá mudou, mude aqui junto: o Board\n'
        + 'pinta cartão por CSS próprio e não passa pelo componente, então esta\n'
        + 'linha é o único lugar onde as duas superfícies se encontram.',
    ).not.toBeNull();

    const alfaAqui = Number(m![1]);
    expect(
      alfaAqui,
      'O alfa do Board e o do `<Card>` se separaram. Quem manda é o\n'
        + '`superficie-cartao` do tailwind.config.ts — 392 usos dependem dele.',
    ).toBeCloseTo(alfaDoCartao(), 5);
  });

  it('a rampa de tinta continua passando sobre a superfície tingida', () => {
    /*
     * O argumento que segurava esta frente era "descer a superfície move todos os
     * degraus construídos sobre ela". Move — e os que carregam TEXTO continuam
     * passando. Esta asserção recalcula em vez de repetir a medição de 21/08, que
     * foi feita contra o branco: quem descer a superfície mais um degrau, ou
     * clarear um dos `ink`, ouve na hora.
     *
     * `ink3` e `ink4` são os dois mais apertados da rampa (5,6 e 5,2 contra o
     * branco). Os outros três têm folga de sobra e ficam de fora para a mensagem
     * de falha não virar lista.
     */
    const alfa = alfaDoCartao();
    const reprovados: string[] = [];

    for (const tema of TEMAS) {
      const fundo = superficieTingida(tema, alfa);
      for (const nome of ['bd-ink3', 'bd-ink4'] as const) {
        const tinta = hslParaRgb(hslCravado(tokenDoBoard(nome), `\`--${nome}\``));
        const medido = razao(tinta, fundo);
        if (medido < 4.5) {
          reprovados.push(`${tema}: --${nome} a ${medido.toFixed(2)}:1 sobre o cartão`);
        }
      }
    }

    expect(
      reprovados,
      'Degrau de TEXTO reprovando o AA sobre a superfície do Board.\n'
        + 'O conserto não é clarear a superfície de volta — é escurecer o `ink`\n'
        + 'que reprovou, que é o degrau que existe para carregar letra.\n'
        + reprovados.join('\n'),
    ).toEqual([]);
  });

  it('o que não é cartão não pinta `--bd-surface`', () => {
    /*
     * O INVENTÁRIO É POR MOTIVO, não por linha: linha se move a cada edição, e o
     * motivo é o que a próxima pessoa precisa ler antes de "simplificar" um
     * `--bd-control` de volta para `--bd-surface`.
     *
     * A regra em uma frase: **`--bd-surface` só se apoia na página.** Caixa que
     * fica sobre outra superfície, ou que precisa tapar o que está atrás, usa
     * `--bd-control` (branco do controle, segue a área) ou `--bd-surface-op` (a
     * mesma tinta, opaca).
     */
    const SURFACE = /var\(--bd-surface\)/;

    const inventario: { arquivo: string; motivo: string }[] = [
      // CONTROLE — fica sobre o cartão ou sobre o trilho de acento, e a pastilha
      // ligada do segmentado precisa ler como a altura mais alta da pilha.
      { arquivo: 'src/components/board/BoardFilterBar.tsx', motivo: '`SelectTrigger` é campo, e campo dentro de cartão fica claro' },
      { arquivo: 'src/components/equipe/board/BoardClusterBar.tsx', motivo: 'idem — três `SelectTrigger` do recorte de cluster' },
      { arquivo: 'src/components/equipe/board/BoardRecorteBar.tsx', motivo: 'idem — o recorte de cliente, ano e mês' },
      { arquivo: 'src/components/equipe/board/BoardLayout.tsx', motivo: 'botão de recolher: cromo da barra lateral, que é clara por decisão' },
      // FLUTUA SOBRE CONTEÚDO — alfa aqui deixa passar a barra por trás do número.
      { arquivo: 'src/lib/board-chart-defaults.ts', motivo: 'tooltip do gráfico flutua sobre conteúdo' },
      { arquivo: 'src/components/board/BoardMapaClientes.tsx', motivo: 'tooltip do mapa flutua; e o risco entre UFs separa dois fills pintados' },
      // PRECISA TAPAR O QUE ROLA ATRÁS.
      { arquivo: 'src/components/equipe/board/clientes-os/shared.ts', motivo: 'célula `sticky` da matriz: fundo translúcido deixa passar a coluna' },
    ];

    const culpados: string[] = [];
    for (const { arquivo, motivo } of inventario) {
      const fonte = readFileSync(resolve(RAIZ, arquivo), 'utf8');
      if (SURFACE.test(fonte)) culpados.push(`${arquivo} — ${motivo}`);
    }

    // As três do `index.css` são seletor, não arquivo: o resto do arquivo pinta
    // cartão com `--bd-surface`, e está certo.
    for (const [seletor, motivo] of [
      ['.v3-fi', 'campo de filtro dentro da barra, que já é cartão'],
      ['.v3-seg.on', 'pastilha ligada: sobre o trilho de acento, sobre o cartão'],
      ['.v4-seg-btn.on', 'idem, na v4'],
    ] as const) {
      const regra = CSS.match(new RegExp(`${seletor.replace(/[.]/g, '\\.')}\\s*\\{[^}]*\\}`));
      expect(regra, `a regra \`${seletor}\` sumiu do index.css`).not.toBeNull();
      if (SURFACE.test(regra![0])) culpados.push(`index.css ${seletor} — ${motivo}`);
    }

    expect(
      culpados,
      '`--bd-surface` voltou para uma caixa que NÃO se apoia na página.\n'
        + 'Ele é translúcido desde 17/09/2026: empilhado sobre outra superfície\n'
        + 'escurece, e sobre conteúdo que rola deixa passar. Use `--bd-control`\n'
        + '(branco do controle, segue a área) ou `--bd-surface-op` (mesma tinta,\n'
        + 'opaca) — os dois estão declarados ao lado do `--bd-surface`.\n'
        + culpados.join('\n'),
    ).toEqual([]);
  });

  it('`--bd-surface-op` é composto, não cravado', () => {
    /*
     * A tentação aqui é escrever o valor resolvido à mão — é uma cor só, e o
     * número está medido logo acima. Seria o quarto valor a manter em dia, e o
     * primeiro a ficar para trás: foi exatamente assim que o `--bd-surface`
     * ficou branco quando o `<Card>` desceu.
     */
    const valor = tokenDoBoard('bd-surface-op');
    expect(
      valor.includes('var(--bd-surface)') && valor.includes('var(--bd-page)'),
      '`--bd-surface-op` parou de ser composto a partir de `--bd-surface` sobre\n'
        + `\`--bd-page\`. Está como \`${valor}\`. Ele existe para ser a MESMA cor do\n`
        + 'cartão, só que opaca — escrever o valor resolvido reabre a divergência\n'
        + 'que esta tarefa fechou.',
    ).toBe(true);
  });
});
