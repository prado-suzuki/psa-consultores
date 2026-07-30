/**
 * Classes das "pílulas" de propriedade dos modais de tarefa e de projeto.
 *
 * Os dois modais mostram status/responsável/datas na mesma faixa compacta logo
 * abaixo do título. As classes vivem aqui para que essa identidade visual tenha
 * um único lugar de manutenção — mudar a silhueta da pílula muda nos dois.
 */

export const CHIP_LABEL =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';

/**
 * `[&>span]:line-clamp-none` é necessário: a base do SelectTrigger aplica
 * `line-clamp-1` no span do valor, e o `display:-webkit-box` que ela traz
 * quebraria o avatar/ponto em cima do texto.
 */
export const CHIP_TRIGGER =
  'h-9 gap-2 rounded-lg border-transparent bg-background px-2.5 text-sm font-medium shadow-sm ring-offset-0 focus:ring-1 disabled:cursor-default disabled:opacity-100 [&>span]:line-clamp-none [&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-2';

export const CHIP_BUTTON =
  'h-9 w-full justify-start gap-2 rounded-lg bg-background px-2.5 text-sm font-medium shadow-sm hover:bg-background disabled:cursor-default disabled:opacity-100';

/**
 * Input com a mesma silhueta das pílulas (data, número). `md:text-sm` repetido
 * de propósito: a base do Input traz essa media query e ela venceria o tamanho
 * sem a variante aqui.
 */
export const CHIP_INPUT =
  'h-9 rounded-lg border-transparent bg-background px-2.5 text-sm font-medium shadow-sm md:text-sm disabled:cursor-default disabled:opacity-60';
