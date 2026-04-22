import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import { renderColumnLabel } from '@/components/equipe/dev/pis-cofins/ColumnTooltip';
import { FieldTooltip, AUDITORIA_TOOLTIPS } from '@/components/equipe/dev/auditoria/tooltipHelpers';
import { parseDate } from '@/lib/dateUtils';
import type { EfdcIcmsNota } from '@/types/efdcIcms';

interface EfdcIcmsTabProps {
  notas?: EfdcIcmsNota[];
  isLoading: boolean;
  error?: Error | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (value?: string) =>
  value ? parseDate(value).toLocaleDateString('pt-BR') : '—';

type FilterKey = 'cfop_icms' | 'cta_icms' | 'cfop_contrib' | 'cta_contrib';

const extractValue = (nota: EfdcIcmsNota, key: FilterKey): string => {
  switch (key) {
    case 'cfop_icms': return nota.EFD_ICMS.CFOP.join(', ');
    case 'cta_icms': return nota.EFD_ICMS.COD_CTA.filter(Boolean).join(', ') || '(vazio)';
    case 'cfop_contrib': return nota.EFD_CONTRIB.CFOP.length ? nota.EFD_CONTRIB.CFOP.join(', ') : '(sem EFD Contrib)';
    case 'cta_contrib': return nota.EFD_CONTRIB.CFOP.length ? (nota.EFD_CONTRIB.COD_CTA.filter(Boolean).join(', ') || '(vazio)') : '(sem EFD Contrib)';
  }
};

const EfdcIcmsTab = ({ notas = [], isLoading, error }: EfdcIcmsTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string> | null>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados EFD ICMS. Tente novamente.');
  }, [error]);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  }, []);

  const handleFilter = useCallback((key: string, values: Set<string> | null) => {
    setColumnFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const processedNotas = useMemo(() => {
    let result = notas;

    // Text search
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter((n) => (n.CHV_NFE ?? '').toLowerCase().includes(term));
    }

    // Column filters
    const filterKeys: FilterKey[] = ['cfop_icms', 'cta_icms', 'cfop_contrib', 'cta_contrib'];
    for (const key of filterKeys) {
      const filterSet = columnFilters[key];
      if (filterSet) {
        result = result.filter((n) => filterSet.has(extractValue(n, key)));
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
  }, [notas, debouncedSearch, columnFilters, sortConfig]);

  // Unique values per column (cascade-aware)
  const uniqueValues = useMemo(() => {
    const keys: FilterKey[] = ['cfop_icms', 'cta_icms', 'cfop_contrib', 'cta_contrib'];
    const result: Record<string, string[]> = {};
    for (const targetKey of keys) {
      // Filter by all OTHER active filters to get cascaded unique values
      let subset = notas;
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        subset = subset.filter((n) => (n.CHV_NFE ?? '').toLowerCase().includes(term));
      }
      for (const otherKey of keys) {
        if (otherKey === targetKey) continue;
        const filterSet = columnFilters[otherKey];
        if (filterSet) {
          subset = subset.filter((n) => filterSet.has(extractValue(n, otherKey)));
        }
      }
      result[targetKey] = [...new Set(subset.map((n) => extractValue(n, targetKey)))];
    }
    return result;
  }, [notas, debouncedSearch, columnFilters]);

  useEffect(() => { setCurrentPage(0); }, [processedNotas]);

  const totalPages = Math.ceil(processedNotas.length / PAGE_SIZE);
  const pagedNotas = processedNotas.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
            <Label className="text-xs flex items-center gap-1">
              Chave NFe
              <FieldTooltip text={AUDITORIA_TOOLTIPS.chaveNfe} />
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm pl-7"
              />
            </div>
          </div>
        </div>

        {processedNotas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="text-xs align-bottom">
                      {renderColumnLabel("Dt. Ini", "Data inicial do período da escrituração.")}
                    </TableHead>
                    <TableHead rowSpan={2} className="text-xs align-bottom border-r">
                      {renderColumnLabel("Chave NFe", "Chave de acesso da NFe (44 dígitos).")}
                    </TableHead>
                    <TableHead colSpan={3} className="text-xs text-center border-r bg-muted/30">
                      {renderColumnLabel("EFD ICMS", "Dados extraídos da EFD ICMS/IPI.")}
                    </TableHead>
                    <TableHead colSpan={3} className="text-xs text-center border-r bg-muted/30">
                      {renderColumnLabel("EFD Contribuições", "Dados extraídos da EFD Contribuições.")}
                    </TableHead>
                    <TableHead colSpan={2} className="text-xs text-center bg-muted/30">
                      {renderColumnLabel("XML", "Dados extraídos do XML original da NFe.")}
                    </TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-xs">
                      {renderColumnLabel("CFOP", "Código Fiscal de Operações e Prestações.")}
                      <ColumnFilterDropdown
                        columnKey="cfop_icms"
                        uniqueValues={uniqueValues.cfop_icms ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.cfop_icms ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs">
                      {renderColumnLabel("Conta Contábil", "Conta contábil vinculada ao item.")}
                      <ColumnFilterDropdown
                        columnKey="cta_icms"
                        uniqueValues={uniqueValues.cta_icms ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.cta_icms ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs text-right border-r">
                      {renderColumnLabel("Valor Doc", "Valor total do documento fiscal.")}
                    </TableHead>
                    <TableHead className="text-xs">
                      {renderColumnLabel("CFOP", "Código Fiscal de Operações e Prestações.")}
                      <ColumnFilterDropdown
                        columnKey="cfop_contrib"
                        uniqueValues={uniqueValues.cfop_contrib ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.cfop_contrib ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs">
                      {renderColumnLabel("Conta Contábil", "Conta contábil vinculada ao item.")}
                      <ColumnFilterDropdown
                        columnKey="cta_contrib"
                        uniqueValues={uniqueValues.cta_contrib ?? []}
                        activeSort={sortConfig}
                        activeFilter={columnFilters.cta_contrib ?? null}
                        onSort={handleSort}
                        onFilter={handleFilter}
                      />
                    </TableHead>
                    <TableHead className="text-xs text-right border-r">
                      {renderColumnLabel("Valor Doc", "Valor total do documento fiscal.")}
                    </TableHead>
                    <TableHead className="text-xs">
                      {renderColumnLabel("CFOP", "Código Fiscal de Operações e Prestações.")}
                    </TableHead>
                    <TableHead className="text-xs text-right">
                      {renderColumnLabel("Valor Doc", "Valor total do documento fiscal.")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedNotas.map((nota, idx) => (
                    <TableRow key={`${nota.CHV_NFE}-${currentPage}-${idx}`}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(nota.EFD_ICMS.DT_INI)}</TableCell>
                      <TableCell className="text-xs font-mono whitespace-nowrap border-r">{nota.CHV_NFE}</TableCell>
                      <TableCell className="text-xs">{nota.EFD_ICMS.CFOP.join(', ')}</TableCell>
                      <TableCell className="text-xs">{nota.EFD_ICMS.COD_CTA.filter(Boolean).join(', ')}</TableCell>
                      <TableCell className="text-xs text-right border-r">{formatBRL(nota.EFD_ICMS.VL_DOC)}</TableCell>
                      {nota.EFD_CONTRIB.CFOP.length === 0 ? (
                        <TableCell colSpan={3} className="text-xs text-center italic text-amber-600 border-r">
                          NFe não encontrada na EFD Contribuições
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-xs">{nota.EFD_CONTRIB.CFOP.join(', ')}</TableCell>
                          <TableCell className="text-xs">{nota.EFD_CONTRIB.COD_CTA.filter(Boolean).join(', ')}</TableCell>
                          <TableCell className="text-xs text-right border-r">{formatBRL(nota.EFD_CONTRIB.VL_DOC)}</TableCell>
                        </>
                      )}
                      {!nota.XML || nota.XML.CFOP.length === 0 ? (
                        <TableCell colSpan={2} className="text-xs text-center italic text-amber-600">
                          XML de nota não encontrado
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-xs">{nota.XML.CFOP.join(', ')}</TableCell>
                          <TableCell className="text-xs text-right">
                            {nota.XML.VL_DOC != null ? formatBRL(nota.XML.VL_DOC) : '—'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedNotas.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EfdcIcmsTab;
