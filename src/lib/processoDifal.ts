import type {
  ClassificacoesBuscarResponse,
  DifalApiGroupedItem,
  DifalGroupedItem,
  SyncPayload,
  TipoDecisao,
} from '@/types/difal';

export const PROCESSO_DIFAL_ITEMS_PER_PAGE = 25;
export const PROCESSO_DIFAL_CLIENTES_PERMITIDOS = ['Barralcool', 'COPRODIA'] as const;

export interface ProcessoDifalStats {
  total: number;
  validados: number;
  pendentes: number;
}

export interface ProcessoDifalDecision {
  cod_ncm: string;
  decisao: string;
  id_icms_st_bq: string | null;
}

export function mapDifalApiItems(
  items: DifalApiGroupedItem[],
  contribuinteId: string,
): DifalGroupedItem[] {
  return items.map((item) => ({
    groupKey: `${item.xProd}|${item.cProd}|${item.NCM}`,
    xProd: item.xProd,
    cod_produto: item.cProd,
    cod_ncm: item.NCM,
    id_contribuinte: contribuinteId,
    cfop: item.CFOP,
    cst_icms: item.CST,
    aliq_icms: item.aliq_prod,
    pRedBC: item.pRedBC ?? null,
    count: item.tot_itens,
    totalValue: item.vlr_total,
    nfesCount: item.tot_nfes,
    status: 'pendente',
    classificacao: null,
  }));
}

export function applyDifalClassifications(
  items: DifalGroupedItem[],
  classificacoes: ClassificacoesBuscarResponse | undefined,
  localDecisions: Set<string>,
): DifalGroupedItem[] {
  return items.map((group) => {
    const key = `${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`;
    const classificacao = classificacoes?.[key];
    return {
      ...group,
      status: localDecisions.has(key) || classificacao ? 'validado' : 'pendente',
      classificacao,
    };
  });
}

export function buildProcessoDifalStats(
  qtdValidados: number,
  qtdPendentes: number,
): ProcessoDifalStats {
  return {
    total: (qtdValidados || 0) + (qtdPendentes || 0),
    validados: qtdValidados,
    pendentes: qtdPendentes,
  };
}

export function buildProcessoDifalSyncPayload(
  sessaoId: string,
  decisions: ProcessoDifalDecision[],
  currentPageItems: DifalGroupedItem[],
): SyncPayload {
  const payload: SyncPayload = { sessao_id: sessaoId, decisoes: [] };
  decisions.forEach((decision) => {
    const processedKeys = new Set<string>();
    currentPageItems
      .filter((item) => item.cod_ncm === decision.cod_ncm)
      .forEach((item) => {
        const key = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
        if (processedKeys.has(key)) return;
        processedKeys.add(key);
        payload.decisoes.push({
          id_contribuinte: item.id_contribuinte,
          cod_produto: item.cod_produto,
          cod_ncm: decision.cod_ncm,
          decisao: decision.decisao as TipoDecisao,
          id_icms_st: decision.id_icms_st_bq,
        });
      });
  });
  return payload;
}
