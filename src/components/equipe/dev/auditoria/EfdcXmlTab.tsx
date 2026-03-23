import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import type { EfdcXmlLote } from '@/types/efdcXml';

interface EfdcXmlTabProps {
  lotes?: EfdcXmlLote[];
  isLoading: boolean;
  hasQueried: boolean;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const EfdcXmlTab = ({ lotes = [], isLoading, hasQueried }: EfdcXmlTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredLotes = useMemo(() => {
    if (!debouncedSearch) return lotes;
    const term = debouncedSearch.toLowerCase();
    return lotes.filter(
      (l) =>
        (l.CFOP ?? '').toLowerCase().includes(term) ||
        (l.INTERVALO ?? '').toLowerCase().includes(term)
    );
  }, [lotes, debouncedSearch]);

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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Filtros locais */}
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

        {/* Tabela */}
        {filteredLotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8" />
                  <TableHead className="text-xs">Data Lote</TableHead>
                  <TableHead className="text-xs">Emitente</TableHead>
                  <TableHead className="text-xs">CFOP</TableHead>
                  <TableHead className="text-xs">Intervalo</TableHead>
                  <TableHead className="text-xs text-right">Valor Lote</TableHead>
                  <TableHead className="text-xs text-right">Soma CT-es</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotes.map((lote, idx) => {
                  const isDivergent = lote.VLR_LOTE !== lote.SUM_LOTE;
                  const isExpanded = expandedRows.has(idx);

                  return (
                    <>
                      <TableRow
                        key={`master-${idx}`}
                        className={`cursor-pointer ${isDivergent ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                        onClick={() => toggleRow(idx)}
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
                          {isDivergent && (
                            <AlertTriangle className="inline ml-1.5 h-3.5 w-3.5 text-amber-500" />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`detail-${idx}`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={7} className="p-0 pl-10 pr-4 py-2">
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
        )}
      </CardContent>
    </Card>
  );
};

export default EfdcXmlTab;
