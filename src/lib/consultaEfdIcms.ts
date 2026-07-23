import type { EFDArquivo } from '@/types/efd';

export interface MonthYear { month: number; year: number }
export interface FilialOption { codigo: string; nome: string; ie: string; cnpjCompleto: string }

export const getDefaultEfdPeriod = (now = new Date()): { inicio: MonthYear; fim: MonthYear } => {
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  return {
    inicio: { month: fiveYearsAgo.getMonth(), year: fiveYearsAgo.getFullYear() },
    fim: { month: now.getMonth(), year: now.getFullYear() },
  };
};

export const getEfdFiliais = (arquivos: EFDArquivo[] = []): FilialOption[] => {
  const filiais = new Map<string, FilialOption>();
  arquivos.forEach(arquivo => {
    const codigo = arquivo.num_filial || '0000';
    if (!filiais.has(codigo)) filiais.set(codigo, {
      codigo,
      nome: arquivo.NOME || (codigo === '0000' ? 'Matriz' : `Filial ${codigo}`),
      ie: arquivo.IE || '',
      cnpjCompleto: arquivo.CNPJ,
    });
  });
  return Array.from(filiais.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
};

export const filterEfdArquivos = (arquivos: EFDArquivo[] = [], filial: string, inicio: string, fim: string) =>
  arquivos.filter(arquivo => {
    if (filial && filial !== 'todas' && (arquivo.num_filial || '0000') !== filial) return false;
    const arquivoInicio = new Date(arquivo.DT_INI);
    const arquivoFim = new Date(arquivo.DT_FIN);
    return (!inicio || arquivoFim >= new Date(inicio)) && (!fim || arquivoInicio <= new Date(fim));
  });

export const toggleEfdSelection = (selected: Set<string>, id: string) => {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const formatCnpj = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length === 14 ? cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value;
};

export const formatEfdCurrency = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(number) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

export const formatEfdPeriod = (inicio: string, fim: string) => {
  const format = (date: string) => date.includes('-') ? date.split('-').reverse().join('/') : date;
  return `${format(inicio)} a ${format(fim)}`;
};
