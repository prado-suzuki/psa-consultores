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

// Descrições dos blocos SPED
export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  '0': 'Bloco 0 - Abertura e Identificação',
  'A': 'Bloco A - Serviços (ISS)',
  'C': 'Bloco C - Documentos Fiscais (ICMS/IPI)',
  'D': 'Bloco D - Documentos Fiscais (Serviços)',
  'F': 'Bloco F - Demais Documentos',
  'M': 'Bloco M - Apuração e Créditos',
  '1': 'Bloco 1 - Complementos',
  '9': 'Bloco 9 - Controle e Encerramento',
};

// Descrições dos registros comuns
export const REG_DESCRIPTIONS: Record<string, string> = {
  '0000': 'Abertura do Arquivo Digital',
  '0100': 'Dados do Contabilista',
  '0110': 'Regimes de Apuração',
  '0140': 'Cadastro de Estabelecimento',
  '0150': 'Cadastro de Participantes',
  '0200': 'Cadastro de Itens',
  '0450': 'Informações Complementares',
  'A010': 'Identificação do Estabelecimento',
  'A100': 'Documento - Nota Fiscal de Serviço',
  'A170': 'Itens do Documento',
  'C010': 'Identificação do Estabelecimento',
  'C100': 'Nota Fiscal (NF-e, NFC-e)',
  'C170': 'Itens do Documento',
  'C175': 'Operações com Veículos Novos',
  'C180': 'Consolidação de NFe',
  'C190': 'Consolidação por CST',
  'C380': 'Nota Fiscal de Venda Consumidor',
  'C400': 'Equipamento ECF',
  'C500': 'Nota Fiscal/Conta de Energia',
  'D010': 'Identificação do Estabelecimento',
  'D100': 'Aquisição de Serviços de Transporte',
  'D200': 'Resumo de Transporte',
  'D500': 'Nota Fiscal de Serviço de Comunicação',
  'F010': 'Identificação do Estabelecimento',
  'F100': 'Demais Documentos e Operações',
  'F200': 'Operações Imobiliárias',
  'F500': 'Deduções Diversas',
  'F600': 'Contribuição Retida na Fonte',
  'M001': 'Abertura do Bloco M',
  'M100': 'Crédito de PIS/Pasep',
  'M105': 'Detalhamento Base de Cálculo',
  'M200': 'Consolidação PIS/Pasep do Período',
  'M210': 'Detalhamento Contribuição PIS',
  'M400': 'CST sem Direito a Crédito',
  'M500': 'Crédito de COFINS',
  'M505': 'Detalhamento Base COFINS',
  'M600': 'Consolidação COFINS do Período',
  'M610': 'Detalhamento Contribuição COFINS',
  'M800': 'CST sem Direito a Crédito COFINS',
  '1100': 'Controle de Créditos Fiscais PIS',
  '1500': 'Controle de Créditos Fiscais COFINS',
};

// Perfis pré-definidos de exportação
export const EXPORT_PRESET_PROFILES: Record<string, { name: string; registros: string[] | 'ALL' }> = {
  none: { name: 'Selecione um perfil...', registros: [] },
  all: { name: 'Todos os Registros', registros: 'ALL' },
  fiscal: { name: 'Auditoria Fiscal', registros: ['0000', '0140', 'C100', 'C170', 'C190'] },
  apuracao: { name: 'Apuração', registros: ['0000', 'M200', 'M600'] },
  creditos: { name: 'Créditos', registros: ['M100', 'M105', 'M500', 'M505', '1100', '1500'] },
};

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
  dados: Record<string, unknown>[],
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
