/**
 * O cromo das abas de dentro de uma seção — a fileira que troca de conteúdo
 * DENTRO de um cartão, e não a barra lateral que troca de tela.
 *
 * Duas telas do Controle de Acessos desenhavam essa fileira, e as duas
 * escreviam a mesma string de classe: "Estrutura / Centros de Custo" no
 * cadastro, e "Papéis / Áreas de acesso / Equipes" no eixo da matriz. Cinco
 * cópias da mesma decisão, e nenhuma delas sabendo da outra.
 *
 * ── Este desenho é o ANTIGO, e isso está registrado de propósito ─────────
 * `bg-primary/10 text-primary` no ativo é tinta clara com letra colorida — o
 * mesmo idioma que as nove barras laterais usavam antes de a usuária escolher a
 * pílula cheia do Board (ver `barraLateralCromo.ts`, que conta a história e traz
 * os contrastes medidos nos três temas). As abas de seção nunca passaram por
 * essa mesa.
 *
 * Trazer a pílula para cá é decisão dela, não conclusão deste arquivo: aba
 * dentro de cartão e item de barra lateral têm peso diferente na página, e a
 * pílula cheia pode virar o elemento mais saturado de uma tela em que ela não é
 * o assunto. O que este arquivo garante é que, quando a decisão vier, ela é uma
 * linha e não uma caçada — que era o estado de cinco minutos atrás.
 *
 * A cor não mora aqui: as classes nomeiam PAPEL (`primary`, `border`), e quem
 * resolve o tom é a classe de tema que o `AreaThemeProvider` carimba no `<html>`.
 */

/** A fileira. Quem precisar de quebra de linha acrescenta `flex-wrap h-auto`. */
export const CLASSES_DA_LISTA_DE_ABAS = 'bg-foreground/[0.05] border border-border';

/** Uma aba. O estado ativo é o único que a classe descreve. */
export const CLASSES_DA_ABA =
  'data-[state=active]:bg-primary/10 data-[state=active]:text-primary';
