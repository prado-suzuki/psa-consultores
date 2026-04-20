import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';
import { T02_MOCK } from './mocks';

interface T02CfopTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const T02CfopTab = ({ enabled, contribuinteId, dataInicio, dataFim }: T02CfopTabProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['icms-saidas-t02', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return T02_MOCK;
    },
    enabled,
    staleTime: Infinity,
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

  const totals = (data ?? []).reduce(
    (acc, r) => ({
      vlItemEfd: acc.vlItemEfd + r.vlItemEfd,
      bcEfd: acc.bcEfd + r.bcEfd,
      icmsEfd: acc.icmsEfd + r.icmsEfd,
      vlItemCliente: acc.vlItemCliente + r.vlItemCliente,
      diferenca: acc.diferenca + r.diferenca,
    }),
    { vlItemEfd: 0, bcEfd: 0, icmsEfd: 0, vlItemCliente: 0, diferenca: 0 },
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          Reconciliação EFD vs. Cliente — por CFOP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[80px]">CFOP</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Vl. Item EFD</TableHead>
                  <TableHead className="text-right">BC EFD</TableHead>
                  <TableHead className="text-right">ICMS EFD</TableHead>
                  <TableHead className="text-right">Vl. Item Cliente</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((r) => {
                  const isDivergent = r.diferenca !== 0;
                  return (
                    <TableRow key={r.cfop} className={cn(isDivergent && 'bg-red-50/50 hover:bg-red-50')}>
                      <TableCell className="font-mono font-medium">{r.cfop}</TableCell>
                      <TableCell className="text-sm text-slate-700">{r.descricao}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.vlItemEfd)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.bcEfd)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.icmsEfd)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(r.vlItemCliente)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-sm',
                          isDivergent ? 'text-red-600 font-semibold' : 'text-emerald-600',
                        )}
                      >
                        {fmt(r.diferenca)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                  <TableCell className="font-bold" colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.vlItemEfd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.bcEfd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.icmsEfd)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.vlItemCliente)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono text-sm font-bold',
                      totals.diferenca === 0 ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {fmt(totals.diferenca)}
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
