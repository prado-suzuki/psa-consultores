import type { EFDColumnConfig } from '@/types/efd';

// Colunas que devem ser ocultadas da análise (internas/técnicas)
export const EFD_HIDDEN_COLUMNS = [
  'uuid',
  'id_arquivo', 
  'id_pai',
  'ID_ARQUIVO',
  'ID_PAI',
  'UUID',
];

// Colunas base para registros comuns (serão expandidas dinamicamente)
export const EFD_BASE_COLUMNS: EFDColumnConfig[] = [
  // Bloco 0 - Abertura
  { id: 'REG', label: 'Registro', group: 'Identificação' },
  { id: 'COD_VER', label: 'Código Versão', group: 'Identificação' },
  { id: 'TIPO_ESCRIT', label: 'Tipo Escrituração', group: 'Identificação' },
  { id: 'DT_INI', label: 'Data Início', group: 'Período' },
  { id: 'DT_FIN', label: 'Data Fim', group: 'Período' },
  // Bloco C - Documentos Fiscais
  { id: 'COD_PART', label: 'Código Participante', group: 'Documento' },
  { id: 'COD_MOD', label: 'Modelo Documento', group: 'Documento' },
  { id: 'CHV_NFE', label: 'Chave NF-e', group: 'Documento' },
  { id: 'NUM_DOC', label: 'Número Documento', group: 'Documento' },
  { id: 'VL_DOC', label: 'Valor Documento', group: 'Valores' },
  { id: 'VL_BC_PIS', label: 'Base PIS', group: 'PIS' },
  { id: 'VL_PIS', label: 'Valor PIS', group: 'PIS' },
  { id: 'VL_BC_COFINS', label: 'Base COFINS', group: 'COFINS' },
  { id: 'VL_COFINS', label: 'Valor COFINS', group: 'COFINS' },
  // Bloco M - Apuração
  { id: 'VL_TOT_CONT_NC_DEV', label: 'Total Contribuição Devida', group: 'Apuração' },
  { id: 'VL_RET_NC', label: 'Valor Retido', group: 'Apuração' },
  { id: 'VL_CONT_NC_REC', label: 'Contribuição a Recolher', group: 'Apuração' },
];

// Grupos ordenados para UI
export const EFD_COLUMN_GROUPS = [
  'Identificação',
  'Período', 
  'Documento',
  'Valores',
  'PIS',
  'COFINS',
  'Apuração',
  'Geral',
];

// Função para gerar colunas dinamicamente a partir dos dados JSON
export function generateColumnsFromData(
  dados: Record<string, any>[],
  hiddenColumns: string[] = EFD_HIDDEN_COLUMNS
): EFDColumnConfig[] {
  if (dados.length === 0) return [];
  
  const sample = dados[0];
  const columns = Object.keys(sample)
    .filter(key => !hiddenColumns.includes(key)) // Filtrar colunas ocultas
    .map(key => ({
      id: key,
      label: formatColumnLabel(key),
      group: inferGroupFromKey(key),
    }));
  
  // Ordenar por grupo para melhor visualização
  return columns.sort((a, b) => {
    const indexA = EFD_COLUMN_GROUPS.indexOf(a.group);
    const indexB = EFD_COLUMN_GROUPS.indexOf(b.group);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}

function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^VL /i, 'Valor ')
    .replace(/^COD /i, 'Código ')
    .replace(/^DT /i, 'Data ')
    .replace(/^QTD /i, 'Quantidade ')
    .replace(/^IND /i, 'Indicador ')
    .replace(/^NUM /i, 'Número ')
    .replace(/^CHV /i, 'Chave ');
}

function inferGroupFromKey(key: string): string {
  if (key.includes('PIS')) return 'PIS';
  if (key.includes('COFINS')) return 'COFINS';
  if (key.includes('VL_')) return 'Valores';
  if (key.includes('DT_')) return 'Período';
  if (key.includes('COD_') || key.includes('NUM_') || key.includes('CHV_')) return 'Documento';
  if (key === 'REG' || key.includes('VER') || key.includes('ESCRIT')) return 'Identificação';
  return 'Geral';
}

// Formatar valor para exibição na grid
export function formatEFDValue(value: any, columnId: string): string {
  if (value === null || value === undefined || value === '') return '-';
  
  // Formatar data (padrão SPED: ddmmaaaa ou aaaa-mm-dd)
  if (columnId.startsWith('DT_') && typeof value === 'string') {
    if (value.length === 8) {
      // Formato ddmmaaaa
      const day = value.substring(0, 2);
      const month = value.substring(2, 4);
      const year = value.substring(4, 8);
      return `${day}/${month}/${year}`;
    }
    if (value.includes('-')) {
      // Formato ISO
      return new Date(value).toLocaleDateString('pt-BR');
    }
  }
  
  // Formatar valores monetários
  if (columnId.startsWith('VL_')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(num);
    }
  }
  
  // Formatar quantidade
  if (columnId.startsWith('QTD_')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }).format(num);
    }
  }
  
  // Formatar alíquotas
  if (columnId.startsWith('ALIQ_')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return `${num.toFixed(2)}%`;
    }
  }
  
  // Formatar CNPJ
  if ((columnId === 'CNPJ' || columnId.includes('_CNPJ')) && typeof value === 'string') {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
  }
  
  // Formatar CPF
  if ((columnId === 'CPF' || columnId.includes('_CPF')) && typeof value === 'string') {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
  }
  
  return String(value);
}
