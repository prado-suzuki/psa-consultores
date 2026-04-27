import type { DifalGroupedItem } from '@/types/difal';

const pickFirst = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return null;
};

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function buildAuditGroupFromRow(
  row: Record<string, unknown>,
  contribuinteId: string,
): DifalGroupedItem {
  const ncm = String(
    pickFirst(row, ['COD_NCM', 'NCM', 'cod_ncm', 'ncm']) ?? '',
  );
  const codProduto = String(
    pickFirst(row, ['COD_PRODUTO', 'CODIGO_PRODUTO', 'COD_PROD', 'cod_produto']) ?? '',
  );
  const xProd = String(
    pickFirst(row, [
      'PRODUTO',
      'DESCR_PRODUTO',
      'NOME_PRODUTO',
      'DESCRICAO_PRODUTO',
      'xProd',
    ]) ?? '',
  );
  const nf = String(
    pickFirst(row, ['NUM_NOTA', 'NF', 'NUMERO_NOTA', 'NUM_DOC', 'num_nota']) ?? '',
  );
  const cfop = String(pickFirst(row, ['CFOP', 'cfop']) ?? '');
  const cstRaw = pickFirst(row, ['CST_ICMS', 'CST', 'cst_icms', 'cst']);
  const aliqRaw = pickFirst(row, ['ALIQ_ICMS', 'ALIQUOTA', 'aliq_icms', 'aliquota']);
  const valor = toNumber(
    pickFirst(row, [
      'VALOR_MERCADORIA',
      'VL_MERCADORIA',
      'VALOR',
      'VL_OPER',
      'VL_DOC',
    ]),
  );

  return {
    groupKey: `${nf}|${codProduto}|${ncm}`,
    xProd,
    cod_produto: codProduto,
    cod_ncm: ncm,
    id_contribuinte: contribuinteId,
    cfop,
    cst_icms: cstRaw != null ? String(cstRaw) : null,
    aliq_icms: toNumber(aliqRaw),
    pRedBC: null,
    count: 1,
    totalValue: valor ?? 0,
    nfesCount: 1,
    status: 'pendente',
    classificacao: null,
  };
}

export function pickTipoOperacao(row: Record<string, unknown>): string {
  const v = pickFirst(row, ['DESCRICAO', 'DESCR', 'DESC_OPERACAO', 'descricao']);
  return v != null ? String(v) : '';
}
