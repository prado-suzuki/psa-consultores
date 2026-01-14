// Definição das colunas disponíveis para exportação de documentos fiscais
// Nomes devem corresponder EXATAMENTE aos aceitos pela API

export interface ColumnConfig {
  id: string;
  label: string;
  group: string;
}

// Colunas NFe - baseado em ALLOWED_COLUMNS da API
export const NFE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_nfe', label: 'Chave NFe', group: 'Documento' },
  { id: 'dEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nNF', label: 'Número NF', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'tpNF', label: 'Tipo NF (0=Entrada, 1=Saída)', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  { id: 'cUF', label: 'Código UF', group: 'Documento' },
  { id: 'tipo_mov', label: 'Tipo Movimento', group: 'Documento' },
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
  { id: 'ICMSTot.vICMS', label: 'Valor ICMS Total', group: 'Totais' },
  { id: 'ICMSTot.vICMSST', label: 'Valor ICMS ST Total', group: 'Totais' },
  // Informações Adicionais
  { id: 'infAdic.infAdFisco', label: 'Info Adicional Fisco', group: 'Info Adicionais' },
  { id: 'infAdic.infCpl', label: 'Info Complementar', group: 'Info Adicionais' },
  // Produtos (será expandido por item)
  { id: 'produtos.nItem', label: 'Nº Item', group: 'Produtos' },
  { id: 'produtos.cProd', label: 'Código Produto', group: 'Produtos' },
  { id: 'produtos.xProd', label: 'Nome Produto', group: 'Produtos' },
  { id: 'produtos.NCM', label: 'NCM', group: 'Produtos' },
  { id: 'produtos.CFOP', label: 'CFOP', group: 'Produtos' },
  { id: 'produtos.vProd', label: 'Valor Produto', group: 'Produtos' },
  // Produtos - ICMS
  { id: 'produtos.ICMS.CST', label: 'CST ICMS', group: 'ICMS Produto' },
  { id: 'produtos.ICMS.vBC', label: 'Base Cálculo ICMS', group: 'ICMS Produto' },
  { id: 'produtos.ICMS.pICMS', label: 'Alíquota ICMS (%)', group: 'ICMS Produto' },
  { id: 'produtos.ICMS.vICMS', label: 'Valor ICMS', group: 'ICMS Produto' },
  // Produtos - IPI
  { id: 'produtos.IPI.CST', label: 'CST IPI', group: 'IPI Produto' },
  { id: 'produtos.IPI.vIPI', label: 'Valor IPI', group: 'IPI Produto' },
  // Produtos - PIS
  { id: 'produtos.PIS.CST', label: 'CST PIS', group: 'PIS Produto' },
  { id: 'produtos.PIS.vBC', label: 'Base Cálculo PIS', group: 'PIS Produto' },
  { id: 'produtos.PIS.pPIS', label: 'Alíquota PIS (%)', group: 'PIS Produto' },
  { id: 'produtos.PIS.vPIS', label: 'Valor PIS', group: 'PIS Produto' },
  { id: 'produtos.PIS.qBCProd', label: 'Qtd BC PIS', group: 'PIS Produto' },
  { id: 'produtos.PIS.vAliqProd', label: 'Alíq. PIS (R$)', group: 'PIS Produto' },
  { id: 'produtos.PIS.vBC_ST', label: 'BC PIS ST', group: 'PIS Produto' },
  { id: 'produtos.PIS.pPIS_ST', label: 'Alíq. PIS ST (%)', group: 'PIS Produto' },
  { id: 'produtos.PIS.vPIS_ST', label: 'Valor PIS ST', group: 'PIS Produto' },
  // Produtos - COFINS
  { id: 'produtos.COFINS.CST', label: 'CST COFINS', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.vBC', label: 'Base Cálculo COFINS', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.pCOFINS', label: 'Alíquota COFINS (%)', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.vCOFINS', label: 'Valor COFINS', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.qBCProd', label: 'Qtd BC COFINS', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.vAliqProd', label: 'Alíq. COFINS (R$)', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.vBC_ST', label: 'BC COFINS ST', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.pCOFINS_ST', label: 'Alíq. COFINS ST (%)', group: 'COFINS Produto' },
  { id: 'produtos.COFINS.vCOFINS_ST', label: 'Valor COFINS ST', group: 'COFINS Produto' },
];

// Colunas CT-e - baseado em CTE_ALLOWED_COLUMNS da API
export const CTE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_cte', label: 'Chave CTe', group: 'Documento' },
  { id: 'dEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nCT', label: 'Número CT', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'cfop', label: 'CFOP', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  { id: 'cCT', label: 'Código CT', group: 'Documento' },
  { id: 'tpEmis', label: 'Tipo Emissão', group: 'Documento' },
  { id: 'tpCTe', label: 'Tipo CTe', group: 'Documento' },
  { id: 'modal', label: 'Modal', group: 'Documento' },
  { id: 'tpServ', label: 'Tipo Serviço', group: 'Documento' },
  { id: 'tipo_mov', label: 'Tipo Movimento', group: 'Documento' },
  // Trajeto
  { id: 'cMunIni', label: 'Código Mun. Origem', group: 'Trajeto' },
  { id: 'xMunIni', label: 'Município Origem', group: 'Trajeto' },
  { id: 'cMunFim', label: 'Código Mun. Destino', group: 'Trajeto' },
  { id: 'xMunFim', label: 'Município Destino', group: 'Trajeto' },
  // Valores
  { id: 'vTPrest', label: 'Valor Prestação', group: 'Valores' },
  { id: 'vRec', label: 'Valor a Receber', group: 'Valores' },
  { id: 'vCarga', label: 'Valor da Carga', group: 'Valores' },
  { id: 'proPred', label: 'Produto Predominante', group: 'Valores' },
  // Emitente
  { id: 'emit.CNPJ', label: 'CNPJ Emitente', group: 'Emitente' },
  { id: 'emit.CPF', label: 'CPF Emitente', group: 'Emitente' },
  { id: 'emit.xNome', label: 'Razão Social Emitente', group: 'Emitente' },
  { id: 'emit.xFant', label: 'Nome Fantasia Emitente', group: 'Emitente' },
  { id: 'emit.IE', label: 'IE Emitente', group: 'Emitente' },
  { id: 'emit.UF', label: 'UF Emitente', group: 'Emitente' },
  { id: 'emit.cMun', label: 'Cód. Mun. Emitente', group: 'Emitente' },
  // Destinatário
  { id: 'dest.CNPJ', label: 'CNPJ Destinatário', group: 'Destinatário' },
  { id: 'dest.CPF', label: 'CPF Destinatário', group: 'Destinatário' },
  { id: 'dest.xNome', label: 'Razão Social Destinatário', group: 'Destinatário' },
  { id: 'dest.xFant', label: 'Nome Fantasia Destinatário', group: 'Destinatário' },
  { id: 'dest.IE', label: 'IE Destinatário', group: 'Destinatário' },
  { id: 'dest.UF', label: 'UF Destinatário', group: 'Destinatário' },
  { id: 'dest.cMun', label: 'Cód. Mun. Destinatário', group: 'Destinatário' },
  { id: 'dest.ISUF', label: 'ISUF Destinatário', group: 'Destinatário' },
  // Remetente
  { id: 'rem.CNPJ', label: 'CNPJ Remetente', group: 'Remetente' },
  { id: 'rem.CPF', label: 'CPF Remetente', group: 'Remetente' },
  { id: 'rem.xNome', label: 'Razão Social Remetente', group: 'Remetente' },
  { id: 'rem.xFant', label: 'Nome Fantasia Remetente', group: 'Remetente' },
  { id: 'rem.IE', label: 'IE Remetente', group: 'Remetente' },
  { id: 'rem.UF', label: 'UF Remetente', group: 'Remetente' },
  { id: 'rem.cMun', label: 'Cód. Mun. Remetente', group: 'Remetente' },
  // Tomador
  { id: 'tomador.toma', label: 'Indicador Tomador', group: 'Tomador' },
  { id: 'tomador.CNPJ', label: 'CNPJ Tomador', group: 'Tomador' },
  { id: 'tomador.CPF', label: 'CPF Tomador', group: 'Tomador' },
  { id: 'tomador.xNome', label: 'Razão Social Tomador', group: 'Tomador' },
  { id: 'tomador.IE', label: 'IE Tomador', group: 'Tomador' },
  { id: 'tomador.UF', label: 'UF Tomador', group: 'Tomador' },
  { id: 'tomador.cMun', label: 'Cód. Mun. Tomador', group: 'Tomador' },
  // ICMS
  { id: 'icms.CST', label: 'CST ICMS', group: 'ICMS' },
  { id: 'icms.vBC', label: 'Base Cálculo ICMS', group: 'ICMS' },
  { id: 'icms.pICMS', label: 'Alíquota ICMS', group: 'ICMS' },
  { id: 'icms.vICMS', label: 'Valor ICMS', group: 'ICMS' },
  { id: 'icms.pRedBC', label: 'Redução BC ICMS', group: 'ICMS' },
  { id: 'icms.vBCSTRet', label: 'BC ICMS ST Retido', group: 'ICMS' },
  { id: 'icms.vICMSSTRet', label: 'Valor ICMS ST Retido', group: 'ICMS' },
  { id: 'icms.vTotTrib', label: 'Valor Total Tributos', group: 'ICMS' },
  // Informações Adicionais
  { id: 'infAdic.xObs', label: 'Observações', group: 'Info Adicionais' },
  { id: 'infAdic.infAdFisco', label: 'Info Adicional Fisco', group: 'Info Adicionais' },
  // Documento NFe vinculado
  { id: 'docNfe.chave_nfe', label: 'Chave NFe Vinculada', group: 'Documentos' },
  { id: 'docNfe.PIN', label: 'PIN NFe', group: 'Documentos' },
  { id: 'docNfe.dPrev', label: 'Data Prevista', group: 'Documentos' },
  // Medidas
  { id: 'medidas.cUnid', label: 'Código Unidade', group: 'Medidas' },
  { id: 'medidas.tpMed', label: 'Tipo Medida', group: 'Medidas' },
  { id: 'medidas.qCarga', label: 'Quantidade Carga', group: 'Medidas' },
];

// Grupos de colunas NFe
export const NFE_COLUMN_GROUPS = [
  'Documento',
  'Emitente',
  'Destinatário',
  'Totais',
  'Info Adicionais',
  'Produtos',
  'ICMS Produto',
  'IPI Produto',
  'PIS Produto',
  'COFINS Produto',
];

// Grupos de colunas CTe
export const CTE_COLUMN_GROUPS = [
  'Documento',
  'Trajeto',
  'Valores',
  'Emitente',
  'Destinatário',
  'Remetente',
  'Tomador',
  'ICMS',
  'Info Adicionais',
  'Documentos',
  'Medidas',
];

// Para retrocompatibilidade
export const AVAILABLE_COLUMNS = NFE_COLUMNS;
