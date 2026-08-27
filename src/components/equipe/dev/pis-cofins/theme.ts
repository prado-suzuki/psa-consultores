/**
 * Paleta das tabelas de Apuração PIS/COFINS (cabeçalho sticky em destaque,
 * mês expandido, valor de crédito/débito).
 *
 * Cada uma das três tabelas do módulo (`PeriodResultsTable`,
 * `BalanceteTreeTable`, `ApuracaoDataTable`) tinha sua PRÓPRIA cópia destas
 * mesmas classes, cada uma com o hex cravado de novo — mesma cor, três fontes
 * da verdade, sem ligação entre elas no código. Isso mora aqui agora.
 *
 * Os valores em `bg-[#...]`/`text-[#...]` são classes Tailwind arbitrárias: o
 * hex precisa continuar LITERAL no texto do arquivo para o scanner JIT do
 * Tailwind gerar a classe — interpolar uma variável ali (`` `bg-[${HEX}]` ``)
 * faz o Tailwind não reconhecer a classe e ela sai sem estilo no build de
 * produção. Por isso exportamos a STRING DA CLASSE pronta, não a cor crua
 * para montar em outro lugar — e por isso os combos badge (`bg-[#B84714]/15
 * text-[#B84714] border-[#B84714]/30 ...`) continuam escritos por extenso em
 * cada arquivo que os usa: não dá para montá-los aqui e importar.
 *
 * `ApuracaoDataTable.tsx` também migrou para cá (ver `PIS_HEADER_FOOTER_...`
 * abaixo para o que é variante dele, não duplicata).
 */

/** Teal de cabeçalho/linha em destaque — Tailwind teal-500 (#14B8A6). */
export const PIS_TEAL_HEX = '#14B8A6';
/** Teal mais claro — hover e mês expandido. Não é um degrau padrão do Tailwind. */
export const PIS_TEAL_LIGHT_HEX = '#3fd8c7';
/** Borda do cabeçalho — mais escuro que o teal de fundo, para não sumir nele. */
export const PIS_TEAL_BORDER_HEX = '#0B7A70';
/** Valor de crédito / linha "está na EFD". */
export const PIS_CREDITO_HEX = '#14B8A5';
/** Valor de débito. */
export const PIS_DEBITO_HEX = '#B84714';

export const PIS_HEADER_CLASS = 'bg-[#14B8A6] text-white border-[#0B7A70]';
export const PIS_MONTH_HEADER_CLASS = 'bg-[#3fd8c7] text-white border-[#0B7A70]';
export const PIS_MONTH_VALUE_CLASS = 'bg-[rgba(20,184,166,0.04)]';
export const PIS_HEADER_BUTTON_CLASS = 'text-white hover:bg-white/10 hover:text-white';
/** Linha/célula em destaque (bg cheio + hover mais claro) — sem a borda do cabeçalho. */
export const PIS_ROW_HIGHLIGHT_CLASS = 'bg-[#14B8A6] text-white hover:!bg-[#3fd8c7]';
export const PIS_POSITIVE_VALUE_CLASS = 'text-[#14B8A5]';
export const PIS_NEGATIVE_VALUE_CLASS = 'text-[#B84714]';

/** Fio de degradê na borda da primeira/última coluna do mês expandido — usa
 *  o teal-700 (#0F766E) já citado acima, dentro de um `linear-gradient`
 *  arbitrário. Compartilhado por `PeriodResultsTable` e `ApuracaoDataTable`. */
export const PIS_MONTH_LEFT_EDGE_CLASS =
  'relative overflow-visible before:pointer-events-none before:absolute before:inset-y-0 before:-left-3 before:w-3 before:bg-[linear-gradient(to_left,rgba(15,118,110,0.22),transparent)]';
export const PIS_MONTH_RIGHT_EDGE_CLASS =
  'relative overflow-visible after:pointer-events-none after:absolute after:inset-y-0 after:-right-3 after:w-3 after:bg-[linear-gradient(to_right,rgba(15,118,110,0.22),transparent)]';
