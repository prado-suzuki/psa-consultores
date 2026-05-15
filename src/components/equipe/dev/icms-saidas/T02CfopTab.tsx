import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Calculator } from 'lucide-react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { getCfopDescription } from './cfopDescriptions';
import { ICMS_T02_TOOLTIPS } from './tooltipContent';
import { renderColumnLabel } from './renderColumnLabel';

interface T02CfopTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

interface ResumoCfopApiRow {
  CFOP: number;
  REG: 'C170' | 'C190';
  VL_ITEM: string | number;
  VL_BC_ICMS: string | number;
  VL_ICMS: string | number;
  PCT_VL_ICMS: string | number;
}

interface ResumoCfopApiResponse {
  C170?: ResumoCfopApiRow[];
  C190?: ResumoCfopApiRow[];
}

interface ResumoCfopLinha {
  cfop: number;
  descricao: string;
  vlItem: number;
  vlBcIcms: number;
  vlIcms: number;
  pctVlIcms: number;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtPct = (v: number) =>
  `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}%`;

const toNumber = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const mapRow = (r: ResumoCfopApiRow): ResumoCfopLinha => ({
  cfop: r.CFOP,
  descricao: getCfopDescription(r.CFOP),
  vlItem: toNumber(r.VL_ITEM),
  vlBcIcms: toNumber(r.VL_BC_ICMS),
  vlIcms: toNumber(r.VL_ICMS),
  pctVlIcms: toNumber(r.PCT_VL_ICMS),
});

interface ResumoCfopData {
  c170: ResumoCfopLinha[];
  c190: ResumoCfopLinha[];
}

export const T02CfopTab = ({ enabled, contribuinteId, dataInicio, dataFim }: T02CfopTabProps) => {
  const { fetchWithAuth } = useApiAuth();

  const { data, isLoading, error } = useQuery<ResumoCfopData>({
    queryKey: ['icms-saidas-t02', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('id_contribuinte', contribuinteId);
      if (dataInicio) sp.set('data_nota_ini', dataInicio);
      if (dataFim) sp.set('data_nota_fim', dataFim);

      const url = getApiUrl(`/api/v1/saida_icms/resumo_cfop?${sp.toString()}`);
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const body = await response.text();
        let detail = body;
        try {
          const parsed = JSON.parse(body);
          detail = parsed?.detail?.error_message ?? parsed?.detail ?? parsed?.message ?? body;
          if (typeof detail !== 'string') detail = JSON.stringify(detail);
        } catch {
          // body não era JSON
        }
        const err = new Error(`HTTP ${response.status} — ${detail}`);
        (err as Error & { status?: number }).status = response.status;
        throw err;
      }

      const json: ResumoCfopApiResponse = await response.json();
      const c170 = (json?.C170 ?? []).map(mapRow).sort((a, b) => a.cfop - b.cfop);
      const c190 = (json?.C190 ?? []).map(mapRow).sort((a, b) => a.cfop - b.cfop);
      return { c170, c190 };
    },
    enabled: enabled && !!contribuinteId,
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-12 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Selecione os filtros e clique em Buscar para carregar o resumo por CFOP.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const status = (error as Error & { status?: number }).status;
    return (
      <Card className="border-red-300 bg-red-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Erro retornado pela API {status ? `(HTTP ${status})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <pre className="text-xs font-mono whitespace-pre-wrap bg-white border border-red-200 rounded p-3 text-red-900 max-h-64 overflow-auto">
            {error instanceof Error ? error.message : 'Erro ao consultar o resumo por CFOP.'}
          </pre>
          <p className="text-xs text-red-700">
            Endpoint: <code className="font-mono">/api/v1/saida_icms/resumo_cfop</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CfopTable title="Itens das notas (C170)" rows={data?.c170 ?? []} isLoading={isLoading} />
      <CfopTable title="Resumo analítico (C190)" rows={data?.c190 ?? []} isLoading={isLoading} />
    </div>
  );
};

interface CfopTableProps {
  title: string;
  rows: ResumoCfopLinha[];
  isLoading: boolean;
}

const CfopTable = ({ title, rows, isLoading }: CfopTableProps) => {
  const totals = rows.reduce(
    (acc, r) => ({
      vlItem: acc.vlItem + r.vlItem,
      vlBcIcms: acc.vlBcIcms + r.vlBcIcms,
      vlIcms: acc.vlIcms + r.vlIcms,
      pctVlIcms: acc.pctVlIcms + r.pctVlIcms,
    }),
    { vlItem: 0, vlBcIcms: 0, vlIcms: 0, pctVlIcms: 0 },
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[80px]">
                    {renderColumnLabel('CFOP', ICMS_T02_TOOLTIPS.cfop)}
                  </TableHead>
                  <TableHead>
                    {renderColumnLabel('Descrição', ICMS_T02_TOOLTIPS.descricao)}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnLabel('Vl. Item', ICMS_T02_TOOLTIPS.vlItem)}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnLabel('BC ICMS', ICMS_T02_TOOLTIPS.bcIcms)}
                  </TableHead>
                  <TableHead className="text-right">
                    {renderColumnLabel('ICMS', ICMS_T02_TOOLTIPS.icms)}
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    {renderColumnLabel('% ICMS', ICMS_T02_TOOLTIPS.pctIcms)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.cfop}>
                    <TableCell className="font-mono font-medium">{r.cfop}</TableCell>
                    <TableCell className="text-sm text-slate-700">{r.descricao}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.vlItem)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.vlBcIcms)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.vlIcms)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-600">
                      {fmtPct(r.pctVlIcms)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                  <TableCell className="font-bold" colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.vlItem)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.vlBcIcms)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.vlIcms)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-slate-700">
                    {fmtPct(totals.pctVlIcms)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
