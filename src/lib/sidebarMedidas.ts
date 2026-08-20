/**
 * As medidas do trilho recolhido da barra lateral, num só lugar.
 *
 * Elas existem porque o trilho de 64px **não cabia**: o rodapé da barra tem 16px
 * de recuo de cada lado e o cartão do usuário mais 12px, então sobravam 8px de
 * largura útil para um avatar de 32px e o círculo vazava do chip. O que corta é
 * o **recuo somado**, não a largura do trilho — por isso as três medidas abaixo
 * (trilho, recuo do cabeçalho, recuo do chip) andam juntas, e mexer numa sem as
 * outras traz o corte de volta. A aritmética está travada em
 * `sidebarMedidas.test.ts`.
 *
 * Por que aqui e não em `useSidebarRecolhimentoController.ts`: aquele arquivo é
 * o **comportamento** (quando a barra recolhe) e é consumido como hook; estas
 * são **medidas**, dados puros, consumidos também por quem não é layout — o
 * `SidebarCartaoUsuario` e o `Layout` do Mapeamento, que precisa do número em px
 * para alimentar a variável CSS do módulo legado. `src/lib/` é onde este
 * repositório põe módulo puro (ver AGENTS.md, "Anatomia da decomposição").
 *
 * Contexto e alternativas descartadas em
 * `docs/geral/sidebar-recolhe-em-tela-larga.md`.
 */

/**
 * Medidas em px. Servem para conta e para CSS de módulo legado; quem monta
 * classe Tailwind usa os helpers abaixo, não estes números.
 */
export const MEDIDAS_TRILHO_SIDEBAR = {
  /** Trilho recolhido: 5rem. Media 4rem e cortava o avatar. */
  larguraRecolhidaPx: 80,
  /** Barra aberta: 16rem. */
  larguraAbertaPx: 256,
  /** Recuo do rodapé (e do cabeçalho recolhido) da barra: `p-4`. */
  recuoRodapePx: 16,
  /** Recuo horizontal do chip do usuário quando recolhido: `px-2`. */
  recuoChipRecolhidoPx: 8,
  /** Diâmetro do avatar do cartão do usuário: `h-8 w-8`. */
  avatarPx: 32,
  /** Selo da área no cabeçalho da barra: `h-10 w-10`. */
  seloCabecalhoPx: 40,
} as const;

/**
 * Largura da barra. As strings literais ficam aqui de propósito: o Tailwind só
 * gera a classe se ela aparecer escrita no fonte, então `w-20`/`w-64` não podem
 * ser montadas por concatenação em nenhum layout.
 */
export function classeLarguraBarra(recolhida: boolean): string {
  return recolhida ? 'w-20' : 'w-64';
}

/**
 * Recuo do cabeçalho da barra. Recolhido é `p-4`, e não `p-6`: com `p-6`
 * sobrariam 32px de largura útil para o selo de 40px da área.
 */
export function classeRecuoCabecalho(recolhida: boolean): string {
  return recolhida ? 'p-4' : 'p-6';
}

/**
 * A largura em CSS, para os layouts que posicionam o botão flutuante de
 * recolher com `left: calc(var(--sidebar-width) - 12px)`.
 */
export function larguraBarraCss(recolhida: boolean): string {
  const { larguraRecolhidaPx, larguraAbertaPx } = MEDIDAS_TRILHO_SIDEBAR;
  return `${recolhida ? larguraRecolhidaPx : larguraAbertaPx}px`;
}
