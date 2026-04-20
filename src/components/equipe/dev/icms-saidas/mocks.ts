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

export const T03_1_FAMILIAS_MOCK = [
  { nome: 'Açúcar',               qtdProdutos: 42, valorTotal: 153432245.60, icmsNormal: 14557450.80, creditoPresumido: 11351195.04, icmsRecolher: 3206255.77,  fundes: 681071.70, funded: 113511.95 },
  { nome: 'Etanol Interno',       qtdProdutos: 8,  valorTotal: 67248520.56,  icmsNormal: 11432248.50, creditoPresumido: 0,           icmsRecolher: 11432248.50, fundes: 0,         funded: 0 },
  { nome: 'Etanol Interestadual', qtdProdutos: 15, valorTotal: 27986091.91,  icmsNormal: 27986091.95, creditoPresumido: 4974559.99,  icmsRecolher: 23011531.92, fundes: 230115.32, funded: 230115.32 },
  { nome: 'Biodiesel',            qtdProdutos: 3,  valorTotal: 4125300.00,   icmsNormal: 495036.00,   creditoPresumido: 371277.00,   icmsRecolher: 123759.00,   fundes: 24751.80,  funded: 4125.30 },
];

export const T03_2_FAMILIAS_MOCK = [
  { nome: 'Açúcar ST (interno)',     qtdProdutos: 18, valorTotal: 33824638.96, bcSt: 32850608.40, icmsSt: 3942073.12, mvaPonderada: 12.5 },
  { nome: 'Etanol Interestadual ST', qtdProdutos: 11, valorTotal: 27986091.91, bcSt: 23011531.92, icmsSt: 4974559.99, mvaPonderada: 0 },
];

export const ST_CFOPS = ['5401', '5408', '6401'];
