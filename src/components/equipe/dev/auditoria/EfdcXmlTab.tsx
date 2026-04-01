import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import type { EfdcXmlLote } from '@/types/efdcXml';

interface EfdcXmlTabProps {
  lotes?: EfdcXmlLote[];
  isLoading: boolean;
  error?: Error | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type FilterKey = 'emitente' | 'cfop';

const extractValue = (lote: EfdcXmlLote, key: FilterKey): string => {
  switch (key) {
    case 'emitente': return lote.NOME_EMIT || '(vazio)';
    case 'cfop': return lote.CFOP || '(vazio)';
  }
};

const EfdcXmlTab = ({ lotes = [], isLoading, error }: EfdcXmlTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string> | null>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados de XMLs. Tente novamente.');
  }, [error]);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  }, []);

  const handleFilter = useCallback((key: string, values: Set<string> | null) => {
    setColumnFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const processedLotes = useMemo(() => {
    let result = lotes;

    // Text search
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          (l.CFOP ?? '').toLowerCase().includes(term) ||
          (l.INTERVALO ?? '').toLowerCase().includes(term)
      );
    }

    // Column filters
    const filterKeys: FilterKey[] = ['emitente', 'cfop'];
    for (const key of filterKeys) {
      const filterSet = columnFilters[key];
      if (filterSet) {
        result = result.filter((l) => filterSet.has(extractValue(l, key)));
      }
    }

    // Sort
    if (sortConfig) {
      const { key, direction } = sortConfig;
      const mult = direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const va = extractValue(a, key as FilterKey);
        const vb = extractValue(b, key as FilterKey);
        return va.localeCompare(vb, 'pt-BR') * mult;
      });
    }

    return result;
  }, [lotes, debouncedSearch, columnFilters, sortConfig]);

  // Unique values per column (cascade-aware)
  const uniqueValues = useMemo(() => {
    const keys: FilterKey[] = ['emitente', 'cfop'];
    const result: Record<string, string[]> = {};
    for (const targetKey of keys) {
      let subset = lotes;
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        subset = subset.filter(
          (l) =>
            (l.CFOP ?? '').toLowerCase().includes(term) ||
            (l.INTERVALO ?? '').toLowerCase().includes(term)
        );
      }
      for (const otherKey of keys) {
        if (otherKey === targetKey) continue;
        const filterSet = columnFilters[otherKey];
        if (filterSet) {
          subset = subset.filter((l) => filterSet.has(extractValue(l, otherKey)));
        }
      }
      result[targetKey] = [...new Set(subset.map((l) => extractValue(l, targetKey)))];
    }
    return result;
  }, [lotes, debouncedSearch, columnFilters]);

  useEffect(() => {
    setCurrentPage(0);
    setExpandedRows(new Set());
  }, [processedLotes]);

  const totalPages = Math.ceil(processedLotes.length / PAGE_SIZE);
  const pagedLotes = processedLotes.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!hasQueried) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Selecione os filtros e clique em Consultar</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive">Falha ao carregar os dados. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[220px]">
            <Label className="text-xs">CFOP / Intervalo</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por CFOP ou intervalo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm pl-7"
              />
            </div>
          </div>
        </div>

        {processedLotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8" />
                    <TableHead className="text-xs">Data Lote</TableHead>
                    <TableHead className="text-xs">
                      Emitente
                      <ColumnFilterDropdown
                        columnKey="emitente"
                        uniqueValues={uniqueValues.emitente ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.emitente ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs">
                      CFOP
                      <ColumnFilterDropdown
                        columnKey="cfop"
                        uniqueValues={uniqueValues.cfop ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.cfop ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Intervalo</TableHead>
                    <TableHead className="text-xs text-right">Valor Lote</TableHead>
                    <TableHead className="text-xs text-right">Soma CT-es</TableHead>
                    <TableHead className="text-xs text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLotes.map((lote, idx) => {
                    const globalIdx = currentPage * PAGE_SIZE + idx;
                    const isExpanded = expandedRows.has(globalIdx);

                    return (
                      <>
                        <TableRow
                          key={`master-${globalIdx}`}
                          className="cursor-pointer"
                          onClick={() => toggleRow(globalIdx)}
                        >
                          <TableCell className="px-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{lote.DT_LOTE}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{lote.NOME_EMIT}</TableCell>
                          <TableCell className="text-xs">{lote.CFOP}</TableCell>
                          <TableCell className="text-xs">{lote.INTERVALO}</TableCell>
                          <TableCell className="text-xs text-right">{formatBRL(lote.VLR_LOTE)}</TableCell>
                          <TableCell className="text-xs text-right whitespace-nowrap">
                            {formatBRL(lote.SUM_LOTE)}
                          </TableCell>
                          {(() => {
                            const diff = lote.VLR_LOTE - lote.SUM_LOTE;
                            const hasDiff = Math.abs(diff) > 0.05;
                            return (
                              <TableCell className={`text-xs text-right whitespace-nowrap ${hasDiff ? 'text-destructive font-medium' : ''}`}>
                                {formatBRL(diff)}
                              </TableCell>
                            );
                          })()}
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`detail-${globalIdx}`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="p-0 pl-10 pr-4 py-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Chave CT-e</TableHead>
                                    <TableHead className="text-xs">Número</TableHead>
                                    <TableHead className="text-xs text-right">Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {lote.CTES.map((cte, cIdx) => (
                                    <TableRow key={cte.CHV_CTE || cIdx}>
                                      <TableCell className="text-xs font-mono">{cte.CHV_CTE}</TableCell>
                                      <TableCell className="text-xs">{cte.NR_CTE}</TableCell>
                                      <TableCell className="text-xs text-right">{formatBRL(cte.VLR_CTE)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedLotes.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EfdcXmlTab;
