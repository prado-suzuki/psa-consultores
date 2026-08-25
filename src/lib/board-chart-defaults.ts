/**
 * Defaults de gráfico da área Board.
 *
 * ── Cor por TOKEN, não por hexadecimal ────────────────────────────────
 * Este arquivo era seis hexadecimais cravados (índigo #4B63F7, azul #3478F5,
 * roxo #6B46E8…) e três cinzas azulados de eixo. Agora aponta para os tokens
 * do Board (`--bd-*`, ver o bloco "BOARD v5" no index.css). Recharts renderiza
 * SVG inline, então `var(--token)` resolve nos atributos `fill`/`stroke` sem
 * ler nada em runtime — é o mesmo caminho de `clientes-os/shared.ts`.
 *
 * ── O eixo era o pior contraste da área ───────────────────────────────
 * `AXIS_STYLE` pintava rótulo de 9px em #B0BBC8: 1,95:1 sobre o branco do
 * card. Como é TEXTO (mês, valor, nome), passou para 10,5px no `--bd-ink3`
 * (5,6:1). Grade e linha de eixo continuam em tom de borda — ali a régua é
 * decoração, e o mínimo de 4,5:1 não se aplica.
 *
 * ── Geometria da referência ───────────────────────────────────────────
 * Barra com topo arredondado de 6px (era 3), grade só horizontal e tracejada,
 * tooltip com o raio e a sombra do card. `BAR_RADIUS` existe para as telas
 * não repetirem `[6, 6, 0, 0]` à mão e divergirem.
 */

export const CHART_COLORS = {
  /** Série única / série principal — o teal institucional. */
  accent: 'var(--bd-accent)',
  /** Série de COMPARAÇÃO (ano anterior, meta, referência): o mesmo teal
   *  claro. Antes era o #CBD5E1 do Tailwind, um cinza que não pertencia a
   *  paleta nenhuma; em par com a série principal, o degrau claro do próprio
   *  acento diz "é a mesma medida, outro período". */
  accentSoft: 'var(--bd-accent-l)',
  /** Áreas do negócio — tons de tag/área do sistema, não azul e roxo de web. */
  tax: 'var(--bd-blue)',
  /* `--bd-green` e não `--bd-go`: os dois são verdes, mas o `-go` é o ACENTO da
     marca, reservado para série única/principal (regra em
     `clientes-os/shared.ts`) e também usado como ESTADO "no prazo". Como série
     categórica ele reprovava no validador de paleta — croma 0,097, abaixo do
     piso, lendo como cinza-esverdeado ao lado do azul e do magenta. */
  osg: 'var(--bd-green)',
  dev: 'var(--bd-purple)',
  /** Estado. */
  warn: 'var(--bd-warn)',
  risk: 'var(--bd-risk)',
};

/** Topo arredondado das barras — a silhueta da referência. */
export const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];

export const AXIS_STYLE = {
  tick: { fontSize: 10.5, fill: 'var(--bd-ink3)', fontFamily: "'Instrument Sans', sans-serif" },
  axisLine: { stroke: 'var(--bd-line)' },
  tickLine: false as const,
};

export const GRID_STYLE = {
  strokeDasharray: '4 4',
  stroke: 'var(--bd-line2)',
  vertical: false as const,
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bd-surface)',
    border: '1px solid var(--bd-line)',
    borderRadius: 12,
    fontSize: 12,
    fontFamily: "'Instrument Sans', sans-serif",
    boxShadow: 'var(--bd-sh-md)',
    padding: '9px 12px',
  },
  labelStyle: { color: 'var(--bd-ink)', fontWeight: 600, marginBottom: 3 },
  itemStyle: { color: 'var(--bd-ink2)' },
  cursor: { fill: 'var(--bd-accent-t)' },
};

/** Legenda: quadradinho pequeno e rótulo em tom de texto, nunca na cor da
 *  série (o Recharts pinta o rótulo com a cor da barra, inline, e uma barra
 *  clara produzia rótulo ilegível — foi o caso do "2025" a 1,48:1). */
export const LEGEND_STYLE = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 11, paddingTop: 6 },
};
