// Opções de domínio do cadastro de Gargalo — compartilhadas entre
// GargaloFormModal (página de cadastro) e NovoGargaloModal (cadastro rápido
// no editor de etapas). Vive fora dos componentes por causa do fast refresh.

export const GARGALO_ORIGEM_OPCOES = [
  { value: 'Processo', label: 'Processo' },
  { value: 'Sistema', label: 'Sistema' },
  { value: 'Pessoas', label: 'Pessoas' },
  { value: 'Cliente', label: 'Cliente' },
  { value: 'Externo', label: 'Externo (regulatório / terceiros)' },
];
