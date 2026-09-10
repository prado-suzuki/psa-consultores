/**
 * As duas receitas de botão da tela de Correções SPED, em um lugar só.
 *
 * O DEFEITO QUE ISTO DESFAZ. A receita "botão de contorno que se enche de cor no
 * hover" existia **sete vezes**: uma em cada uma das seis abas (`TabA170`,
 * `TabC170`, `TabD100`, `TabF100`, `TabF120`, `TabF130`) e uma como `const`
 * privada dentro do `CorrecoesActionButtons`. As seis das abas eram byte a byte
 * idênticas — medido, `uniq -c` devolveu `6` para uma única string.
 *
 * Sete cópias não são sete decisões: são uma decisão e seis lugares onde ela
 * envelhece separado. Foi por isso que a cor delas atravessou as rodadas de
 * conversão — quem procurou por família achou `emerald-600` em seis arquivos e
 * leu como seis casos, quando era um.
 *
 * O QUE A COR QUER DIZER, e por que estas são as tokens certas:
 *
 * · **confirmar** (enviar, exportar, salvar) é ação primária, e ação primária
 *   veste a ÂNCORA da área — nunca papel de status, que é sinal de estado. O
 *   `active:` desce um degrau, e o degrau tem nome: `accent-d`, o mesmo que
 *   pinta letra pequena e link no contrato;
 * · **destruir** (limpar a tabela) veste `destructive`, que desde a fusão dos
 *   semânticos é alias de `status-ajuste`.
 *
 * O `active:bg-destructive/90` usa alfa em vez de um degrau mais escuro porque
 * o contrato NÃO tem um `destructive-d`, e a regra da casa é consertar com valor
 * que já existe em vez de inventar um. É a mesma forma que o `task-modal` já usa
 * (`hover:bg-status-ajuste/90`).
 */

/** Estado desabilitado, comum às duas receitas: volta à superfície de repouso. */
const DESABILITADO =
  'disabled:opacity-50 disabled:hover:bg-card disabled:hover:text-foreground disabled:hover:border-input';

/** Ação primária: enviar, exportar, salvar. Veste a âncora da área. */
export const BOTAO_CONFIRMA =
  'bg-card text-foreground border border-input '
  + 'hover:bg-primary hover:text-primary-foreground hover:border-primary '
  + 'active:bg-accent-d active:text-primary-foreground '
  + 'transition-colors duration-200';

/** Ação destrutiva: limpar. Veste `destructive`. */
export const BOTAO_DESTRUTIVO =
  'bg-card text-foreground border border-input '
  + 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive '
  + 'active:bg-destructive/90 active:text-destructive-foreground '
  + 'transition-colors duration-200';

/** A forma usada nas abas e no rodapé de ações: a receita + desabilitado + `shrink-0`. */
export const BOTAO_CONFIRMA_COM_DISABLED = `${BOTAO_CONFIRMA} ${DESABILITADO} shrink-0`;
