// Definição das colunas disponíveis para exportação de documentos fiscais

export interface ColumnConfig {
  id: string;
  label: string;
  group: string;
}

// Colunas NFe
export const NFE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_nfe', label: 'Chave NFe', group: 'Documento' },
  { id: 'dhEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nNF', label: 'Número NF', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'tpNF', label: 'Tipo NF (0=Entrada, 1=Saída)', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  // Emitente
  { id: 'emit.CNPJ', label: 'CNPJ Emitente', group: 'Emitente' },
  { id: 'emit.xNome', label: 'Razão Social Emitente', group: 'Emitente' },
  { id: 'emit.IE', label: 'IE Emitente', group: 'Emitente' },
  { id: 'emit.UF', label: 'UF Emitente', group: 'Emitente' },
  // Destinatário
  { id: 'dest.CNPJ', label: 'CNPJ Destinatário', group: 'Destinatário' },
  { id: 'dest.xNome', label: 'Razão Social Destinatário', group: 'Destinatário' },
  { id: 'dest.IE', label: 'IE Destinatário', group: 'Destinatário' },
  { id: 'dest.UF', label: 'UF Destinatário', group: 'Destinatário' },
  // Totais
  { id: 'ICMSTot.vICMS', label: 'Valor ICMS', group: 'Totais' },
  { id: 'ICMSTot.vICMSST', label: 'Valor ICMS ST', group: 'Totais' },
  // Produtos (será expandido por item)
  { id: 'produtos.xProd', label: 'Nome Produto', group: 'Produtos' },
  { id: 'produtos.cProd', label: 'Código Produto', group: 'Produtos' },
  { id: 'produtos.NCM', label: 'NCM', group: 'Produtos' },
  { id: 'produtos.CFOP', label: 'CFOP', group: 'Produtos' },
  { id: 'produtos.vProd', label: 'Valor Produto', group: 'Produtos' },
  // Produtos - PIS
  { id: 'produtos.PIS.CST', label: 'CST PIS', group: 'Produtos' },
  { id: 'produtos.PIS.vBC', label: 'Base Cálculo PIS', group: 'Produtos' },
  { id: 'produtos.PIS.pPIS', label: 'Alíquota PIS (%)', group: 'Produtos' },
  { id: 'produtos.PIS.vPIS', label: 'Valor PIS', group: 'Produtos' },
  { id: 'produtos.PIS.qBCProd', label: 'Qtd BC PIS', group: 'Produtos' },
  { id: 'produtos.PIS.vAliqProd', label: 'Alíq. PIS (R$)', group: 'Produtos' },
  { id: 'produtos.PIS.vBC_ST', label: 'BC PIS ST', group: 'Produtos' },
  { id: 'produtos.PIS.pPIS_ST', label: 'Alíq. PIS ST (%)', group: 'Produtos' },
  { id: 'produtos.PIS.vPIS_ST', label: 'Valor PIS ST', group: 'Produtos' },
  // Produtos - COFINS
  { id: 'produtos.COFINS.CST', label: 'CST COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.vBC', label: 'Base Cálculo COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.pCOFINS', label: 'Alíquota COFINS (%)', group: 'Produtos' },
  { id: 'produtos.COFINS.vCOFINS', label: 'Valor COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.qBCProd', label: 'Qtd BC COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.vAliqProd', label: 'Alíq. COFINS (R$)', group: 'Produtos' },
  { id: 'produtos.COFINS.vBC_ST', label: 'BC COFINS ST', group: 'Produtos' },
  { id: 'produtos.COFINS.pCOFINS_ST', label: 'Alíq. COFINS ST (%)', group: 'Produtos' },
  { id: 'produtos.COFINS.vCOFINS_ST', label: 'Valor COFINS ST', group: 'Produtos' },
];

// Colunas CT-e
export const CTE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_cte', label: 'Chave CTe', group: 'Documento' },
  { id: 'dEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nCT', label: 'Número CT', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'cfop', label: 'CFOP', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  { id: 'modal', label: 'Modal', group: 'Documento' },
  // Origem/Destino
  { id: 'xMunIni', label: 'Município Origem', group: 'Trajeto' },
  { id: 'xMunFim', label: 'Município Destino', group: 'Trajeto' },
  { id: 'cMunIni', label: 'Código Mun. Origem', group: 'Trajeto' },
  { id: 'cMunFim', label: 'Código Mun. Destino', group: 'Trajeto' },
  // Emitente
  { id: 'emit.CNPJ', label: 'CNPJ Emitente', group: 'Emitente' },
  { id: 'emit.xNome', label: 'Razão Social Emitente', group: 'Emitente' },
  { id: 'emit.xFant', label: 'Nome Fantasia Emitente', group: 'Emitente' },
  { id: 'emit.IE', label: 'IE Emitente', group: 'Emitente' },
  { id: 'emit.UF', label: 'UF Emitente', group: 'Emitente' },
  // Destinatário
  { id: 'dest.CNPJ', label: 'CNPJ Destinatário', group: 'Destinatário' },
  { id: 'dest.xNome', label: 'Razão Social Destinatário', group: 'Destinatário' },
  { id: 'dest.IE', label: 'IE Destinatário', group: 'Destinatário' },
  { id: 'dest.UF', label: 'UF Destinatário', group: 'Destinatário' },
  // Tomador
  { id: 'tomador.CNPJ', label: 'CNPJ Tomador', group: 'Tomador' },
  { id: 'tomador.xNome', label: 'Razão Social Tomador', group: 'Tomador' },
  { id: 'tomador.IE', label: 'IE Tomador', group: 'Tomador' },
  { id: 'tomador.UF', label: 'UF Tomador', group: 'Tomador' },
  // Valores
  { id: 'vTPrest', label: 'Valor Prestação', group: 'Valores' },
  { id: 'vRec', label: 'Valor a Receber', group: 'Valores' },
  { id: 'vCarga', label: 'Valor da Carga', group: 'Valores' },
  // ICMS
  { id: 'icms.CST', label: 'CST ICMS', group: 'ICMS' },
  { id: 'icms.vBC', label: 'Base Cálculo ICMS', group: 'ICMS' },
  { id: 'icms.pICMS', label: 'Alíquota ICMS', group: 'ICMS' },
  { id: 'icms.vICMS', label: 'Valor ICMS', group: 'ICMS' },
];

// Grupos de colunas
export const NFE_COLUMN_GROUPS = ['Documento', 'Emitente', 'Destinatário', 'Totais', 'Produtos'];
export const CTE_COLUMN_GROUPS = ['Documento', 'Trajeto', 'Emitente', 'Destinatário', 'Tomador', 'Valores', 'ICMS'];

// Para retrocompatibilidade
export const AVAILABLE_COLUMNS = NFE_COLUMNS;
