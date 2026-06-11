// Formatadores do Quadro Societário, compartilhados entre a visão manual (CN,
// na página) e a visão derivada da Proprietária (QuadroEmpresaProprietaria).

export const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtInt = new Intl.NumberFormat('pt-BR');
export const fmtPct = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

// Iniciais para o avatar do sócio (duas primeiras palavras, ex.: "AB").
export const iniciais = (denominacao: string) =>
  denominacao
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '—';
