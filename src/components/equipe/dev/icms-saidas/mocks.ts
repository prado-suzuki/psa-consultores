// Mocks centralizados - endpoints reais virão por aba

export interface T01ResumoRow {
  periodo: string;
  debitos: number;
  creditos: number;
  estornos: number;
  icmsRecolher: number;
  difal: number;
  totalRecolhido: number;
  diferenca: number;
}

export interface T01MatrizRow {
  periodo: string;
  apurado: number;
  creditos: number | null;
  devido: number;
  dar: number;
  total: number;
  diferenca: number;
}

export interface T01MatrizSection {
  id: 'icms_normal' | 'icms_difal';
  titulo: string;
  codigo: string;
  observacao: string;
  linhas: T01MatrizRow[];
}

export interface T01ApuracaoData {
  resumoMensal: T01ResumoRow[];
  matrizes: T01MatrizSection[];
}

export const T01_MOCK: T01ApuracaoData = {
  resumoMensal: [
    { periodo: 'Janeiro/2025', debitos: 7543949.05, creditos: 3918715.26, estornos: 2060.13, icmsRecolher: 3623173.66, difal: 544320.33, totalRecolhido: 4167493.99, diferenca: 0 },
    { periodo: 'Fevereiro/2025', debitos: 7078897.96, creditos: 4513253.36, estornos: 1287.98, icmsRecolher: 2564356.62, difal: 1063209.4, totalRecolhido: 3627566.02, diferenca: 0 },
    { periodo: 'Março/2025', debitos: 3759944.96, creditos: 2475076.43, estornos: 4093.81, icmsRecolher: 1280774.72, difal: 907831.95, totalRecolhido: 2188606.67, diferenca: 0 },
    { periodo: 'Abril/2025', debitos: 9846143.02, creditos: 6144657.84, estornos: 1044.45, icmsRecolher: 3700440.73, difal: 756841.84, totalRecolhido: 4457282.57, diferenca: 0 },
    { periodo: 'Maio/2025', debitos: 13326681.46, creditos: 8979267.43, estornos: 1006.02, icmsRecolher: 4346408.01, difal: 926885.44, totalRecolhido: 5273293.45, diferenca: 0 },
    { periodo: 'Junho/2025', debitos: 12450341.22, creditos: 8642014.85, estornos: 1761.82, icmsRecolher: 3806564.55, difal: 2112677.99, totalRecolhido: 5919242.54, diferenca: 0 },
  ],
  matrizes: [
    {
      id: 'icms_normal',
      titulo: 'ICMS Normal - Matriz',
      codigo: '1112',
      observacao: '(E116)',
      linhas: [
        { periodo: 'Janeiro/2025', apurado: 8851443.02, creditos: 4077531.04, devido: 4773911.98, dar: 4773911.98, total: 4773911.98, diferenca: 0 },
        { periodo: 'Fevereiro/2025', apurado: 5038133.59, creditos: 3156112.58, devido: 1882021.01, dar: 1882021.01, total: 1882021.01, diferenca: 0 },
        { periodo: 'Março/2025', apurado: 9286008.49, creditos: 6522353.52, devido: 2763654.97, dar: 2763654.97, total: 2763654.97, diferenca: 0 },
        { periodo: 'Abril/2025', apurado: 13421555.15, creditos: 7230042.58, devido: 6191512.57, dar: 6191512.57, total: 6191512.57, diferenca: 0 },
        { periodo: 'Maio/2025', apurado: 4690389.48, creditos: 2784643.3, devido: 1905746.18, dar: 1905746.18, total: 1905746.18, diferenca: 0 },
        { periodo: 'Junho/2025', apurado: 2937642.08, creditos: 2002735.13, devido: 934906.95, dar: 934906.95, total: 934906.95, diferenca: 0 },
      ],
    },
    {
      id: 'icms_difal',
      titulo: 'ICMS DIFAL - Matriz',
      codigo: '1317/5606/9813/9816/9820',
      observacao: '(E116)',
      linhas: [
        { periodo: 'Janeiro/2025', apurado: 544320.33, creditos: null, devido: 544320.33, dar: 544320.33, total: 544320.33, diferenca: 0 },
        { periodo: 'Fevereiro/2025', apurado: 1063209.4, creditos: null, devido: 1063209.4, dar: 1063209.4, total: 1063209.4, diferenca: 0 },
        { periodo: 'Março/2025', apurado: 907831.95, creditos: null, devido: 907831.95, dar: 907831.95, total: 907831.95, diferenca: 0 },
        { periodo: 'Abril/2025', apurado: 756841.84, creditos: null, devido: 756841.84, dar: 756841.84, total: 756841.84, diferenca: 0 },
        { periodo: 'Maio/2025', apurado: 926885.44, creditos: null, devido: 926885.44, dar: 926885.44, total: 926885.44, diferenca: 0 },
        { periodo: 'Junho/2025', apurado: 2112677.99, creditos: null, devido: 2112677.99, dar: 2112677.99, total: 2112677.99, diferenca: 0 },
      ],
    },
  ],
};

export const T02_MOCK = [
  { cfop: '5101', descricao: 'Venda de produção do estabelecimento', vlItemEfd: 24302079.94, bcEfd: 8306084.15, icmsEfd: 996730.11, vlItemCliente: 24812857.94, diferenca: -510778.0 },
  { cfop: '5401', descricao: 'Venda com ST (contribuinte substituto)', vlItemEfd: 33824638.96, bcEfd: 32850608.4, icmsEfd: 3942073.12, vlItemCliente: 33824638.96, diferenca: 0 },
  { cfop: '5408', descricao: 'Transferência com ST', vlItemEfd: 8075248.0, bcEfd: 7842709.39, icmsEfd: 941125.32, vlItemCliente: 8075248.0, diferenca: 0 },
  { cfop: '5652', descricao: 'Venda combustível (produção)', vlItemEfd: 88131510.97, bcEfd: 64786721.75, icmsEfd: 11013742.66, vlItemCliente: 87238092.53, diferenca: 893418.44 },
  { cfop: '5933', descricao: 'Prestação de serviço tributado ISSQN', vlItemEfd: 942806.82, bcEfd: 0, icmsEfd: 0, vlItemCliente: 210644.45, diferenca: 732162.37 },
  { cfop: '6101', descricao: 'Venda de produção do estabelecimento', vlItemEfd: 71396540.3, bcEfd: 71386575.0, icmsEfd: 8566388.98, vlItemCliente: 71396540.3, diferenca: 0 },
  { cfop: '6109', descricao: 'Venda destinada à ZFM/ALC', vlItemEfd: 28265735.96, bcEfd: 0, icmsEfd: 0, vlItemCliente: 32120154.56, diferenca: -3854418.6 },
  { cfop: '6401', descricao: 'Venda com ST interestadual (substituto)', vlItemEfd: 918082.9, bcEfd: 870511.72, icmsEfd: 104461.4, vlItemCliente: 918083.18, diferenca: -0.28 },
  { cfop: '6652', descricao: 'Venda combustível interestadual', vlItemEfd: 353564821.73, bcEfd: 233217432.57, icmsEfd: 27986091.95, vlItemCliente: 355385405.52, diferenca: -1820583.79 },
  { cfop: '6949', descricao: 'Outras saídas não especificadas', vlItemEfd: 6076424.93, bcEfd: 1179.87, icmsEfd: 82.59, vlItemCliente: 6076255.93, diferenca: 169.0 },
];
