/**
 * Primitivas visuais compartilhadas do dashboard "Clientes e OS": paleta,
 * formatadores de número e estilos de tabela/eixo.
 *
 * Vivem aqui (e não na página) porque o bloco de faturamento por centro de
 * custo/cliente foi extraído para `FaturamentoDetalhe` e precisa exatamente dos
 * mesmos estilos — duplicar a paleta seria o caminho para os cards divergirem.
 */
import { GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';

/* ── Cor: só token, nunca hexadecimal ──────────────────────────────────
 *
 * Este bloco era uma lista de sete hexadecimais ("paleta da marca PSA"). O
 * comentário dizia que vinham do index.css, mas eram valores cravados, e por
 * isso o MESMO dashboard — que roda no Board, na Tax (/equipe/tax/gerencial) e
 * na OSG (/equipe/osg/gerencial) a partir de um componente só — saía lime e teal
 * em qualquer área: dentro do OsgLayout a barra de faturamento continuava lime.
 *
 * Recharts renderiza SVG inline, então as custom properties que o layout da área
 * põe no <html> cascateiam até os atributos `fill`/`stroke`: `hsl(var(--token))`
 * resolve sozinho no tema vigente, sem ler nada em runtime. É o mesmo caminho de
 * src/components/dashboard/momentum/HatchedBar.tsx.
 *
 * A cor entra por PAPEL, e cada papel tem uma fonte:
 *   ACENTO  → série ÚNICA (uma barra só) e destaque de interface;
 *   SERIES  → paleta CATEGÓRICA (várias séries que não têm ordem nem estado);
 *   PAPEL   → estado (bom / atenção / problema) — aqui a cor significa alguma
 *             coisa, e quem responde são os papéis de status da área;
 *   NEUTRO  → o que não é dado (eixo, rótulo, bucket "não classificado").
 */

/** Acento da área: `--primary` é o teal no Board e na Tax, o musgo na OSG. */
export const ACENTO = 'hsl(var(--primary))';

/** Cinza do sistema: eixo, rótulo secundário e o bucket "não classificado". */
export const NEUTRO = 'hsl(var(--muted-foreground))';

/**
 * Estado. Não é paleta categórica: é o papel de status da área, e por isso
 * "vencido" fica vermelho na Tax e carmim na OSG sem condicional nenhuma.
 */
export const PAPEL = {
  bom: 'hsl(var(--status-feito))',
  atencao: 'hsl(var(--status-alerta))',
  problema: 'hsl(var(--status-ajuste))',
};

/**
 * Paleta categórica: os quatro tons de tag da área (`--tag-a` … `--tag-d`).
 *
 * A ordem NÃO é alfabética de propósito — ela alterna quente/frio e
 * claro/escuro (verde escuro → quente claro → frio escuro → uva clara), que é o
 * arranjo em que os quatro continuam separáveis sob protanopia/deutanopia. Os
 * dois primeiros são as âncoras da área, então um gráfico de duas séries sai na
 * cara da área. Contrato e números dos tons: ver o bloco `--tag-*` no index.css.
 *
 * São QUATRO porque quatro é o que as duas séries reais pedem — `tipo_cliente`
 * tem quatro valores e `situacao_label` tem quatro rótulos conhecidos — e porque
 * um quinto tom não caberia: sob daltonismo só existem quatro classes dentro da
 * faixa de luminosidade que o chip da tag permite. Se um dia uma série passar de
 * quatro categorias, o caminho é agrupar o excedente em "Outros", não sortear um
 * quinto tom.
 */
export const SERIES = [
  'hsl(var(--tag-a))',
  'hsl(var(--tag-d))',
  'hsl(var(--tag-b))',
  'hsl(var(--tag-c))',
];

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
/** Variação é ESTADO (caiu / subiu), não categoria — daí o papel de status. */
export const corVariacao = (v: number | null) => (v == null ? NEUTRO : v < 0 ? PAPEL.problema : PAPEL.bom);

/** O eixo acompanha o maior rótulo (nome de cliente/centro de custo não pode cortar). */
export const larguraEixo = (linhas: Array<{ label: string }>) =>
  Math.min(340, Math.max(120, Math.max(0, ...linhas.map((l) => l.label.length)) * 6.4));

// Eixos dos gráficos: texto mais escuro/legível (o default do board é cinza-claro
// demais). Rótulo no neutro secundário do tema e linha do eixo no `--border` —
// os dois acompanham a temperatura da área (a Tax é marfim, a OSG é areia).
export const AXIS = {
  tick: { fontSize: 11, fill: NEUTRO, fontFamily: "'Instrument Sans', sans-serif" },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: false as const,
};

/**
 * Grade e tooltip: os defaults do board (`board-chart-defaults`) trazem cinzas
 * azulados e um cursor índigo cravados, que destoam na areia da OSG. Aqui só a
 * COR é trocada por token — geometria, tipografia e sombra continuam vindo de lá,
 * para o dashboard não divergir visualmente do resto do Board.
 */
export const GRID = { ...GRID_STYLE, stroke: 'hsl(var(--border))' };
export const TOOLTIP = {
  ...TOOLTIP_STYLE,
  contentStyle: {
    ...TOOLTIP_STYLE.contentStyle,
    background: 'var(--board-v4-surface)',
    border: '1px solid var(--board-v4-line)',
  },
  cursor: { fill: 'hsl(var(--primary) / 0.06)' },
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
