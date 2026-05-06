const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const brlCompactFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const pctFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export const fmtBRL = (v: number) => brlFmt.format(v);
export const fmtBRLCompact = (v: number) => brlCompactFmt.format(v);
export const fmtPct = (v: number) => pctFmt.format(v);
export const fmtNum = (v: number) => numFmt.format(v);
export const fmtInt = (v: number) => intFmt.format(v);

export function fmtMesAno(mesRef: string): string {
  if (!mesRef || mesRef.length < 7) return mesRef;
  const [y, m] = mesRef.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return mesRef;
  return `${meses[idx]}/${y.slice(2)}`;
}

export function fmtPp(deltaPp: number): string {
  const sign = deltaPp > 0 ? "+" : "";
  return `${sign}${deltaPp.toFixed(2)} pp`;
}
