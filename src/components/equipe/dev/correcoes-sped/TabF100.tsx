import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { F100Response, F100Item } from '@/types/correcoesSped';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Dash = () => <span className="text-muted-foreground/50 italic text-center block text-xs">—</span>;

interface TabF100Props {
  data: F100Response | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
}

export default function TabF100({ data, isLoading, error, hasQueried, searchText }: TabF100Props) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data?.itens ?? [];
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.nome.toLowerCase().includes(s) ||
          i.cpf_cnpj.includes(s)
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
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados F100...</div>
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
            Nenhum item F100 encontrado para os filtros selecionados.
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
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2">EFD</TableHead>
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/70 pb-0 pt-2 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">XML</TableHead>
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[80px]">Data</TableHead>
                    <TableHead className="text-[11px] min-w-[180px]">Nome</TableHead>
                    <TableHead className="text-[11px] min-w-[120px]">CPF/CNPJ</TableHead>
                    <TableHead className="text-[11px] min-w-[60px]">Tipo</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    {/* XML placeholder */}
                    <TableHead className="text-[11px] min-w-[120px] border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">—</TableHead>
                    <TableHead className="text-[11px] min-w-[80px] bg-emerald-50/60 dark:bg-emerald-950/20">—</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[80px] bg-emerald-50/60 dark:bg-emerald-950/20">—</TableHead>
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
                    <TableRow key={`f100-${item.cpf_cnpj}-${idx}`} className="group">
                      <TableCell className="text-xs py-1.5 font-mono">{item.dt_oper}</TableCell>
                      <TableCell className="text-xs py-1.5 max-w-[180px] truncate" title={item.nome}>{item.nome}</TableCell>
                      <TableCell className="text-xs py-1.5 font-mono">{item.cpf_cnpj}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {item.tipo_pessoa}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{formatCurrency(item.vl_oper)}</TableCell>
                      {/* XML zone — empty for F100 */}
                      <TableCell className="py-1.5 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/5"><Dash /></TableCell>
                      <TableCell className="py-1.5 bg-emerald-50/20 dark:bg-emerald-950/5"><Dash /></TableCell>
                      <TableCell className="py-1.5 bg-emerald-50/20 dark:bg-emerald-950/5"><Dash /></TableCell>
                      {/* Tax zone */}
                      <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.cst_pis}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_pis.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_pis)}</TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cst_cofins}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_cofins.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_cofins)}</TableCell>
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
