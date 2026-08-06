/**
 * Primitivas visuais compartilhadas do dashboard "Clientes e OS": paleta,
 * formatadores de número e estilos de tabela/eixo.
 *
 * Vivem aqui (e não na página) porque o bloco de faturamento por centro de
 * custo/cliente foi extraído para `FaturamentoDetalhe` e precisa exatamente dos
 * mesmos estilos — duplicar a paleta seria o caminho para os cards divergirem.
 */

// Paleta da marca PSA (tokens de src/index.css: --lime-*, --teal-*, --osg-moss).
export const PSA = {
  lime: '#8CC63F',
  teal: '#0D877C',
  moss: '#125837',
  tealLight: '#4FB0A5',
  amber: '#D4820A',
  risk: '#D03040',
  grey: '#9AA7B4',
};
export const SERIES = [PSA.teal, PSA.lime, PSA.moss, PSA.tealLight, PSA.amber, PSA.grey];

// ── Formatadores ───────────────────────────────────────────────────────
export const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
export const brlMil = (v: number) => `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;
export const milAxis = (v: number) => (v === 0 ? '0' : `${(v / 1000).toLocaleString('pt-BR')} mil`);
export const num = (v: number, dec = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: dec });
export const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
export const mesLabel = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`;
export const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const mesColuna = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
/** Célula da matriz: R$ sem prefixo (o título já diz R$); vazio vira travessão. */
export const celulaBRL = (v: number | undefined) => (!v ? '—' : Math.round(v).toLocaleString('pt-BR'));
/** Sem denominador não existe percentual — mostra travessão em vez de inventar. */
export const pctDoTotal = (v: number, total: number) => (total <= 0 ? '—' : `${((v / total) * 100).toFixed(1)}%`);
/** Faixa de meses comparada: 'jan–jul/25' (ou 'jul/25' quando é um mês só). */
export const rotuloMeses = (meses: string[]) => {
  if (meses.length === 0) return '—';
  const ordenados = [...meses].sort();
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  return primeiro === ultimo ? mesColuna(primeiro) : `${mesColuna(primeiro)}–${mesColuna(ultimo)}`;
};
/** Variação sempre com sinal; sem base de comparação vira travessão. */
export const variacaoLabel = (v: number | null) =>
  (v == null ? '—' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
export const corVariacao = (v: number | null) => (v == null ? PSA.grey : v < 0 ? PSA.risk : PSA.lime);

/** O eixo acompanha o maior rótulo (nome de cliente/centro de custo não pode cortar). */
export const larguraEixo = (linhas: Array<{ label: string }>) =>
  Math.min(340, Math.max(120, Math.max(0, ...linhas.map((l) => l.label.length)) * 6.4));

// Eixos dos gráficos: texto mais escuro/legível (o default do board é cinza-claro demais).
export const AXIS = {
  tick: { fontSize: 11, fill: '#566173', fontFamily: "'Instrument Sans', sans-serif" },
  axisLine: { stroke: '#E4E9F0' },
  tickLine: false as const,
};

// ── Estilos de tabela ──────────────────────────────────────────────────
export const th: React.CSSProperties = {
  textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 700,
  color: 'var(--board-v4-ink3)', borderBottom: '1px solid var(--board-v4-line)', whiteSpace: 'nowrap',
  cursor: 'pointer', userSelect: 'none',
};
export const td: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, color: 'var(--board-v4-ink)',
  borderBottom: '1px solid var(--board-v4-line)',
};

// Matriz dimensão × mês: cabeçalho e coluna do nome ficam grudados na rolagem
// (a tabela rola nos dois eixos quando o período pega muitos meses).
const SURFACE = 'var(--board-v4-surface)';
export const thFixo: React.CSSProperties = {
  padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--board-v4-ink3)',
  borderBottom: '1px solid var(--board-v4-line)', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, background: SURFACE, zIndex: 2,
};
export const tdNome: React.CSSProperties = {
  ...td, fontWeight: 500, whiteSpace: 'nowrap',
  position: 'sticky', left: 0, background: SURFACE, zIndex: 1,
};
export const tdTotal: React.CSSProperties = {
  ...td, whiteSpace: 'nowrap', position: 'sticky', bottom: 0, background: SURFACE,
  borderTop: '2px solid var(--board-v4-line)', zIndex: 2,
};
export const numerico: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
