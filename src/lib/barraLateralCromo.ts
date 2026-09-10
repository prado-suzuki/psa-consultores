/**
 * O CROMO da barra lateral: as classes que desenham um item de menu.
 *
 * Companheiro de `sidebarMedidas.ts`, e a divisão entre os dois é de propósito:
 * lá estão as MEDIDAS (quanto mede o trilho, quanto recua o rodapé), aqui está
 * a APARÊNCIA (o que é um item ativo, que face a barra usa). Medida corta
 * avatar; cromo não corta nada — erram de formas diferentes e mudam por motivos
 * diferentes.
 *
 * ── De onde este desenho veio ────────────────────────────────────────────
 * Do Board, por escolha da usuária. Ela olhou as nove barras e apontou a dele:
 * chrome claro, item ativo em PÍLULA CHEIA (e não em tinta de 10%), rótulo de
 * grupo em caixa alta, Instrument Sans. As outras oito pintavam o ativo com
 * `bg-primary/10 text-primary` — tinta clara com letra colorida.
 *
 * ── A cor NÃO mora aqui ──────────────────────────────────────────────────
 * Nenhuma classe abaixo nomeia cor: elas nomeiam PAPEL (`bg-primary`,
 * `text-foreground`), e quem resolve o tom é a classe de tema que o
 * `AreaThemeProvider` carimba no `<html>` a cada rota. É isso que faz a mesma
 * caixa sair teal no Digital, azul-petróleo na Tax e musgo na OSG sem que este
 * arquivo conheça nenhuma das três.
 *
 * ── Por que `--primary` e não `--accent-d` ───────────────────────────────
 * O Board pintava a pílula com `--bd-chrome-active`, que aponta para
 * `--accent-d`. No piso isso é o teal escuro da marca e está certo; na Tax e na
 * OSG, não: as duas apontam `--accent-d` para `--status-andamento` — um token
 * de STATUS pintando IDENTIDADE. Na OSG dava para ver: a âncora da área é o
 * musgo (149 66% 22%) e o acento é ciano (186 62% 26%), então a pílula saía
 * ciano numa barra verde.
 *
 * Não havia contraste no caminho, ao contrário do que a nota do `index.css`
 * sugere. O `4,40:1` registrado lá é do `#0D877C` — o teal cheio que o Board
 * teve cravado à mão até `--bd-accent` passar a ler o token. Medido com letra
 * branca, o `--primary` de hoje dá:
 *
 *   piso  #0a756c  5,54:1      tax  #0e4958  9,90:1      osg  #135d37  7,92:1
 *
 * Os três passam AA, e os três temas declaram `--primary-foreground: 0 0% 100%`
 * — daí a pílula ser `bg-primary text-primary-foreground`, sem degrau novo.
 */

import { cn } from '@/lib/utils';

/**
 * A face do cromo. É `font-barra` (Instrument Sans), definida em
 * `tailwind.config.ts` — ver a nota lá sobre por que ela tem nome de papel.
 */
export const FACE_DA_BARRA = 'font-barra';

export interface OpcoesDoItemDaBarra {
  /** O item aponta para a rota atual. */
  ativo: boolean;
  /** Barra recolhida: sobra o ícone, centralizado. */
  trilho: boolean;
  /** Item dentro de um grupo aberto: um degrau menor e mais discreto. */
  sub?: boolean;
}

/**
 * As classes de uma linha do menu.
 *
 * O ativo é pílula CHEIA, e é isso que difere do que as outras oito faziam. A
 * tinta de 10% com letra colorida (`bg-primary/10 text-primary`) marca menos e
 * envelhece pior: em cima dela um segundo estado — hover, foco — não tem para
 * onde ir sem virar uma terceira tinta da mesma cor.
 *
 * Recolhido, o rótulo NÃO é desmontado pelo chamador e sim omitido por ele com
 * `{!trilho && …}`; o que este módulo garante é a caixa certa em volta
 * (`justify-center`, sem `gap` sobrando). O `gap` importa: ele continua
 * ocupando espaço mesmo com o texto reduzido a zero, e é o que empurra o ícone
 * para fora do centro — o mesmo erro que o cartão do usuário já teve.
 */
export function classesItemDaBarra({ ativo, trilho, sub = false }: OpcoesDoItemDaBarra): string {
  return cn(
    'flex items-center rounded-[10px] transition-colors duration-150',
    FACE_DA_BARRA,
    sub ? 'text-[12.5px]' : 'text-[13px]',
    trilho
      ? // QUADRADO, e não `w-full`. Aberta, a linha ocupa a largura toda e
        // isso é o certo — o rótulo vem junto. Recolhida, `w-full` faz a
        // pílula virar uma barra DEITADA de 56px ao lado de ícones soltos de
        // 15px: o item ativo passa a ser a peça mais larga do trilho, e a
        // coluna lê torta. Aqui ela vira um quadrado de 40px centralizado —
        // o mesmo `seloCabecalhoPx` que as outras barras usam no selo da
        // área, para o trilho ser uma coluna de peças do mesmo tamanho.
        //
        // Sem `gap` também: com o rótulo fora ele vira recuo morto de 10px e
        // empurra o ícone para fora do centro (o erro que o cartão já teve).
        'h-10 w-10 mx-auto justify-center p-0'
      : 'w-full gap-2.5 px-2.5 py-2',
    ativo
      ? 'bg-primary text-primary-foreground font-semibold'
      : cn(
          'font-medium hover:bg-muted',
          // Item de submenu entra um degrau abaixo do pai: ele já vive dentro
          // de um grupo aberto, e repetir o peso do pai apaga a hierarquia.
          sub ? 'text-muted-foreground hover:text-foreground' : 'text-foreground',
        ),
  );
}

/**
 * O rótulo em caixa alta que separa blocos do menu ("Diretoria", "Gestão de
 * Time"). Hoje só o Board tem, e é dele que a medida vem.
 */
export function classesEyebrowDaBarra(trilho: boolean): string {
  return cn(
    FACE_DA_BARRA,
    'px-2.5 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground',
    // Recolhido o rótulo não cabe, mas sumir com ele colapsaria o respiro
    // entre os blocos: ele fica invisível e continua ocupando a altura.
    trilho && 'invisible h-2 mb-1.5 overflow-hidden',
  );
}
