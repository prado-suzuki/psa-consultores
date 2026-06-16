// Opções e helpers do cadastro de Processo — fora do componente para não
// quebrar o Fast Refresh e para serem compartilhados entre a página
// (badges/orb) e o ProcessoFormModal.

import type { Complexidade } from '@/types';

export const FREQUENCIA_OPCOES = [
  { value: '',           label: '— Não definido' },
  { value: 'Diária',     label: 'Diária (252 exec./ano)' },
  { value: 'Semanal',    label: 'Semanal (52 exec./ano)' },
  { value: 'Quinzenal',  label: 'Quinzenal (26 exec./ano)' },
  { value: 'Mensal',     label: 'Mensal (12 exec./ano)' },
  { value: 'Trimestral', label: 'Trimestral (4 exec./ano)' },
  { value: 'Anual',      label: 'Anual (1 exec./ano)' },
];

export const STATUS_AVALIACAO_OPCOES = [
  { value: 'Não avaliado', label: 'Não avaliado' },
  { value: 'Em avaliação', label: 'Em avaliação' },
  { value: 'Avaliado',     label: 'Avaliado' },
];

export const COMPLEXIDADE_OPCOES = [
  { value: '',      label: '— Não definido' },
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Média', label: 'Média' },
  { value: 'Alta',  label: 'Alta' },
];

const COMPLEXIDADE_MAP: Record<string, Complexidade> = {
  baixa: 'Baixa', low: 'Baixa',
  media: 'Média', medium: 'Média',
  alta: 'Alta', high: 'Alta',
};

export function normalizarComplexidade(value?: string | null): Complexidade | '' {
  if (!value) return '';
  const key = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return COMPLEXIDADE_MAP[key] || '';
}
