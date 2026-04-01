import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, BookOpen } from 'lucide-react';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { A170Item } from '@/types/correcoesSped';

type NcmFilter = 'all' | 'with' | 'without';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

interface TabA170Props {
  data: A170Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  ncmFilter: NcmFilter;
  searchText: string;
  onSelectNcm: (ncm: string) => void;
}

export default function TabA170({ data, isLoading, error, hasQueried, ncmFilter, searchText, onSelectNcm }: TabA170Props) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (ncmFilter === 'with') items = items.filter((i) => !!i.COD_CTA);
    if (ncmFilter === 'without') items = items.filter((i) => !i.COD_CTA);
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          (i.DESCR_COMPL ?? '').toLowerCase().includes(s) ||
          (i.CHV_NFSE && i.CHV_NFSE.includes(s)) ||
          (i.COD_CTA ?? '').includes(s)
      );
    }
    return items;
  }, [data, ncmFilter, searchText]);

  useMemo(() => setPage(0), [ncmFilter, searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados A170...</div>
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
            Nenhum item A170 encontrado para os filtros selecionados.
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
                    <TableHead colSpan={4} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2">EFD</TableHead>
                    <TableHead colSpan={8} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[120px]">CHV NFSe</TableHead>
                    <TableHead className="text-[11px] min-w-[200px]">Descrição</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[130px]">Conta</TableHead>
                    {/* Taxes */}
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">BC PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">BC COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => (
                    <TableRow key={`a170-${item.CHV_NFSE}-${idx}`} className="group">
                      <TableCell className="py-1.5">
                        {item.CHV_NFSE ? (
                          <code className="text-[10px] font-mono text-muted-foreground" title={item.CHV_NFSE}>
                            {item.CHV_NFSE.slice(0, 12)}…
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.DESCR_COMPL}>
                        {item.DESCR_COMPL}
                      </TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                        {formatCurrency(item.VL_ITEM)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground" title={item.DESCRICAO_CONTA}>
                          {item.COD_CTA}
                        </span>
                      </TableCell>
                      {/* Tax zone */}
                      <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.CST_PIS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.VL_BC_PIS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{safeFixed(item.ALIQ_PIS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.VL_PIS)}</TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.CST_COFINS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.VL_BC_COFINS)}</TableCell>
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
