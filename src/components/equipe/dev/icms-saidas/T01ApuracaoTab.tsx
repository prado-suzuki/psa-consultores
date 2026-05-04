import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIcmsSaidasApuracao } from '@/hooks/useIcmsSaidasApuracao';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';
import type { T01MatrizRow, T01MatrizSection } from './mocks';

interface T01ApuracaoTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const fmtNullableCurrency = (value: number | null) => (value === null ? '—' : fmtCurrency(value));

export const T01ApuracaoTab = ({
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
}: T01ApuracaoTabProps) => {
  const { data, isLoading } = useIcmsSaidasApuracao({
    enabled,
    contribuinteId,
    dataInicio,
    dataFim,
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

  const resumoMensal = data?.resumoMensal ?? [];

  const totals = resumoMensal.reduce(
    (acc, row) => ({
      debitos: acc.debitos + row.debitos,
      creditos: acc.creditos + row.creditos,
      estornos: acc.estornos + row.estornos,
      icmsRecolher: acc.icmsRecolher + row.icmsRecolher,
      difal: acc.difal + row.difal,
      totalRecolhido: acc.totalRecolhido + row.totalRecolhido,
      diferenca: acc.diferenca + row.diferenca,
    }),
    {
      debitos: 0,
      creditos: 0,
      estornos: 0,
      icmsRecolher: 0,
      difal: 0,
      totalRecolhido: 0,
      diferenca: 0,
    },
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-slate-500" />
            Resumo mensal da apuração
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
                  {resumoMensal.map((row) => (
                    <TableRow key={row.periodo}>
                      <TableCell className="font-medium">{row.periodo}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.debitos)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.creditos)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.estornos)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.icmsRecolher)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.difal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.totalRecolhido)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-sm',
                          row.diferenca === 0 ? 'text-emerald-600' : 'text-red-600 font-semibold',
                        )}
                      >
                        {fmtCurrency(row.diferenca)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.debitos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.creditos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.estornos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.icmsRecolher)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.difal)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.totalRecolhido)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm font-bold',
                        totals.diferenca === 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {fmtCurrency(totals.diferenca)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && (data?.matrizes.length ?? 0) > 0 && (
        <div className="space-y-6">
          {data?.matrizes.map((matriz) => (
            <MatrizApuracaoCard key={matriz.id} matriz={matriz} />
          ))}
        </div>
      )}
    </div>
  );
};

const MatrizApuracaoCard = ({ matriz }: { matriz: T01MatrizSection }) => {
  const totals = matriz.linhas.reduce(
    (acc, row) => ({
      apurado: acc.apurado + row.apurado,
      creditos: acc.creditos + (row.creditos ?? 0),
      devido: acc.devido + row.devido,
      dar: acc.dar + row.dar,
      total: acc.total + row.total,
      diferenca: acc.diferenca + row.diferenca,
    }),
    {
      apurado: 0,
      creditos: 0,
      devido: 0,
      dar: 0,
      total: 0,
      diferenca: 0,
    },
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {matriz.titulo}
            </CardTitle>
            <p className="text-xs text-slate-500">Origem da planilha base {matriz.observacao}</p>
          </div>
          <Badge variant="outline" className="w-fit font-mono">
            Cód. {matriz.codigo}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 hover:bg-slate-100">
                <TableHead rowSpan={2} className="min-w-[160px] align-middle">Período</TableHead>
                <TableHead colSpan={2} className="min-w-[320px] text-center">EFD ICMS IPI</TableHead>
                <TableHead className="min-w-[150px] text-center">&nbsp;</TableHead>
                <TableHead colSpan={2} className="min-w-[320px] text-center">Recolhimentos</TableHead>
                <TableHead className="min-w-[180px] text-center">CHECK DIFERENÇAS</TableHead>
              </TableRow>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="min-w-[160px] text-right">Apurado</TableHead>
                <TableHead className="min-w-[160px] text-right">Créditos</TableHead>
                <TableHead className="min-w-[150px] text-right">Devido</TableHead>
                <TableHead className="min-w-[160px] text-right">DAR</TableHead>
                <TableHead className="min-w-[160px] text-right">Total</TableHead>
                <TableHead className="min-w-[180px] text-right">EFD x Recolhido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriz.linhas.map((row) => (
                <MatrizRow key={`${matriz.id}-${row.periodo}`} row={row} />
              ))}
              <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.apurado)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">
                  {matriz.id === 'icms_difal' ? '—' : fmtCurrency(totals.creditos)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.devido)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.dar)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">{fmtCurrency(totals.total)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-sm font-bold',
                    totals.diferenca === 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {fmtCurrency(totals.diferenca)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const MatrizRow = ({ row }: { row: T01MatrizRow }) => (
  <TableRow>
    <TableCell className="font-medium">{row.periodo}</TableCell>
    <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.apurado)}</TableCell>
    <TableCell className="text-right font-mono text-sm">{fmtNullableCurrency(row.creditos)}</TableCell>
    <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.devido)}</TableCell>
    <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.dar)}</TableCell>
    <TableCell className="text-right font-mono text-sm">{fmtCurrency(row.total)}</TableCell>
    <TableCell
      className={cn(
        'text-right font-mono text-sm',
        row.diferenca === 0 ? 'text-emerald-600' : 'text-red-600 font-semibold',
      )}
    >
      {fmtCurrency(row.diferenca)}
    </TableCell>
  </TableRow>
);
