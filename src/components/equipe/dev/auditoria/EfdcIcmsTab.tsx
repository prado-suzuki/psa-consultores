import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { EfdcIcmsNota } from '@/types/efdcIcms';

interface EfdcIcmsTabProps {
  notas?: EfdcIcmsNota[];
  isLoading: boolean;
  error?: Error | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const EfdcIcmsTab = ({ notas = [], isLoading, error }: EfdcIcmsTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados EFD ICMS. Tente novamente.');
  }, [error]);

  const filteredNotas = useMemo(() => {
    if (!debouncedSearch) return notas;
    const term = debouncedSearch.toLowerCase();
    return notas.filter((n) => (n.CHV_NFE ?? '').toLowerCase().includes(term));
  }, [notas, debouncedSearch]);

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, notas]);

  const totalPages = Math.ceil(filteredNotas.length / PAGE_SIZE);
  const pagedNotas = filteredNotas.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
            <Label className="text-xs">Chave NFe</Label>
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

        {filteredNotas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="text-xs align-bottom border-r">Chave NFe</TableHead>
                    <TableHead colSpan={3} className="text-xs text-center border-r bg-muted/30">EFD ICMS</TableHead>
                    <TableHead colSpan={3} className="text-xs text-center border-r bg-muted/30">EFD Contribuições</TableHead>
                    <TableHead colSpan={2} className="text-xs text-center bg-muted/30">XML</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-xs">CFOP</TableHead>
                    <TableHead className="text-xs">Conta Contábil</TableHead>
                    <TableHead className="text-xs text-right border-r">Valor Doc</TableHead>
                    <TableHead className="text-xs">CFOP</TableHead>
                    <TableHead className="text-xs">Conta Contábil</TableHead>
                    <TableHead className="text-xs text-right border-r">Valor Doc</TableHead>
                    <TableHead className="text-xs">CFOP</TableHead>
                    <TableHead className="text-xs text-right">Valor Doc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedNotas.map((nota, idx) => (
                    <TableRow key={`${nota.CHV_NFE}-${currentPage}-${idx}`}>
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
              totalItems={filteredNotas.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EfdcIcmsTab;
