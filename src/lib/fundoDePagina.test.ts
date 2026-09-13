import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Catraca do fundo de página: NENHUM layout pinta o próprio fundo.
 *
 * O DEFEITO QUE ISTO FECHA, e ele aconteceu duas vezes seguidas. Cada layout
 * escrevia a cor da própria página, e cinco dos oito escreveram `bg-muted` — a
 * superfície REBAIXADA, cuja luminosidade é calibrada para uma pílula saltar em
 * cima, não para cobrir a tela. Espalhada, ela vira parede de tinta.
 *
 * Em 03/09/2026 o `FiscalLayout` foi corrigido sozinho, e a correção não
 * alcançou os outros quatro (`EquipeLayout`, `DevLayout`, `AdminLayout`,
 * `FixosLayout` — 58 páginas). Eles só apareceram em 10/09, quando a página
 * desceu para 93% e alguém perguntou se as outras rotas tinham ido junto. Não
 * tinham: o `--muted` delas foi para 89% e a página inteira das 58 escureceu por
 * tabela, na direção errada.
 *
 * O padrão é o que importa e não o valor: **decisão repetida em oito arquivos
 * diverge**. Não é descuido de quem escreveu — é o formato que cobra a mesma
 * escolha oito vezes e não avisa quando uma delas discorda.
 *
 * Por isso a correção não foi trocar `bg-muted` por `bg-canvas` nos cinco: isso
 * deixaria a nona ocorrência nascer errada do mesmo jeito. O `body` pinta uma
 * vez, no `index.css`, e layout que não faz nada nasce certo.
 *
 * O QUE ESTE TESTE NÃO COBRE, de propósito: página solta fora de layout
 * (`Index.tsx`, `Auth.tsx`, `NotFound.tsx`). Elas pintam o próprio fundo, e duas
 * pintam com cor CRUA (`bg-gray-50`, `bg-white`) — dívida da frente de cor crua,
 * medida em `docs/geral/cor-o-que-falta.md`, e não deste contrato. O
 * `MapaLayout` também fica fora: o CSS dele é legado e escapa ao Tailwind.
 */

const RAIZ = resolve(__dirname, '..');

/** Classe ou estilo que pinta fundo, no elemento que cobre a tela. */
const PINTA_FUNDO = /\b(bg-[a-z0-9[\]/.-]+|backgroundColor)\b/;

/** O elemento de página de um layout é o que declara `min-h-screen`. */
const ELEMENTO_DE_PAGINA = /min-h-screen/;

/** A superfície REBAIXADA, que nunca é fundo de página — nem de layout, nem de página solta. */
const SUPERFICIE_REBAIXADA = /\bbg-muted\b/;

function arquivosDeLayout(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivosDeLayout(caminho));
    } else if (/Layout.*\.tsx$/.test(nome) && !nome.endsWith('.test.tsx')) {
      achados.push(caminho);
    }
  }
  return achados;
}

function arquivosTsx(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivosTsx(caminho));
    } else if (nome.endsWith('.tsx') && !nome.endsWith('.test.tsx')) {
      achados.push(caminho);
    }
  }
  return achados;
}

describe('fundo de página: quem pinta é o body, e só ele', () => {
  it('nenhum layout pinta o próprio fundo de página', () => {
    const culpados: string[] = [];

    for (const caminho of arquivosDeLayout(join(RAIZ, 'components'))) {
      const linhas = readFileSync(caminho, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        if (!ELEMENTO_DE_PAGINA.test(linha)) return;
        const pintura = linha.match(PINTA_FUNDO);
        if (pintura) {
          culpados.push(
            `${relative(RAIZ, caminho)}:${i + 1} — "${pintura[0]}" no elemento de página`,
          );
        }
      });
    }

    expect(
      culpados,
      'layout pintando o próprio fundo. O fundo de página é do `body` (ver a nota\n' +
        'no `index.css`): tire a classe do layout em vez de trocá-la pela certa —\n' +
        'trocar deixa a próxima nascer errada igual.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('nenhuma PÁGINA cobre a tela com a superfície rebaixada', () => {
    // A regra acima só olha `*Layout.tsx`, e foi por essa fresta que a NONA
    // ocorrência passou: `EquipeChamados` tem header próprio, não entra em
    // layout nenhum, e pintava `min-h-screen bg-muted` — 89%, a superfície
    // calibrada para uma pílula saltar em cima. Ninguém viu enquanto a página
    // das outras rotas também era cinza; quando a página virou branca em
    // 12/09/2026, ela ficaria a única parede de tinta do produto.
    //
    // O recorte é mais estreito que o da regra acima DE PROPÓSITO. Página solta
    // fora de layout pode precisar de fundo próprio (`Auth`, `Index`,
    // `NotFound`, o Portal do Cliente), e a dívida de cor crua delas está em
    // `docs/geral/cor-o-que-falta.md`. O que nunca pode é o valor: `--muted` é
    // superfície REBAIXADA, e rebaixada em relação a algo que, cobrindo a tela,
    // não existe mais.
    const culpados: string[] = [];

    for (const caminho of arquivosTsx(join(RAIZ, 'pages'))) {
      const linhas = readFileSync(caminho, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        if (!ELEMENTO_DE_PAGINA.test(linha)) return;
        if (!SUPERFICIE_REBAIXADA.test(linha)) return;
        culpados.push(`${relative(RAIZ, caminho)}:${i + 1} — "bg-muted" cobrindo a tela`);
      });
    }

    expect(
      culpados,
      'página cobrindo a tela com `bg-muted`. A superfície REBAIXADA não é fundo\n' +
        'de página: troque por `bg-background`, que é o que o `body` pinta.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('o body declara o fundo da página, e ele é o `--background`', () => {
    // A outra metade do contrato: com os layouts calados, se o `body` perder a
    // declaração ninguém pinta nada e a tela fica à mercê do agente de usuário.
    // Esta asserção é o que impede a correção acima de virar uma tela sem fundo.
    //
    // `bg-background` E NÃO `bg-canvas`, desde 12/09/2026: a página é branca. O
    // `--canvas` continua existindo com o valor de antes, mas como RAIZ da
    // escada da área (`muted = canvas −4`, `border = canvas −7`, cobrado em
    // `paletaDeArea.ts`) e não como fundo de página. Um `bg-canvas` de volta
    // aqui traria o cinza de 93% junto — ver a nota do `body` no `index.css` e
    // `docs/geral/comparacoes-de-cor/o-fundo-que-some.html`.
    const css = readFileSync(join(RAIZ, 'index.css'), 'utf8');
    const corpo = css.match(/\bbody\s*\{[^}]*\}/);
    expect(corpo, 'o `index.css` não tem regra para o `body`').not.toBeNull();
    expect(corpo?.[0], 'o `body` deixou de pintar `bg-background`').toMatch(
      /@apply[^;]*\bbg-background\b/,
    );
  });
});
