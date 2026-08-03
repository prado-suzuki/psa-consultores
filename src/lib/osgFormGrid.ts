/**
 * Grades de formulário que reagem ao CONTÊINER, não à janela.
 *
 * Antes: `md:grid-cols-3` / `md:col-span-2`. O `md:` mede a JANELA, então numa
 * coluna estreita de uma tela larga o formulário insistia em três colunas de
 * ~110px, e os campos de largura dupla/tripla pediam colunas que não existiam
 * (as "colunas fantasma" que deformavam o campo "UF do documento").
 *
 * Agora a decisão é da largura do contêiner que rola o formulário: quem hospeda
 * o formulário marca esse contêiner com `formScopeCls`, e cada grade usa
 * `formGridCls` / `formSpanCls`. O limite é 42rem = 672px:
 *   • modal de cadastro (max-w-4xl com px-6) → 848px de contêiner → multi-coluna,
 *     igual ao que já era em qualquer janela de trabalho;
 *   • coluna estreita do modo Classificar (384px) → uma coluna limpa, e os
 *     col-span somem junto, sem coluna fantasma.
 *
 * A implementação de `@container` / `@2xl:` é um plugin local em
 * tailwind.config.ts (o Tailwind 3 não tem container queries nativas).
 */

/** Marca o elemento que rola o formulário como contêiner de consulta. */
export const formScopeCls = '@container';

/** Largura de contêiner (px) a partir da qual as grades saem de uma coluna. */
export const FORM_GRID_MIN_PX = 672;

const FORM_GRID: Record<2 | 3 | 4, string> = {
  2: 'grid grid-cols-1 @2xl:grid-cols-2',
  3: 'grid grid-cols-1 @2xl:grid-cols-3',
  4: 'grid grid-cols-1 @2xl:grid-cols-4',
};

const FORM_SPAN: Record<2 | 3 | 4, string> = {
  2: '@2xl:col-span-2',
  3: '@2xl:col-span-3',
  4: '@2xl:col-span-4',
};

/** Grade de formulário: uma coluna em contêiner estreito, `cols` colunas acima do limite. */
export const formGridCls = (cols: 2 | 3 | 4): string => FORM_GRID[cols];

/** Campo largo: ocupa `cols` colunas só quando a grade realmente tem colunas. */
export const formSpanCls = (cols: 2 | 3 | 4): string => FORM_SPAN[cols];
