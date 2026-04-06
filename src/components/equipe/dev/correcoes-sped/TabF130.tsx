import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { F130Item } from '@/types/correcoesSped';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

interface TabF130Props {
  data: F130Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
}

export default function TabF130({ data, isLoading, error, hasQueried, searchText }: TabF130Props) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.DESC_IDENT_BEM_IMOB?.toLowerCase().includes(s) ||
          i.DESC_IND_UTIL_BEM_IMOB?.toLowerCase().includes(s) ||
          i.F130.COD_CTA?.toLowerCase().includes(s)
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
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados F130...</div>
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
            Nenhum item F130 encontrado para os filtros selecionados.
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
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">
                      <span className="flex items-center gap-1">
                        Dados do Bem
                        <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Registro F130 — Bens do ativo imobilizado adquiridos no período, com crédito sobre aquisição.</TooltipContent></Tooltip>
                      </span>
                    </TableHead>
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[200px]">Bem Imobilizado</TableHead>
                    <TableHead className="text-[11px] min-w-[140px]">Utilização</TableHead>
                    <TableHead className="text-[11px] min-w-[80px]">Nat. Créd.</TableHead>
                    <TableHead className="text-[11px] min-w-[90px]">Mês Aquis.</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[120px]">VL Aquisição</TableHead>
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
                    <TableRow key={`f130-${item.F130.uuid}-${idx}`} className="group">
                      <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.DESC_IDENT_BEM_IMOB}>{item.DESC_IDENT_BEM_IMOB}</TableCell>
                      <TableCell className="text-xs py-1.5 max-w-[140px] truncate" title={item.DESC_IND_UTIL_BEM_IMOB}>{item.DESC_IND_UTIL_BEM_IMOB}</TableCell>
                      <TableCell className="text-xs py-1.5 font-mono">{item.F130.NAT_BC_CRED}</TableCell>
                      <TableCell className="text-xs py-1.5 font-mono">{item.F130.MES_OPER_AQUIS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{formatCurrency(item.F130.VL_OPER_AQUIS)}</TableCell>
                      {/* Tax zone */}
                      <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.F130.CST_PIS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{safeFixed(item.F130.ALIQ_PIS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.F130.VL_PIS)}</TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.F130.CST_COFINS}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{safeFixed(item.F130.ALIQ_COFINS)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.F130.VL_COFINS)}</TableCell>
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
