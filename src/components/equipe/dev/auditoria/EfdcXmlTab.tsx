import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import { renderColumnLabel } from '@/components/equipe/dev/pis-cofins/ColumnTooltip';
import { FieldTooltip, AUDITORIA_TOOLTIPS } from '@/components/equipe/dev/auditoria/tooltipHelpers';
import { parseDate } from '@/lib/dateUtils';
import type { EfdcXmlLote } from '@/types/efdcXml';

interface EfdcXmlTabProps {
  lotes?: EfdcXmlLote[];
  isLoading: boolean;
  error?: Error | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (value?: string) =>
  value ? parseDate(value).toLocaleDateString('pt-BR') : '—';

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
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string> | null>>({});

  // Modal state
  const [selectedLote, setSelectedLote] = useState<EfdcXmlLote | null>(null);
  const [cteSearch, setCteSearch] = useState('');

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

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          (l.CFOP ?? '').toLowerCase().includes(term) ||
          (l.INTERVALO ?? '').toLowerCase().includes(term)
      );
    }

    const filterKeys: FilterKey[] = ['emitente', 'cfop'];
    for (const key of filterKeys) {
      const filterSet = columnFilters[key];
      if (filterSet) {
        result = result.filter((l) => filterSet.has(extractValue(l, key)));
      }
    }

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
  }, [processedLotes]);

  const totalPages = Math.ceil(processedLotes.length / PAGE_SIZE);
  const pagedLotes = processedLotes.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Filtered CT-es for modal
  const filteredCtes = useMemo(() => {
    if (!selectedLote) return [];
    if (!cteSearch) return selectedLote.CTES;
    const term = cteSearch.toLowerCase();
    return selectedLote.CTES.filter(
      (cte) =>
        (cte.CHV_CTE ?? '').toLowerCase().includes(term) ||
        String(cte.NR_CTE).includes(term)
    );
  }, [selectedLote, cteSearch]);

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

  const modalDiff = selectedLote ? selectedLote.VLR_LOTE - selectedLote.SUM_LOTE : 0;
  const modalHasDiff = Math.abs(modalDiff) > 0.05;

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[220px]">
              <Label className="text-xs flex items-center gap-1">
                CFOP / Intervalo
                <FieldTooltip text={AUDITORIA_TOOLTIPS.cfopIntervalo} />
              </Label>
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
                      <TableHead className="text-xs">
                        {renderColumnLabel("Data Início", "Data inicial do período do lote.")}
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Data Lote", "Data de emissão/processamento do lote.")}
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Emitente", "Razão social do emitente do lote de CT-es.")}
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
                        {renderColumnLabel("CFOP", "Código Fiscal de Operações e Prestações.")}
                        <ColumnFilterDropdown
                          columnKey="cfop"
                          uniqueValues={uniqueValues.cfop ?? []}
                          activeSort={sortConfig}
                          activeFilter={columnFilters.cfop ?? null}
                          onSort={handleSort}
                          onFilter={handleFilter}
                        />
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Série", "Série dos documentos do lote.")}
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Cód. Sit.", "Código de situação dos documentos.")}
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Intervalo", "Intervalo de numeração dos CT-es do lote.")}
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        {renderColumnLabel("Valor Lote", "Valor total declarado do lote na EFD.")}
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        {renderColumnLabel("Soma CT-es", "Somatório dos valores dos CT-es individuais.")}
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        {renderColumnLabel("Diferença", "Diferença entre Valor Lote e Soma CT-es. Vermelho indica divergência > R$ 0,05.")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLotes.map((lote, idx) => {
                      const diff = lote.VLR_LOTE - lote.SUM_LOTE;
                      const hasDiff = Math.abs(diff) > 0.05;

                      return (
                        <TableRow
                          key={`row-${currentPage * PAGE_SIZE + idx}`}
                          className="cursor-pointer"
                          onClick={() => { setSelectedLote(lote); setCteSearch(''); }}
                        >
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(lote.DT_INI)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(lote.DT_LOTE)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{lote.NOME_EMIT}</TableCell>
                          <TableCell className="text-xs">{lote.CFOP}</TableCell>
                          <TableCell className="text-xs">{lote.SERIE || '—'}</TableCell>
                          <TableCell className="text-xs">{lote.COD_SIT ?? '—'}</TableCell>
                          <TableCell className="text-xs">{lote.INTERVALO}</TableCell>
                          <TableCell className="text-xs text-right">{formatBRL(lote.VLR_LOTE)}</TableCell>
                          <TableCell className="text-xs text-right whitespace-nowrap">{formatBRL(lote.SUM_LOTE)}</TableCell>
                          <TableCell className={`text-xs text-right whitespace-nowrap ${hasDiff ? 'text-destructive font-medium' : ''}`}>
                            {formatBRL(diff)}
                          </TableCell>
                        </TableRow>
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

      {/* Modal de detalhes CT-e */}
      <Dialog open={selectedLote !== null} onOpenChange={(open) => { if (!open) setSelectedLote(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes do Lote</DialogTitle>
          </DialogHeader>

          {selectedLote && (
            <div className="space-y-4">
              {/* Resumo do lote */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Emitente:</span> {selectedLote.NOME_EMIT}</div>
                <div><span className="text-muted-foreground">CFOP:</span> {selectedLote.CFOP}</div>
                <div><span className="text-muted-foreground">Data Início:</span> {formatDate(selectedLote.DT_INI)}</div>
                <div><span className="text-muted-foreground">Data Lote:</span> {formatDate(selectedLote.DT_LOTE)}</div>
                <div><span className="text-muted-foreground">Série:</span> {selectedLote.SERIE || '—'}</div>
                <div><span className="text-muted-foreground">Cód. Sit.:</span> {selectedLote.COD_SIT ?? '—'}</div>
                <div><span className="text-muted-foreground">Intervalo:</span> {selectedLote.INTERVALO}</div>
              </div>

              <div className="flex items-center gap-4 text-sm border rounded-md p-3 bg-muted/30">
                <div><span className="text-muted-foreground">Valor Lote:</span> {formatBRL(selectedLote.VLR_LOTE)}</div>
                <div><span className="text-muted-foreground">Soma CT-es:</span> {formatBRL(selectedLote.SUM_LOTE)}</div>
                <div className={modalHasDiff ? 'text-destructive font-medium' : ''}>
                  <span className="text-muted-foreground">Diferença:</span> {formatBRL(modalDiff)}
                </div>
              </div>

              {/* Busca CT-e */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por chave ou número do CT-e..."
                  value={cteSearch}
                  onChange={(e) => setCteSearch(e.target.value)}
                  className="h-8 text-sm pl-7"
                />
              </div>

              {/* Tabela CT-es */}
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Chave CT-e", "Chave de acesso do CT-e (44 dígitos).")}
                      </TableHead>
                      <TableHead className="text-xs">
                        {renderColumnLabel("Número", "Número do CT-e.")}
                      </TableHead>
                      <TableHead className="text-xs text-right">
                        {renderColumnLabel("Valor", "Valor do CT-e.")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCtes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                          Nenhum CT-e encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCtes.map((cte, cIdx) => (
                        <TableRow key={cte.CHV_CTE || cIdx}>
                          <TableCell className="text-xs font-mono">{cte.CHV_CTE}</TableCell>
                          <TableCell className="text-xs">{cte.NR_CTE}</TableCell>
                          <TableCell className="text-xs text-right">{formatBRL(cte.VLR_CTE)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EfdcXmlTab;
