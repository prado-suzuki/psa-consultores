// Mocks centralizados — endpoints reais virão por aba

export const T01_MOCK = [
  { periodo: 'Janeiro/2025',   debitos: 7543949.05,  creditos: 3918715.26, estornos: 2060.13, icmsRecolher: 3623173.66, difal: 544320.33,  totalRecolhido: 4167493.99, diferenca: 0 },
  { periodo: 'Fevereiro/2025', debitos: 7078897.96,  creditos: 4513253.36, estornos: 1287.98, icmsRecolher: 2564356.62, difal: 1063209.40, totalRecolhido: 3627566.02, diferenca: 0 },
  { periodo: 'Março/2025',     debitos: 3759944.96,  creditos: 2475076.43, estornos: 4093.81, icmsRecolher: 1280774.72, difal: 907831.95,  totalRecolhido: 2188606.67, diferenca: 0 },
  { periodo: 'Abril/2025',     debitos: 9846143.02,  creditos: 6144657.84, estornos: 1044.45, icmsRecolher: 3700440.73, difal: 756841.84,  totalRecolhido: 4457282.57, diferenca: 0 },
  { periodo: 'Maio/2025',      debitos: 13326681.46, creditos: 8979267.43, estornos: 1006.02, icmsRecolher: 4346408.01, difal: 926885.44,  totalRecolhido: 5273293.45, diferenca: 0 },
  { periodo: 'Junho/2025',     debitos: 12450341.22, creditos: 8642014.85, estornos: 1761.82, icmsRecolher: 3806564.55, difal: 2112677.99, totalRecolhido: 5919242.54, diferenca: 0 },
];

export const T02_MOCK = [
  { cfop: '5101', descricao: 'Venda de produção do estabelecimento',     vlItemEfd: 24302079.94, bcEfd: 8306084.15,   icmsEfd: 996730.11,  vlItemCliente: 24812857.94, diferenca: -510778.00 },
  { cfop: '5401', descricao: 'Venda com ST (contribuinte substituto)',   vlItemEfd: 33824638.96, bcEfd: 32850608.40,  icmsEfd: 3942073.12, vlItemCliente: 33824638.96, diferenca: 0 },
  { cfop: '5408', descricao: 'Transferência com ST',                     vlItemEfd: 8075248.00,  bcEfd: 7842709.39,   icmsEfd: 941125.32,  vlItemCliente: 8075248.00,  diferenca: 0 },
  { cfop: '5652', descricao: 'Venda combustível (produção)',             vlItemEfd: 88131510.97, bcEfd: 64786721.75,  icmsEfd: 11013742.66,vlItemCliente: 87238092.53, diferenca: 893418.44 },
  { cfop: '5933', descricao: 'Prestação de serviço tributado ISSQN',     vlItemEfd: 942806.82,   bcEfd: 0,            icmsEfd: 0,          vlItemCliente: 210644.45,   diferenca: 732162.37 },
  { cfop: '6101', descricao: 'Venda de produção do estabelecimento',     vlItemEfd: 71396540.30, bcEfd: 71386575.00,  icmsEfd: 8566388.98, vlItemCliente: 71396540.30, diferenca: 0 },
  { cfop: '6109', descricao: 'Venda destinada à ZFM/ALC',                vlItemEfd: 28265735.96, bcEfd: 0,            icmsEfd: 0,          vlItemCliente: 32120154.56, diferenca: -3854418.60 },
  { cfop: '6401', descricao: 'Venda com ST interestadual (substituto)',  vlItemEfd: 918082.90,   bcEfd: 870511.72,    icmsEfd: 104461.40,  vlItemCliente: 918083.18,   diferenca: -0.28 },
  { cfop: '6652', descricao: 'Venda combustível interestadual',          vlItemEfd: 353564821.73,bcEfd: 233217432.57, icmsEfd: 27986091.95,vlItemCliente: 355385405.52,diferenca: -1820583.79 },
  { cfop: '6949', descricao: 'Outras saídas não especificadas',          vlItemEfd: 6076424.93,  bcEfd: 1179.87,      icmsEfd: 82.59,      vlItemCliente: 6076255.93,  diferenca: 169.00 },
];

// ============ T03.1 ============

export interface T031Linha {
  familia: string | null;
  competencia: string;
  nf: string;
  data: string;
  cfop: string;
  ncm: string;
  codProduto: string;
  descricao: string;
  produto: string;
  valorMercadoria: number;
  incidencia: string;
  bc: number | null;
  aliquota: number | null;
  icmsNormal: number | null;
  percBeneficio: number | null;
  valorCredito: number | null;
  icmsRecolher: number | null;
  fundes: number | null;
  funded: number | null;
}

export const T03_1_RESUMO_MOCK = [
  { competencia: "Janeiro/2025",   icmsNormal: 2027207.60, icmsRecolher: 444146.16, fundes: 94983.69,  funded: 15830.61 },
  { competencia: "Fevereiro/2025", icmsNormal: 1622984.19, icmsRecolher: 366688.27, fundes: 75377.76,  funded: 12562.96 },
  { competencia: "Março/2025",     icmsNormal: 2184337.13, icmsRecolher: 483605.44, fundes: 102043.90, funded: 17007.32 },
  { competencia: "Abril/2025",     icmsNormal: 2704658.21, icmsRecolher: 590264.25, fundes: 126863.64, funded: 21143.94 },
  { competencia: "Maio/2025",      icmsNormal: 2776692.01, icmsRecolher: 615600.76, fundes: 129665.47, funded: 21610.91 },
  { competencia: "Junho/2025",     icmsNormal: 3241571.66, icmsRecolher: 705950.88, fundes: 152137.25, funded: 25356.21 },
];

export const T03_1_LINHAS_MOCK: T031Linha[] = [
  { familia: "Açúcar",               competencia: "Janeiro",   nf: "237419", data: "02/01/2025", cfop: "5401", ncm: "17019900", codProduto: "1001", descricao: "VENDA DE PROD ESTAB COM ST",      produto: "ACUCAR CRISTAL ESP. DOCE DIA 10X2KG",       valorMercadoria: 54920.39,   incidencia: "Sim", bc: 54920.39,   aliquota: 12, icmsNormal: 6590.45,   percBeneficio: 75,    valorCredito: 4942.84,   icmsRecolher: 1647.61,  fundes: 296.57,   funded: 49.43 },
  { familia: "Açúcar",               competencia: "Janeiro",   nf: "237446", data: "03/01/2025", cfop: "5101", ncm: "17019900", codProduto: "1005", descricao: "VENDA DE PROD ESTAB ACUCAR",      produto: "ACUCAR CRISTAL SUP. DOCE DIA BIG BAG - KG", valorMercadoria: 151900.00,  incidencia: "Sim", bc: 151900.00,  aliquota: 12, icmsNormal: 18228.00,  percBeneficio: 75,    valorCredito: 13671.00,  icmsRecolher: 4557.00,  fundes: 820.26,   funded: 136.71 },
  { familia: "Açúcar",               competencia: "Janeiro",   nf: "237450", data: "03/01/2025", cfop: "6101", ncm: "17019900", codProduto: "1008", descricao: "Venda Produção Estabelecimento", produto: "ACUCAR CRISTAL ESPECIAL BEG KG",            valorMercadoria: 98640.00,   incidencia: "Sim", bc: 98640.00,   aliquota: 12, icmsNormal: 11836.80,  percBeneficio: 80,    valorCredito: 9469.44,   icmsRecolher: 2367.36,  fundes: 568.17,   funded: 94.70 },
  { familia: "Etanol Interno",       competencia: "Janeiro",   nf: "300112", data: "05/01/2025", cfop: "5656", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interno",      produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 487620.00,  incidencia: "Sim", bc: 243810.00,  aliquota: 17, icmsNormal: 41447.70,  percBeneficio: 0,     valorCredito: 0,         icmsRecolher: 41447.70, fundes: 0,        funded: 0 },
  { familia: "Etanol Interno",       competencia: "Janeiro",   nf: "300118", data: "07/01/2025", cfop: "5656", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interno",      produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 512300.00,  incidencia: "Sim", bc: 256150.00,  aliquota: 17, icmsNormal: 43545.50,  percBeneficio: 0,     valorCredito: 0,         icmsRecolher: 43545.50, fundes: 0,        funded: 0 },
  { familia: "Etanol Interestadual", competencia: "Janeiro",   nf: "400223", data: "08/01/2025", cfop: "6652", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interestadual",produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 1247800.00, incidencia: "Sim", bc: 1247800.00, aliquota: 12, icmsNormal: 149736.00, percBeneficio: 73.33, valorCredito: 109780.00, icmsRecolher: 39956.00, fundes: 1497.36,  funded: 1497.36 },
  { familia: "Etanol Interestadual", competencia: "Janeiro",   nf: "400241", data: "12/01/2025", cfop: "6652", ncm: "22072010", codProduto: "2101", descricao: "Venda combustível interestadual",produto: "ETANOL ANIDRO COMBUSTIVEL",                 valorMercadoria: 892450.00,  incidencia: "Sim", bc: 892450.00,  aliquota: 12, icmsNormal: 107094.00, percBeneficio: 73.33, valorCredito: 78500.00,  icmsRecolher: 28594.00, fundes: 1070.94,  funded: 1070.94 },
  { familia: "Biodiesel",            competencia: "Janeiro",   nf: "500014", data: "15/01/2025", cfop: "6101", ncm: "38260000", codProduto: "3800", descricao: "Venda biodiesel interestadual",  produto: "BIODIESEL B100",                            valorMercadoria: 245000.00,  incidencia: "Sim", bc: 245000.00,  aliquota: 12, icmsNormal: 29400.00,  percBeneficio: 75,    valorCredito: 22050.00,  icmsRecolher: 7350.00,  fundes: 1470.00,  funded: 245.00 },
  { familia: null,                   competencia: "Janeiro",   nf: "237471", data: "06/01/2025", cfop: "5949", ncm: "23032000", codProduto: "9100", descricao: "SAIDA CONSUMO PROPRIO",          produto: "BAGACO DE CANA",                            valorMercadoria: 2185.21,    incidencia: "Sim", bc: null, aliquota: null, icmsNormal: null, percBeneficio: null, valorCredito: null, icmsRecolher: null, fundes: null, funded: null },
  { familia: null,                   competencia: "Janeiro",   nf: "237482", data: "09/01/2025", cfop: "5949", ncm: "21021090", codProduto: "9200", descricao: "SAIDA CONSUMO PROPRIO",          produto: "LEVEDURA SECA",                             valorMercadoria: 8420.00,    incidencia: "Sim", bc: null, aliquota: null, icmsNormal: null, percBeneficio: null, valorCredito: null, icmsRecolher: null, fundes: null, funded: null },
  { familia: "Açúcar",               competencia: "Fevereiro", nf: "238102", data: "04/02/2025", cfop: "5401", ncm: "17019900", codProduto: "1001", descricao: "VENDA DE PROD ESTAB COM ST",     produto: "ACUCAR CRISTAL ESP. DOCE DIA 10X2KG",       valorMercadoria: 76432.10,   incidencia: "Sim", bc: 76432.10,   aliquota: 12, icmsNormal: 9171.85,   percBeneficio: 75,    valorCredito: 6878.89,   icmsRecolher: 2292.96,  fundes: 412.73,   funded: 68.79 },
  { familia: "Açúcar",               competencia: "Fevereiro", nf: "238145", data: "11/02/2025", cfop: "6101", ncm: "17019900", codProduto: "1008", descricao: "Venda Produção Estabelecimento", produto: "ACUCAR CRISTAL ESPECIAL BEG KG",            valorMercadoria: 162800.00,  incidencia: "Sim", bc: 162800.00,  aliquota: 12, icmsNormal: 19536.00,  percBeneficio: 80,    valorCredito: 15628.80,  icmsRecolher: 3907.20,  fundes: 937.73,   funded: 156.29 },
  { familia: "Etanol Interno",       competencia: "Fevereiro", nf: "300205", data: "06/02/2025", cfop: "5656", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interno",      produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 445200.00,  incidencia: "Sim", bc: 222600.00,  aliquota: 17, icmsNormal: 37842.00,  percBeneficio: 0,     valorCredito: 0,         icmsRecolher: 37842.00, fundes: 0,        funded: 0 },
  { familia: "Etanol Interestadual", competencia: "Fevereiro", nf: "400389", data: "18/02/2025", cfop: "6652", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interestadual",produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 1580200.00, incidencia: "Sim", bc: 1580200.00, aliquota: 12, icmsNormal: 189624.00, percBeneficio: 73.33, valorCredito: 139000.00, icmsRecolher: 50624.00, fundes: 1896.24,  funded: 1896.24 },
  { familia: null,                   competencia: "Fevereiro", nf: "238201", data: "20/02/2025", cfop: "5949", ncm: "23099090", codProduto: "9300", descricao: "SAIDA CONSUMO PROPRIO",          produto: "BORRA DE DESTILACAO",                       valorMercadoria: 3150.00,    incidencia: "Sim", bc: null, aliquota: null, icmsNormal: null, percBeneficio: null, valorCredito: null, icmsRecolher: null, fundes: null, funded: null },
  { familia: "Açúcar",               competencia: "Março",     nf: "238789", data: "10/03/2025", cfop: "5401", ncm: "17019900", codProduto: "1012", descricao: "VENDA DE PROD ESTAB COM ST",     produto: "ACUCAR CRISTAL ESP. DOCE DIA 30X1KG",       valorMercadoria: 89120.00,   incidencia: "Sim", bc: 89120.00,   aliquota: 12, icmsNormal: 10694.40,  percBeneficio: 75,    valorCredito: 8020.80,   icmsRecolher: 2673.60,  fundes: 481.25,   funded: 80.21 },
  { familia: "Açúcar",               competencia: "Março",     nf: "238812", data: "15/03/2025", cfop: "6101", ncm: "17019900", codProduto: "1015", descricao: "Venda Produção Estabelecimento", produto: "ACUCAR CRISTAL ESP. DOCE DIA 50KG",         valorMercadoria: 145768.00,  incidencia: "Sim", bc: 145768.00,  aliquota: 12, icmsNormal: 17492.16,  percBeneficio: 80,    valorCredito: 13993.73,  icmsRecolher: 3498.43,  fundes: 839.62,   funded: 139.94 },
  { familia: "Etanol Interestadual", competencia: "Março",     nf: "400521", data: "22/03/2025", cfop: "6652", ncm: "22072010", codProduto: "2101", descricao: "Venda combustível interestadual",produto: "ETANOL ANIDRO COMBUSTIVEL",                 valorMercadoria: 1124000.00, incidencia: "Sim", bc: 1124000.00, aliquota: 12, icmsNormal: 134880.00, percBeneficio: 73.33, valorCredito: 98930.00,  icmsRecolher: 35950.00, fundes: 1348.80,  funded: 1348.80 },
  { familia: "Biodiesel",            competencia: "Abril",     nf: "500089", data: "08/04/2025", cfop: "6101", ncm: "38260000", codProduto: "3800", descricao: "Venda biodiesel interestadual",  produto: "BIODIESEL B100",                            valorMercadoria: 312500.00,  incidencia: "Sim", bc: 312500.00,  aliquota: 12, icmsNormal: 37500.00,  percBeneficio: 75,    valorCredito: 28125.00,  icmsRecolher: 9375.00,  fundes: 1875.00,  funded: 312.50 },
  { familia: null,                   competencia: "Abril",     nf: "239445", data: "12/04/2025", cfop: "5949", ncm: "23099090", codProduto: "9400", descricao: "SAIDA CONSUMO PROPRIO",          produto: "TORTA DE FILTRO",                           valorMercadoria: 5820.00,    incidencia: "Sim", bc: null, aliquota: null, icmsNormal: null, percBeneficio: null, valorCredito: null, icmsRecolher: null, fundes: null, funded: null },
];

// ============ T03.2 ============

export interface T032Linha {
  familia: string | null;
  competencia: string;
  nf: string;
  data: string;
  cfop: string;
  cst: string;
  ncm: string;
  codProduto: string;
  descricao: string;
  produto: string;
  valorMercadoria: number;
  incidencia: string;
  bcSt: number | null;
  aliquota: number | null;
  mva: number | null;
  icmsSt: number | null;
  efdBcSt: number | null;
  diferenca: number | null;
}

export const T03_2_RESUMO_MOCK = [
  { competencia: "Janeiro/2025",   icmsSt: 166536.57, bcSt: 1388638.08, diferencaEfd: 0.00 },
  { competencia: "Fevereiro/2025", icmsSt: 160363.69, bcSt: 1336364.11, diferencaEfd: 0.01 },
  { competencia: "Março/2025",     icmsSt: 201459.12, bcSt: 1678825.97, diferencaEfd: 0.00 },
  { competencia: "Abril/2025",     icmsSt: 206886.93, bcSt: 1724057.75, diferencaEfd: 0.09 },
  { competencia: "Maio/2025",      icmsSt: 256740.74, bcSt: 2139506.13, diferencaEfd: 0.05 },
  { competencia: "Junho/2025",     icmsSt: 275919.86, bcSt: 2299332.22, diferencaEfd: 0.06 },
];

export const T03_2_LINHAS_MOCK: T032Linha[] = [
  { familia: "Açúcar ST",               competencia: "Janeiro",   nf: "237419", data: "02/01/2025", cfop: "5401", cst: "060", ncm: "17019900", codProduto: "1001", descricao: "VENDA DE PROD ESTAB COM ST",      produto: "ACUCAR CRISTAL ESP. DOCE DIA 10X2KG",       valorMercadoria: 54920.39,   incidencia: "Sim", bcSt: 13570.05,   aliquota: 12, mva: 35, icmsSt: 1628.41,   efdBcSt: 13570.05,   diferenca: 0 },
  { familia: "Açúcar ST",               competencia: "Janeiro",   nf: "237446", data: "03/01/2025", cfop: "5401", cst: "060", ncm: "17019900", codProduto: "1005", descricao: "VENDA DE PROD ESTAB ACUCAR",      produto: "ACUCAR CRISTAL SUP. DOCE DIA BIG BAG - KG", valorMercadoria: 151900.00,  incidencia: "Sim", bcSt: 37525.00,   aliquota: 12, mva: 35, icmsSt: 4503.00,   efdBcSt: 37525.00,   diferenca: 0 },
  { familia: "Etanol Interestadual ST", competencia: "Janeiro",   nf: "400223", data: "08/01/2025", cfop: "6652", cst: "010", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interestadual",produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 1247800.00, incidencia: "Sim", bcSt: 1247800.00, aliquota: 17, mva: 0,  icmsSt: 212126.00, efdBcSt: 1247800.00, diferenca: 0 },
  { familia: null,                      competencia: "Janeiro",   nf: "237482", data: "09/01/2025", cfop: "5949", cst: "060", ncm: "33049990", codProduto: "9500", descricao: "SAIDA CONSUMO PROPRIO",          produto: "PRODUTO DIVERSO COM ST",                    valorMercadoria: 12500.00,   incidencia: "Sim", bcSt: null, aliquota: null, mva: null, icmsSt: null, efdBcSt: null, diferenca: null },
  { familia: "Açúcar ST",               competencia: "Fevereiro", nf: "238102", data: "04/02/2025", cfop: "5401", cst: "060", ncm: "17019900", codProduto: "1001", descricao: "VENDA DE PROD ESTAB COM ST",      produto: "ACUCAR CRISTAL ESP. DOCE DIA 10X2KG",       valorMercadoria: 76432.10,   incidencia: "Sim", bcSt: 18865.85,   aliquota: 12, mva: 35, icmsSt: 2263.90,   efdBcSt: 18865.85,   diferenca: 0 },
  { familia: "Etanol Interestadual ST", competencia: "Fevereiro", nf: "400389", data: "18/02/2025", cfop: "6652", cst: "010", ncm: "22072010", codProduto: "2100", descricao: "Venda combustível interestadual",produto: "ETANOL HIDRATADO COMBUSTIVEL",              valorMercadoria: 1580200.00, incidencia: "Sim", bcSt: 1580200.00, aliquota: 17, mva: 0,  icmsSt: 268634.00, efdBcSt: 1580200.00, diferenca: 0 },
  { familia: "Açúcar ST",               competencia: "Março",     nf: "238789", data: "10/03/2025", cfop: "5401", cst: "060", ncm: "17019900", codProduto: "1012", descricao: "VENDA DE PROD ESTAB COM ST",      produto: "ACUCAR CRISTAL ESP. DOCE DIA 30X1KG",       valorMercadoria: 89120.00,   incidencia: "Sim", bcSt: 22010.20,   aliquota: 12, mva: 35, icmsSt: 2641.22,   efdBcSt: 22010.20,   diferenca: 0 },
  { familia: "Etanol Interestadual ST", competencia: "Março",     nf: "400521", data: "22/03/2025", cfop: "6652", cst: "010", ncm: "22072010", codProduto: "2101", descricao: "Venda combustível interestadual",produto: "ETANOL ANIDRO COMBUSTIVEL",                 valorMercadoria: 1124000.00, incidencia: "Sim", bcSt: 1124000.00, aliquota: 17, mva: 0,  icmsSt: 191080.00, efdBcSt: 1124000.00, diferenca: 0 },
];

const COMP_ORDER = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const compIndex = (c: string) => COMP_ORDER.indexOf(c);
