/**
 * A superfície do aviso de abertura das telas do Dev, em um lugar só.
 *
 * O QUE ELA É. O bloco que abre uma tela do Dev dizendo o que aquela ferramenta
 * faz: a caixa "Visão Geral" do `DevPageHeader`, montada por 14 páginas, e o
 * "Base Legal" do `BaseLegalCard`, no ICMS Saídas. Os dois ficam na MESMA posição
 * — primeiro elemento, antes de qualquer cartão —, então têm o mesmo papel e
 * vestem a mesma superfície.
 *
 * ═══ O DEFEITO ERA A ARESTA, NÃO O PREENCHIMENTO ═══
 *
 * Isto passou por três formas em 10/09/2026, e a terceira só existe porque a
 * segunda expôs a causa real. Vale escrever a sequência, porque o erro do meio é
 * fácil de repetir:
 *
 * 1. **hex cravado**, num componente cujo docstring diz que existe
 *    para dar "o verde-água do módulo". Virou token: era o `--accent-soft` a dois
 *    pontos de 255 de distância;
 * 2. **faixa escura** (`--surface-escura-2`). A usuária recusou a caixa clara e a
 *    medição deu razão a ela — o aviso não separava da página. A faixa separava a
 *    10,86, e criou o defeito seguinte: **ela passou a ganhar do título da tela**.
 *    Peso de elemento principal, posto de texto de apoio;
 * 3. **caixa branca e leve**, que é o que está aqui. Decisão dela, e ela inverteu
 *    o conserto pelo lado certo: em vez de tirar peso do nível de baixo, o peso
 *    vai para o nível de cima — o cabeçalho.
 *
 * **A causa que só apareceu na terceira volta.** A caixa clara não era invisível
 * por ser clara. Ela era invisível porque **não tinha borda**: a classe era
 * `bg-accent-soft border-accent-soft`, ou seja a borda tinha o valor do próprio
 * fundo. Medido, borda contra fundo: **1,00**. Não havia aresta nenhuma.
 *
 *   caixa antiga   fundo x pagina 1,04   borda x fundo 1,00   <- sem aresta
 *   caixa branca   fundo x pagina 1,15   borda x fundo 1,33   <- com aresta
 *
 * Então o enunciado certo NÃO é "caixa clara não separa de página clara" — é
 * **preenchimento sozinho não separa duas superfícies claras; a aresta separa**.
 * É por isso que 1,15 basta aqui e 1,04 não bastava lá: a caixa branca tem a
 * mesma separação de fundo que TODO cartão desta tela, e ganha a borda que todo
 * cartão tem. Ela lê como cartão porque é construída como cartão.
 *
 * ═══ E A ARESTA NEUTRA AINDA ERA CURTA PARA FORA ═══
 *
 * Com a borda do sistema (`border`, 86%) a caixa branca ficou correta e ainda
 * incomodou: "as cores estão muito parecidas, esse é o padrão mesmo?". Era o
 * padrão, e medir explicou por quê — a página está **exatamente no meio** entre o
 * cartão e a borda dele:
 *
 *   cartão branco  x  página 93%   1,153
 *   borda 86%      x  página 93%   1,153   <- o MESMO número
 *   borda 86%      x  cartão       1,329
 *
 * Ou seja a aresta neutra separa o cartão para DENTRO e não para FORA: o conjunto
 * cartão+borda lê como uma massa só contra o fundo. E mover a página não resolve,
 * é troca — a 90% o cartão sobe para 1,228 e a borda cai para 1,082; a 86% a borda
 * desaparece na página (1,008). Os 93% são o ótimo, não um erro. O vão inteiro,
 * da borda ao cartão, tem 14 pontos, e dividido em dois dá 1,15 para cada lado.
 * **Encurtar esse vão é outra frente** (a altura da pilha de superfícies), e não
 * se conserta aqui.
 *
 * O que se conserta aqui é o PAPEL: a borda deixa de ser neutra e passa a ser o
 * acento, a 25%. Isso faz duas coisas de uma vez — a aresta passa a existir para
 * fora, e a caixa deixa de ser idêntica ao cartão de filtros logo abaixo dela.
 * Ela volta a dizer "eu sou o aviso" sem precisar de fundo colorido:
 *
 *   border-accent-d/25  x cartão 1,480   x página 1,284
 *
 * Alfa, e não valor fixo, de propósito: se a pilha de superfícies mudar de altura,
 * a borda acompanha sozinha.
 *
 * ⚠️ Nunca dê à borda o valor do FUNDO — nem `border-card`, nem a cor do
 * preenchimento "para ficar limpo". É exatamente o movimento que produziu o
 * defeito original, e ele não aparece em revisão: a classe usa token, parece
 * certa, e a caixa some.
 *
 * O que sobrou do invariante das três alturas de página, e continua valendo como
 * aviso: a caixa foi medida contra 92%, 96% e 93% e deu 1,06 · 1,02 · 1,04 — ela
 * atravessou de mais escura que a página a mais clara que a página sem nunca
 * ficar visível. Um preenchimento claro sem aresta não se salva mexendo na página.
 *
 * ⚠️ Isto assume tema BASE, e hoje é verdade porque as rotas do Dev são área
 * `sistema`, que aponta para `null` no `areaTheme.ts`.
 */

/**
 * A caixa: superfície de cartão, borda de ACENTO, e — atenção — a cor do ÍCONE.
 *
 * O `[&>svg]:text-accent-d` não é preciosismo. O `ui/alert` traz
 * `[&>svg]:text-foreground` na string base, e aquilo gera um seletor de
 * especificidade 0,1,1 (classe + elemento). Uma classe posta no próprio `<svg>` é
 * 0,1,0 e **PERDE**. Vindo daqui, o `tailwind-merge` do `cn()` reconhece o mesmo
 * grupo e descarta o da base. Conferido no bundle.
 *
 * O ícone usa `accent-d` e não `primary` porque é elemento pequeno sobre
 * superfície clara, e o contrato do `.base-theme` reserva o acento cheio para
 * marca — anel, barra, ponto. `accent-d` sobre branco dá 6,74:1.
 *
 * O `p-3` é a parte "leve" do pedido dela: aperta o respiro que o `ui/alert` traz
 * de fábrica (`p-4`). Sem sombra, de propósito — elevação é o atributo que mais
 * puxa o olho, e este bloco é apoio.
 */
export const AVISO_CAIXA =
  'bg-card border-accent-d/25 text-foreground p-3 [&>svg]:text-accent-d';

/** O link dentro da caixa. Letra pequena sobre superfície clara: 6,74:1. */
export const AVISO_CAIXA_ACENTO = 'text-accent-d';

/** O corpo e o título da caixa, um degrau abaixo do `text-sm` de fábrica. */
export const AVISO_CAIXA_TEXTO = 'text-[13px] leading-relaxed';
