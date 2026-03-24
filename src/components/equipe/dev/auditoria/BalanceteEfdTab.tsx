import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { BalanceteEfdItem } from '@/types/auditoriaCruzada';

interface BalanceteEfdTabProps {
  itens?: BalanceteEfdItem[];
  isLoading: boolean;
  error?: Error | null;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BalanceteEfdTab = ({ itens = [], isLoading, error }: BalanceteEfdTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [periodoFechado, setPeriodoFechado] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados do Balancete. Tente novamente.');
  }, [error]);

  const filteredItens = useMemo(() => {
    if (!debouncedSearch) return itens;
    const term = debouncedSearch.toLowerCase();
    return itens.filter(
      (i) =>
        (i.cod_cta ?? '').toLowerCase().includes(term) ||
        (i.descricao_conta ?? '').toLowerCase().includes(term)
    );
  }, [itens, debouncedSearch]);

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, itens]);

  const totalPages = Math.ceil(filteredItens.length / PAGE_SIZE);
  const pagedItens = filteredItens.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
          <div className="space-y-1 flex-1 min-w-[180px]">
            <Label className="text-xs">Conta Contábil</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm pl-7"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch id="periodo-fechado" checked={periodoFechado} onCheckedChange={setPeriodoFechado} />
            <Label htmlFor="periodo-fechado" className="text-xs cursor-pointer whitespace-nowrap">Período Fechado</Label>
          </div>
        </div>

        {filteredItens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Conta Contábil</TableHead>
                    <TableHead className="text-xs text-right">Valor EFD</TableHead>
                    <TableHead className="text-xs text-right">Débito</TableHead>
                    <TableHead className="text-xs text-right">Crédito</TableHead>
                    <TableHead className="text-xs text-right">{periodoFechado ? 'Saldo Atual' : 'Saldo Período'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItens.map((item, idx) => {
                    const saldoComparacao = periodoFechado ? item.saldo_atual : item.saldo_periodo;
                    const isDivergente = Math.abs(item.vlr_efd - saldoComparacao) > 0.05;
                    return (
                      <TableRow
                        key={`${item.cod_cta}-${currentPage}-${idx}`}
                        className={isDivergente ? 'bg-red-50 hover:bg-red-100' : ''}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(item.dt_ini + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs">{item.cod_cta} - {item.descricao_conta}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatBRL(item.vlr_efd)}</TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(item.debito)}</TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(item.credito)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatBRL(saldoComparacao)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItens.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BalanceteEfdTab;
