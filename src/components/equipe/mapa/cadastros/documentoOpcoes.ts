// Opções e helpers do cadastro de Documento — vivem fora do modal para não
// quebrar o Fast Refresh (arquivos de componente devem exportar só componentes).

import type { EstruturacaoDoc } from '@/types';

const ESTRUTURADO_OPCOES: EstruturacaoDoc[] = ['Não Estruturado', 'Semi Estruturado', 'Estruturado'];
export const FORMATO_OPCOES_LIST = ['PDF', 'Word', 'Excel', 'PowerPoint', 'Markdown', 'Texto'];
export const TIPO_OPCOES = [
  { value: 'Planilha', label: 'Planilha' },
  { value: 'Registro digital', label: 'Registro digital' },
  { value: 'Protocolo', label: 'Protocolo' },
  { value: 'Relatório', label: 'Relatório' },
  { value: 'Comprovante', label: 'Comprovante' },
];
export const ORIGEM_OPCOES = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Cliente', label: 'Cliente' },
];
export const ESTRUTURADO_SELECT_OPCOES = ESTRUTURADO_OPCOES.map((o) => ({ value: o, label: o }));
export const FORMATO_SELECT_OPCOES = FORMATO_OPCOES_LIST.map(f => ({ value: f, label: f }));

// Condicionamento da estrutura derivado do formato do documento.
export const deriveEstruturado = (formato: string): EstruturacaoDoc | '' => {
  if (formato === 'Excel') return 'Estruturado';
  if (formato === 'Word' || formato === 'Texto') return 'Semi Estruturado';
  if (formato === 'PDF' || formato === 'PowerPoint' || formato === 'Markdown') return 'Não Estruturado';
  return '';
};
