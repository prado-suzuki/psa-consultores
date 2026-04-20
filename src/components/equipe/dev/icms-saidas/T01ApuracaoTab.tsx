import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';
import { T01_MOCK } from './mocks';

interface T01ApuracaoTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const T01ApuracaoTab = ({ enabled, contribuinteId, dataInicio, dataFim }: T01ApuracaoTabProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['icms-saidas-t01', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return T01_MOCK;
    },
    enabled,
    staleTime: Infinity,
  });

  if (!enabled) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-12 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Selecione os filtros e clique em Buscar para carregar a apuração.</p>
        </CardContent>
      </Card>
    );
  }

  const totals = (data ?? []).reduce(
    (acc, r) => ({
      debitos: acc.debitos + r.debitos,
      creditos: acc.creditos + r.creditos,
      estornos: acc.estornos + r.estornos,
      icmsRecolher: acc.icmsRecolher + r.icmsRecolher,
      difal: acc.difal + r.difal,
      totalRecolhido: acc.totalRecolhido + r.totalRecolhido,
      diferenca: acc.diferenca + r.diferenca,
    }),
    { debitos: 0, creditos: 0, estornos: 0, icmsRecolher: 0, difal: 0, totalRecolhido: 0, diferenca: 0 },
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-slate-500" />
          Apuração mensal de ICMS
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
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Débitos Saídas</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Estornos Débito</TableHead>
                  <TableHead className="text-right">ICMS a Recolher</TableHead>
                  <TableHead className="text-right">DIFAL</TableHead>
                  <TableHead className="text-right">Total Recolhido</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((r) => (
                  <TableRow key={r.periodo}>
                    <TableCell className="font-medium">{r.periodo}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.debitos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.creditos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.estornos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.icmsRecolher)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.difal)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(r.totalRecolhido)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm',
                        r.diferenca === 0 ? 'text-emerald-600' : 'text-red-600 font-semibold',
                      )}
                    >
                      {fmt(r.diferenca)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.debitos)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.creditos)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.estornos)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.icmsRecolher)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.difal)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{fmt(totals.totalRecolhido)}</TableCell>
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
