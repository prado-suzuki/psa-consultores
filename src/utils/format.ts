// Formatadores aceitam null/undefined porque a API pode retornar NULL para
// colunas numéricas opcionais (custo_licenca, custo_variavel, taxa_erros, …).
// Render seguro: tratar como 0 em vez de explodir a página inteira.

export function formatarMoeda(valor: number | null | undefined): string {
  const n = valor ?? 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseMoeda(str: string): number {
  return parseFloat(str.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

export function parseDecimal(str: string): number {
  return parseFloat(str.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

export function formatDecimal(valor: number | null | undefined, sufixo: string = ''): string {
  const n = valor ?? 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + sufixo;
}

export function formatDecimalInput(valor: number | null | undefined, sufixo: string = ''): string {
  const n = valor ?? 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + sufixo;
}
