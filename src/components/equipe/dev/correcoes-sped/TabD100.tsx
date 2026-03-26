import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, FileSearch, Network } from 'lucide-react';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { D100Response, FlatD100Item } from '@/types/correcoesSped';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface TabD100Props {
  data: D100Response | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
}

export default function TabD100({ data, isLoading, error, hasQueried, searchText }: TabD100Props) {
  const [page, setPage] = useState(0);

  const flatItems: FlatD100Item[] = useMemo(() => {
    if (!data?.notas) return [];
    return data.notas.flatMap((nota) =>
      nota.itens_efd.map((item) => ({
        ...item,
        chv_cte: nota.chv_cte,
        dt_doc: nota.dt_doc,
        tipo_relacao: nota.tipo_relacao,
      }))
    );
  }, [data]);

  const filtered = useMemo(() => {
    let items = flatItems;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.descr_item.toLowerCase().includes(s) ||
          i.chv_cte.includes(s) ||
          i.cnpj_efd.includes(s)
      );
    }
    return items;
  }, [flatItems, searchText]);

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
                {' '}· {data.notas.length} notas
              </span>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2">EFD</TableHead>
                    <TableHead colSpan={2} className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/70 pb-0 pt-2 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">XML (CTe)</TableHead>
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[200px]">Descrição</TableHead>
                    <TableHead className="text-[11px] min-w-[140px]">CHV CTe</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    {/* XML CTe */}
                    <TableHead className="text-[11px] min-w-[200px] border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">Descrição Serviço</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-emerald-50/60 dark:bg-emerald-950/20">Valor Prestação</TableHead>
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
                  {paged.map((item, idx) => {
                    const xml = item.tipo_relacao === '1:1' && item.cte_itens[0] ? item.cte_itens[0] : null;
                    const valueDivergent = xml && Math.abs(item.vl_item - xml.vPrest) > 0.01;
                    return (
                      <TableRow key={`${item.chv_cte}-${item.num_item}-${idx}`} className="group">
                        <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.descr_item}>
                          {item.descr_item}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <code className="text-[10px] font-mono text-muted-foreground" title={item.chv_cte}>
                            {item.chv_cte.slice(0, 12)}…
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                          {formatCurrency(item.vl_item)}
                        </TableCell>
                        {/* XML CTe zone */}
                        <TableCell className="py-1.5 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/5" title={xml?.xServ}>
                          {xml ? (
                            <Badge
                              variant="outline"
                              className="gap-1 text-[11px] max-w-[190px] border-emerald-200 dark:border-emerald-800"
                            >
                              <FileSearch className="h-3 w-3 shrink-0" />
                              <span className="truncate">{xml.xServ}</span>
                            </Badge>
                          ) : item.tipo_relacao === 'CONSOLIDADO' ? (
                            <Badge className="gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                              <Network className="h-3 w-3 shrink-0" />
                              Consolidado
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-xs text-right py-1.5 font-mono tabular-nums bg-emerald-50/20 dark:bg-emerald-950/5 ${valueDivergent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}>
                          {xml ? formatCurrency(xml.vPrest) : <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>}
                        </TableCell>
                        {/* Tax zone */}
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.cst_pis}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_pis.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_pis)}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cst_cofins}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_cofins.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_cofins)}</TableCell>
                      </TableRow>
                    );
                  })}
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
