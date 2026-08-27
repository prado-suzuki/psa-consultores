/**
 * Paleta, tipografia e formatadores do dashboard "Controle de uso e envio".
 *
 * DECIDIDO em 25/08/2026: o teal/lima INSTITUCIONAL (`--teal-*`/`--lime-*` de
 * `src/index.css`, o mesmo que o Board inteiro usa via `--bd-accent`) é a
 * fonte da verdade da marca — não o hex do "Manual de Marca - PSA" (pagina 12)
 * que este arquivo citava antes. TEAL/LIME abaixo são um SNAPSHOT em hex
 * desses tokens, não mais os valores do PDF.
 *
 * Por que snapshot e não `hsl(var(--teal-600))` direto: metade dos consumidores
 * passa estes valores como prop `fill`/`stroke` de elementos do Recharts (ex.
 * `AbaUsoApi.tsx`, `AbaArquivos.tsx`), que vira atributo de apresentação SVG
 * puro — fora do `style` — e a resolução de `var()` nesse caminho não é
 * garantida em todo navegador. Hex literal é o mesmo mecanismo de sempre, só
 * que com o numero certo agora. Se `--teal-*`/`--lime-*` mudar em
 * `index.css`, os valores abaixo precisam ser recalculados à mão (mesmo
 * acordo que `--bd-accent: #0D877C` já tem lá).
 *
 *   TEAL   500 #0d877c  600 #0a756c  700 #075f58   (era #14B8A6/#0D9488/#0F766E)
 *   LIME   400 #90e31c  500 #6caf0e  600 #589009   (era #A3E635/#84CC16/#65A30D)
 *   GRAY   50 #F9FAFB · 400 #9CA3AF · 500 #6B7280 · 600 #4B5563
 *          700 #374151 · 800 #1F2937 · 900 #111827 · 950 #030712
 *   (GRAY não fez parte da divergência — segue o manual, sem mudança)
 *
 * Tipografia: Work Sans (manual, pagina 10), ja configurada como `font-sans`
 * no tailwind.config.ts.
 */
import { useMemo, useState } from 'react';

export const TEAL = { 500: '#0d877c', 600: '#0a756c', 700: '#075f58' } as const;
/**
 * `700` acrescentado em 21/08 para TEXTO, recalculado em 25/08 para o
 * institucional. O lime claro existe para preencher barra e linha de grafico,
 * onde area grande resolve a leitura; como cor de palavra ele reprova: `500`
 * e `600` ficam abaixo do minimo de 4,5:1. `700` da 5,22:1 (era 4,99:1 no
 * hex do manual — o institucional passa até mais folgado). Espelha o `TEAL`,
 * que ja tinha 700. Preenchimento de grafico continua em `500` -- nada aqui
 * muda de cor.
 */
export const LIME = { 400: '#90e31c', 500: '#6caf0e', 600: '#589009', 700: '#497906' } as const;
export const GRAY = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
  950: '#030712',
} as const;

/**
 * O manual nao define cor de alerta — a marca e so verde/cinza. Escolhi tons
 * escuros e dessaturados (rose-700 / amber-700) que sinalizam problema sem
 * vibrar contra o teal e o lime.
 */
export const RISCO = '#BE123C';
export const ALERTA = '#B45309';

/**
 * Teal SÓ para marca de gráfico (série categórica) — não é o `TEAL[600]` da
 * marca. Motivo: quando o teal institucional virou a fonte da verdade
 * (25/08/2026), rodei o mesmo validador da skill `dataviz` de novo com os
 * hex novos e ele REPROVOU — `TEAL[500/600/700]` institucional tem croma
 * OKLCH entre 0,075 e 0,097, abaixo do piso 0,10: nessa faixa de
 * luminosidade a matiz lê como cinza pra quem tem deficiência de cor, ainda
 * que a saturação HSL pareça alta (82-84%) — HSL satura não é o mesmo eixo
 * que croma perceptual.
 *
 * `#0f9589` é o MESMO hue/saturação do institucional `--teal-500` (#0d877c,
 * hsl 175 82% 29%), só 3 pontos mais claro (32%) — o mínimo pra cruzar o
 * piso de croma sem deixar de ser reconhecível como "o teal da PSA". Fora
 * daqui (botão, texto, KPI) continua tudo em `TEAL[500/600/700]` normal;
 * esta variante é só para quando a cor precisa CARREGAR a distinção sozinha
 * (marca de série, sem rótulo ao lado).
 *
 * Isso é uma lacuna nova do Manual de Marca, não uma dívida de código: o PDF
 * (`Manual de Marca - PSA.pdf`) não tem uma variante "segura para gráfico"
 * do teal — precisa ganhar uma na próxima revisão. Até lá, esta constante é
 * a fonte da verdade só para este uso.
 */
export const TEAL_SERIE = '#0f9589';

/**
 * Erro nunca usa o verde da marca, para não parecer um resultado positivo.
 *
 * A paleta de séries foi ESCOLHIDA PELO VALIDADOR, não a olho. Rodando
 * `node scripts/validate_palette.js "<hex...>" --mode light` da skill `dataviz`,
 * o conjunto anterior REPROVOU: o par âmbar #B45309 × rose #BE123C dava
 * ΔE 11,5 em visão normal (piso 15) e 5,7 em deuteranopia — quem tem deficiência
 * de cor não separava "reenvio" de "documento perdido". A escala anterior também
 * tinha teal-600/teal-700 adjacentes, quase indistinguíveis.
 *
 * O trio aprovado é TEAL_SERIE / lime-500 / rose-700:
 *   ΔE mínimo 16,8 (normal) · 15,6 (protan) · 8,4 (tritan) — ALL CHECKS PASS.
 *   (era 23,6/22,3/16,5 com o teal do manual — a folga cai, mas todos os
 *   pisos continuam batidos; recalculado em 25/08/2026 junto com a virada
 *   pro institucional.)
 *
 * Ressalva do validador: lime tem 2,63:1 de contraste contra a superfície,
 * abaixo de 3:1. Por isso toda série lime carrega rótulo direto no gráfico.
 * Âmbar sobrou só como cor de STATUS pontual (sempre com ícone e texto),
 * nunca como série adjacente ao rose no mesmo gráfico.
 */
export const COR_ERRO = RISCO;
export const COR_OK = TEAL_SERIE;
/** Série recessiva de propósito: reenvio, 4xx, contexto. Não disputa atenção. */
export const COR_NEUTRA = GRAY[400];

/** Ordem fixa, nunca ciclada: uma 4ª série vira "Outros" ou vai para outro gráfico. */
export const SERIES = [TEAL_SERIE, LIME[500], RISCO, GRAY[500]];

// ── Defaults de grafico (Work Sans, nao o Instrument Sans do board) ────

const FONTE = "'Work Sans', sans-serif";

export const AXIS_STYLE = {
  tick: { fontSize: 11, fill: GRAY[500], fontFamily: FONTE },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID_STYLE = {
  strokeDasharray: '2 4',
  stroke: GRAY[200],
  vertical: false as const,
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: GRAY[900],
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: FONTE,
    color: '#fff',
    boxShadow: '0 8px 24px rgba(3,7,18,.24)',
    padding: '8px 10px',
  },
  labelStyle: { color: GRAY[400], fontSize: 11, marginBottom: 2 },
  itemStyle: { color: '#fff', fontSize: 12, padding: 0 },
  cursor: { fill: 'rgba(13,148,136,.06)' },
};

// ── Formatadores ───────────────────────────────────────────────────────

export const num = (v: number | null | undefined, dec = 0) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: dec });

/** Eixo compacto: 15.487 -> "15,5 mil". */
export const numCurto = (v: number) => {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1000)
    return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return v.toLocaleString('pt-BR');
};

export const pct = (v: number | null | undefined, dec = 1) =>
  v == null ? '—' : `${(v * 100).toFixed(dec).replace('.', ',')}%`;

/** Milissegundos legiveis: 190 ms / 1,8 s / 16,3 s. */
/**
 * Latencia SEMPRE em segundos. Alternar entre "190 ms" e "1,8 s" na mesma
 * coluna obriga o leitor a converter de cabeca para comparar duas linhas.
 * Abaixo de 10 s usa 2 casas (0,19 s), acima usa 1 (16,3 s).
 */
export const ms = (v: number | null | undefined) => {
  if (v == null) return '—';
  const seg = v / 1000;
  // Uma casa, sempre. Ninguem decide nada com a segunda casa de um p95, e
  // "2,79 s" custa mais para ler que "2,8 s".
  return `${seg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
};

/**
 * Eixos: o Recharts gera ticks fracionarios (1,5% · 3% · 4,5%) e arredondar
 * para inteiro produz rotulo repetido e fora de ordem — foi o que deixou o
 * eixo lendo "5%, 2%, 3%, 4%, 3%". Formata com 1 casa quando o passo e
 * fracionario e sem casa quando e inteiro.
 */
const casasDoTick = (v: number) => (Number.isInteger(v) ? 0 : 1);

export const tickPct = (v: number) =>
  `${v.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDoTick(v),
    maximumFractionDigits: casasDoTick(v),
  })}%`;

export const tickSeg = (v: number) => {
  const seg = v / 1000;
  return `${seg.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDoTick(seg),
    maximumFractionDigits: casasDoTick(seg),
  })} s`;
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 'jan/26' le mais rapido que '01/26' — nao exige traduzir numero para mes. */
export const mesLabel = (mes: string) => {
  const indice = Number(mes.slice(5, 7)) - 1;
  return `${MESES[indice] ?? mes.slice(5, 7)}/${mes.slice(2, 4)}`;
};

export const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

/** Mantem so os ultimos segmentos do caminho do Drive — o inicio se repete. */
export const pastaCurta = (caminho: string, segmentos = 3) => {
  const partes = caminho
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length <= segmentos) return partes.join(' / ');
  return `… / ${partes.slice(-segmentos).join(' / ')}`;
};

// ── Ordenacao de tabela por clique na coluna ───────────────────────────

export type SortDir = 'asc' | 'desc';

export interface SortState<T> {
  sorted: T[];
  key: keyof T;
  dir: SortDir;
  toggle: (k: keyof T) => void;
}

export function useSort<T>(
  rows: T[],
  initialKey: keyof T,
  initialDir: SortDir = 'desc',
): SortState<T> {
  const [key, setKey] = useState<keyof T>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const av = a[key] as unknown;
      const bv = b[key] as unknown;
      let c = 0;
      if (typeof av === 'number' && typeof bv === 'number') c = av - bv;
      else if (av == null) c = -1;
      else if (bv == null) c = 1;
      else c = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return dir === 'asc' ? c : -c;
    });
    return arr;
  }, [rows, key, dir]);

  const toggle = (k: keyof T) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setKey(k);
      setDir('desc');
    }
  };

  return { sorted, key, dir, toggle };
}

/**
 * Tabela de dashboard mostra o topo, nao a base inteira: 81 endpoints empilhados
 * viram uma parede de scroll. Corta em `limite` e deixa expandir sob demanda.
 */
export function useTopN<T>(rows: T[], limite = 10) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? rows : rows.slice(0, limite);
  return { visiveis, expandido, setExpandido, temMais: rows.length > limite, total: rows.length };
}
