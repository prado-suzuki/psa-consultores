// Helpers de formatação/validação de área de matrícula, compartilhados entre
// MatriculaModal e BemModal. Mantidos fora dos componentes para o Fast Refresh
// funcionar (react-refresh/only-export-components).

export const formatAreaUnidade = (u: string | null | undefined) => {
  if (u === 'm2') return 'm²';
  if (u === 'ha_m2') return 'ha e m²';
  return u ?? '';
};

// m² aceita 2 casas decimais; ha aceita 4 (que correspondem aos m², pois 1 ha = 10.000 m²).
// 'ha_m2' armazena o valor em ha — as 4 decimais são exatamente os m².
export const maxAreaDecimals = (u: string | null | undefined) => (u === 'm2' ? 2 : 4);
export const areaStep = (u: string | null | undefined) => (u === 'm2' ? '0.01' : '0.0001');

// Decompõe um valor em ha nas partes "ha" e "m²" (123.1234 ha -> 123 ha e 1234 m²).
export const splitHaM2 = (v: number): { ha: number; m2: number } => {
  const ha = Math.floor(v);
  const m2 = Math.round((v - ha) * 10_000);
  // Arredondamento pode estourar para 10000 m² (ex.: 122.99999) — normaliza para o ha seguinte.
  return m2 >= 10_000 ? { ha: ha + 1, m2: 0 } : { ha, m2 };
};

// Formata o valor completo (número + unidade) para exibição em listas.
export const formatArea = (v: number | null | undefined, u: string | null | undefined): string => {
  if (v == null) return '—';
  if (u === 'ha_m2') {
    const { ha, m2 } = splitHaM2(v);
    return `${ha.toLocaleString('pt-BR')}ha e ${m2}m²`;
  }
  const num = v.toLocaleString('pt-BR', { maximumFractionDigits: maxAreaDecimals(u) });
  return `${num} ${formatAreaUnidade(u)}`.trim();
};

const clampDecimals = (v: string, max: number): string => {
  if (!v) return v;
  const dot = v.indexOf('.');
  if (dot === -1) return v;
  const decimals = v.length - dot - 1;
  return decimals > max ? v.slice(0, dot + 1 + max) : v;
};

export const clampAreaInput = (v: string, u: string | null | undefined) =>
  clampDecimals(v, maxAreaDecimals(u));
