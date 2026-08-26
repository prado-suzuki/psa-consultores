/**
 * Paleta, tipografia e formatadores do dashboard "Controle de uso e envio".
 *
 * As cores vem do "Manual de Marca - PSA", pagina 12 (Paleta de Cores) — os
 * valores sao os hex oficiais, nao aproximacoes:
 *
 *   TEAL   500 #14B8A6  600 #0D9488  700 #0F766E
 *   LIME   400 #A3E635  500 #84CC16  600 #65A30D
 *   GRAY   50 #F9FAFB · 400 #9CA3AF · 500 #6B7280 · 600 #4B5563
 *          700 #374151 · 800 #1F2937 · 900 #111827 · 950 #030712
 *
 * ATENCAO: os tokens em `src/index.css` divergem do manual — la
 * `--teal-500` resolve para #0D877C e `--lime-500` para #6CAF0E, ambos bem mais
 * escuros que os #14B8A6 / #84CC16 oficiais. Enquanto os tokens nao forem
 * alinhados, este arquivo e a fonte da verdade para esta pagina.
 *
 * Tipografia: Work Sans (manual, pagina 10), ja configurada como `font-sans`
 * no tailwind.config.ts.
 */
import { useMemo, useState } from 'react';

export const TEAL = { 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E' } as const;
/**
 * `700` acrescentado em 21/08 para TEXTO. O lime claro existe para preencher
 * barra e linha de grafico, onde area grande resolve a leitura; como cor de
 * palavra ele reprova: `500` da 1,98:1 sobre branco e `600` da 3,09:1, contra o
 * minimo de 4,5:1. `700` da 4,99:1. Espelha o `TEAL`, que ja tinha 700.
 * Preenchimento de grafico continua em `500` -- nada aqui muda de cor.
 */
export const LIME = { 400: '#A3E635', 500: '#84CC16', 600: '#65A30D', 700: '#4D7C0F' } as const;
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
 * Erro nunca usa o verde da marca, para não parecer um resultado positivo.
 *
 * A paleta de séries foi ESCOLHIDA PELO VALIDADOR, não a olho. Rodando
 * `node scripts/validate_palette.js "<hex...>" --mode light` da skill `dataviz`,
 * o conjunto anterior REPROVOU: o par âmbar #B45309 × rose #BE123C dava
 * ΔE 11,5 em visão normal (piso 15) e 5,7 em deuteranopia — quem tem deficiência
 * de cor não separava "reenvio" de "documento perdido". A escala anterior também
 * tinha teal-600/teal-700 adjacentes, quase indistinguíveis.
 *
 * O trio aprovado é teal-600 / lime-500 / rose-700:
 *   ΔE mínimo 23,6 (normal) · 22,3 (protan) · 16,5 (tritan) — ALL CHECKS PASS.
 *
 * Ressalva do validador: lime tem 1,92:1 de contraste contra a superfície,
 * abaixo de 3:1. Por isso toda série lime carrega rótulo direto no gráfico.
 * Âmbar sobrou só como cor de STATUS pontual (sempre com ícone e texto),
 * nunca como série adjacente ao rose no mesmo gráfico.
 */
export const COR_ERRO = RISCO;
export const COR_OK = TEAL[600];
/** Série recessiva de propósito: reenvio, 4xx, contexto. Não disputa atenção. */
export const COR_NEUTRA = GRAY[400];

/** Ordem fixa, nunca ciclada: uma 4ª série vira "Outros" ou vai para outro gráfico. */
export const SERIES = [TEAL[600], LIME[500], RISCO, GRAY[500]];

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
