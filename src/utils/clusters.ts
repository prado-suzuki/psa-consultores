// Fonte única dos clusters do portfólio. Usado nos cadastros (seletor de cluster)
// e nos filtros de todas as páginas (exceto Mapeamento e Notas).

export interface Opcao {
  value: string;
  label: string;
}

// Opções para o cadastro (campo cluster do registro). '' = sem cluster.
export const CLUSTER_OPCOES: Opcao[] = [
  { value: '',            label: '— (sem cluster)' },
  { value: 'OSG',         label: 'OSG' },
  { value: 'Digital',     label: 'Digital' },
  { value: 'Agronegócio', label: 'Agronegócio' },
  { value: 'Tributário',  label: 'Tributário' },
  { value: 'Sucessão',    label: 'Sucessão' },
  { value: 'Outros',      label: 'Outros' },
];

// Opções para o filtro de lista. '' = não filtra (mostra todos).
export const CLUSTER_FILTRO_OPCOES: Opcao[] = [
  { value: '', label: 'Todos os clusters' },
  ...CLUSTER_OPCOES.filter((o) => o.value !== ''),
];
