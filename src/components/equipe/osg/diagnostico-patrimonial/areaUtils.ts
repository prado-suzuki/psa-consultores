// Helpers de formatação/validação de área de matrícula, compartilhados entre
// MatriculaModal e BemModal. Mantidos fora dos componentes para o Fast Refresh
// funcionar (react-refresh/only-export-components).

export const formatAreaUnidade = (u: string | null | undefined) =>
  u === 'm2' ? 'm²' : (u ?? '');

// m² aceita 2 casas decimais; ha aceita 4.
export const maxAreaDecimals = (u: string | null | undefined) => (u === 'm2' ? 2 : 4);
export const areaStep = (u: string | null | undefined) => (u === 'm2' ? '0.01' : '0.0001');

const clampDecimals = (v: string, max: number): string => {
  if (!v) return v;
  const dot = v.indexOf('.');
  if (dot === -1) return v;
  const decimals = v.length - dot - 1;
  return decimals > max ? v.slice(0, dot + 1 + max) : v;
};

export const clampAreaInput = (v: string, u: string | null | undefined) =>
  clampDecimals(v, maxAreaDecimals(u));
