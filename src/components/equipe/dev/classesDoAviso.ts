/**
 * A superfície do aviso de abertura das telas do Dev, em um lugar só.
 *
 * O QUE ELA É. O bloco que abre uma tela do Dev dizendo o que aquela ferramenta
 * faz: a caixa "Visão Geral" do `DevPageHeader`, em quinze rotas, e o "Base Legal"
 * do `BaseLegalCard`, no ICMS Saídas. Os dois ficam na MESMA posição — primeiro
 * elemento, antes de qualquer cartão —, então têm o mesmo papel e vestem a mesma
 * superfície.
 *
 * POR QUE ELA VIROU FAIXA ESCURA, em 10/09/2026. A usuária recusou o fundo da
 * caixa, e a medição deu razão a ela — mas o argumento aqui **não** é um número
 * contra uma altura de página, e essa distinção custou uma correção no mesmo dia.
 *
 * O invariante é este: **uma caixa clara não separa de uma página clara.** Foi
 * medido em TRÊS alturas de página diferentes no dia, porque a pilha de
 * superfícies estava sendo mexida em paralelo — 92%, 96% e 93% —, e a caixa em
 * `--accent-soft` (94%) deu **1,06 · 1,02 · 1,04**. Ela atravessou de mais escura
 * que a página a mais clara que a página sem nunca ficar visível. Não existe
 * altura de página que resolva; o problema é a categoria da escolha.
 *
 * E o invariante **não é do piso**: vale nas três áreas, o que foi testado
 * esperando que quebrasse. Na Tax e na OSG o `--accent-soft` é oito pontos mais
 * ESCURO que o da base (86% contra 94%), o que deveria dar separação de sobra
 * contra uma página de 93%. Medido no `index.css`:
 *
 *   .base-theme  soft 172 40% 94%  ×  canvas 168 16% 93%   1,040
 *   .tax-theme   soft 186 64% 86%  ×  canvas 192 10% 93%   1,073
 *   .osg-theme   soft 186 62% 86%  ×  canvas  32 24% 93%   1,079
 *
 * Nenhuma separa. A saturação come o que a luminosidade daria — é por isso que
 * oito pontos de diferença rendem três centésimos de contraste. Se este aviso
 * um dia for para outra área, a caixa clara vai falhar lá igual.
 *
 * A faixa em `surface-escura-2` (14%) ganha nos dois eixos, e ganha com folga o
 * bastante para sobreviver à pilha se mexendo de novo:
 *
 *   caixa 94 (accent-soft)      1,04 separa ·  6,09 lê   ← o que estava no ar
 *   caixa branca (card 100)     1,15 separa ·  6,74 lê
 *   faixa da marca (primary 25) 4,82 separa ·  5,56 lê   ← recusada: o branco sobre
 *                                                          `--primary` é a falha de
 *                                                          5,5 já documentada
 *   faixa profunda (esc-2 14)  10,86 separa · 12,52 lê   ← esta
 *
 * A coluna "separa" é contra o `--canvas` de 10/09 (93%) e envelhece junto com
 * ele; a coluna "lê" é interna à faixa e não depende da página. Se for reconferir,
 * a medição está em `docs/geral/cor-o-que-falta.md`, com o comando.
 *
 * NADA INVENTADO: o 14% é o mesmo `--surface-escura-2` do meio do gradiente dos
 * cartões de categoria da página inicial do Dev, e o link usa `accent-soft` — o
 * valor que ANTES era o fundo desta caixa passou a ser a letra dela.
 *
 * ⚠️ Isto assume tema BASE, e hoje isso é verdade porque as rotas do Dev são área
 * `sistema`, que aponta para `null` no `areaTheme.ts`. Se algum dia este aviso for
 * montado dentro da Tax ou da OSG, atenção: lá o `--surface-escura-2` é MARINHO
 * (222 47% 11%), não teal — o par continua legível, mas a faixa troca de matiz.
 */

/**
 * A faixa: superfície, borda, cor do texto e — atenção — a cor do ÍCONE.
 *
 * O `[&>svg]:text-accent-soft` não é preciosismo. O `ui/alert` traz
 * `[&>svg]:text-foreground` na string base, e aquilo gera um seletor de
 * especificidade 0,1,1 (classe + elemento). Uma classe `text-accent-soft` posta
 * no próprio `<svg>` é 0,1,0 e **PERDE** — o ícone continuaria saindo em
 * `--foreground`, escuro, sobre uma faixa escura. Sem erro de build, sem aviso
 * de lint: só um ícone invisível.
 *
 * Vindo daqui, o `tailwind-merge` do `cn()` reconhece o mesmo grupo (mesma
 * variante, mesma utilitária) e descarta o `text-foreground` da base. É a forma
 * que funciona, e foi conferida no bundle.
 */
export const AVISO_FAIXA =
  'bg-surface-escura-2 border-surface-escura-2 text-primary-foreground shadow-lg '
  + '[&>svg]:text-accent-soft';

/** O link dentro da faixa. O `accent-soft` é o fundo antigo virado letra. */
export const AVISO_FAIXA_ACENTO = 'text-accent-soft';
