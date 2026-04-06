import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { D100Item } from '@/types/correcoesSped';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

const SIMPLES_LABELS: Record<string, string> = {
  A: 'Ausente',
  O: 'Optante',
  N: 'Não Optante',
};
const formatSimples = (code: string | null | undefined) =>
  SIMPLES_LABELS[code ?? ''] ?? code ?? '—';

interface TabD100Props {
  data: D100Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
}

export default function TabD100({ data, isLoading, error, hasQueried, searchText }: TabD100Props) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.CHV_CTE.toLowerCase().includes(s) ||
          i.CNPJ_EFD.includes(s)
      );
    }
    return items;
  }, [data, searchText]);

  useMemo(() => setPage(0), [searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados D100...</div>
      </CardContent></Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (!hasQueried || !data) return null;

  return (
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum item D100 encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados
              </span>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[80px]">Data</TableHead>
                    <TableHead className="text-[11px] min-w-[140px]">CHV CTe</TableHead>
                    <TableHead className="text-[11px] min-w-[130px]">CNPJ</TableHead>
                    <TableHead className="text-[11px] min-w-[70px]"><span className="flex items-center gap-1">Simples<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Indica se o participante da operação é optante pelo Simples Nacional.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]"><span className="flex items-center gap-1 justify-end">Valor Doc<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Valor total do documento fiscal de transporte.</TooltipContent></Tooltip></span></TableHead>
                    {/* Taxes */}
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => (
                    <TableRow key={`d100-${item.CHV_CTE}-${idx}`} className="group">
                      <TableCell className="text-xs py-1.5 font-mono">{item.DT_DOC}</TableCell>
                      <TableCell className="py-1.5">
                        <code className="text-[10px] font-mono text-muted-foreground" title={item.CHV_CTE}>
                          {item.CHV_CTE.slice(0, 12)}…
                        </code>
                      </TableCell>
                      <TableCell className="text-xs py-1.5 font-mono">{item.CNPJ_EFD}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {formatSimples(item.SIMPLES)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                        {formatCurrency(item.VL_DOC)}
                      </TableCell>
                      {/* Tax zone */}
                      <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.CST_PIS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{safeFixed(item.ALIQ_PIS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.VL_PIS)}</TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.CST_COFINS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{safeFixed(item.ALIQ_COFINS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.VL_COFINS)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 pb-3">
              <TablePagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
