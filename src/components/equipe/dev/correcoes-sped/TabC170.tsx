import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, FileSearch, BookOpen, Network } from 'lucide-react';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { CorrecoesSpedResponse, FlatItemEfd, ItemEfd } from '@/types/correcoesSped';

type NcmFilter = 'all' | 'with' | 'without';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface TabC170Props {
  data: CorrecoesSpedResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  ncmFilter: NcmFilter;
  searchText: string;
  onSelectItem: (item: ItemEfd) => void;
  onSelectNcm: (ncm: string) => void;
}

export default function TabC170({ data, isLoading, error, hasQueried, ncmFilter, searchText, onSelectItem, onSelectNcm }: TabC170Props) {
  const [page, setPage] = useState(0);

  const flatItems: FlatItemEfd[] = useMemo(() => {
    if (!data?.notas) return [];
    return data.notas.flatMap((nota) =>
      nota.itens_efd.map((item) => ({
        ...item,
        chv_nfe: nota.chv_nfe,
        dt_doc: nota.dt_doc,
        tipo_relacao: nota.tipo_relacao,
      }))
    );
  }, [data]);

  const filtered = useMemo(() => {
    let items = flatItems;
    if (ncmFilter === 'with') items = items.filter((i) => !!i.cod_ncm);
    if (ncmFilter === 'without') items = items.filter((i) => !i.cod_ncm);
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.descr_item.toLowerCase().includes(s) ||
          i.chv_nfe.includes(s) ||
          (i.cod_ncm && i.cod_ncm.includes(s))
      );
    }
    return items;
  }, [flatItems, ncmFilter, searchText]);

  // Reset page when filters change
  useMemo(() => setPage(0), [ncmFilter, searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados C170...</div>
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

  if (!hasQueried) return null;
  if (!data) return null;

  return (
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum item encontrado para os filtros selecionados.
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
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/70 pb-0 pt-2 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">XML</TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[200px]">Descrição</TableHead>
                    <TableHead className="text-[11px] min-w-[100px]">NCM</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[200px] border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">Descrição</TableHead>
                    <TableHead className="text-[11px] min-w-[100px] bg-emerald-50/60 dark:bg-emerald-950/20">NCM</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-emerald-50/60 dark:bg-emerald-950/20">Valor</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] min-w-[90px] bg-slate-50/60 dark:bg-slate-800/20">Conta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const xml = item.tipo_relacao === '1:1' && item.nfe_itens[0] ? item.nfe_itens[0] : null;
                    const ncmDivergent = xml && item.cod_ncm && item.cod_ncm !== xml.ncm;
                    const valueDivergent = xml && Math.abs(item.vl_item - xml.vProd) > 0.01;
                    return (
                      <TableRow key={`${item.chv_nfe}-${item.num_item}-${idx}`} className="group">
                        <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.descr_item}>
                          {item.descr_item}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {item.cod_ncm ? (
                            <Badge
                              variant="outline"
                              className="cursor-pointer gap-1 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800"
                              onClick={() => onSelectNcm(item.cod_ncm!)}
                            >
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {item.cod_ncm}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                          {formatCurrency(item.vl_item)}
                        </TableCell>
                        {/* XML zone */}
                        <TableCell className="py-1.5 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/5" title={xml?.xProd}>
                          {xml ? (
                            <Badge
                              variant="outline"
                              className="cursor-pointer gap-1 text-[11px] max-w-[190px] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                              onClick={() => onSelectItem(item)}
                            >
                              <FileSearch className="h-3 w-3 shrink-0" />
                              <span className="truncate">{xml.xProd}</span>
                            </Badge>
                          ) : item.tipo_relacao === 'CONSOLIDADO' ? (
                            <Badge
                              className="cursor-pointer gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                              onClick={() => onSelectItem(item)}
                            >
                              <Network className="h-3 w-3 shrink-0" />
                              Consolidado
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 bg-emerald-50/20 dark:bg-emerald-950/5">
                          {xml ? (
                            ncmDivergent ? (
                              <Badge variant="outline" className="font-mono text-[11px] border-red-200 text-red-600 bg-red-50/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800 gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {xml.ncm}
                              </Badge>
                            ) : (
                              <code className="text-xs font-mono text-muted-foreground">{xml.ncm}</code>
                            )
                          ) : <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>}
                        </TableCell>
                        <TableCell className={`text-xs text-right py-1.5 font-mono tabular-nums bg-emerald-50/20 dark:bg-emerald-950/5 ${valueDivergent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}>
                          {xml ? formatCurrency(xml.vProd) : <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>}
                        </TableCell>
                        {/* Tax zone */}
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.cst_pis}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_pis.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_pis)}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cst_cofins}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_cofins.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_cofins)}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cod_cta}</TableCell>
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
