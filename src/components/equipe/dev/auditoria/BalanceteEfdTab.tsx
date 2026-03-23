import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import type { BalanceteEfdItem } from '@/types/auditoriaCruzada';

interface BalanceteEfdTabProps {
  itens?: BalanceteEfdItem[];
  isLoading: boolean;
  hasQueried: boolean;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);


const BalanceteEfdTab = ({ itens = [], isLoading, hasQueried }: BalanceteEfdTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [blocoFilter, setBlocoFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const blocoOptions = useMemo(() => {
    const unique = [...new Set(itens.map((i) => i.bloco_efd))].sort();
    return unique;
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = itens;
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (i) =>
          (i.cod_cta ?? '').toLowerCase().includes(term) ||
          (i.descricao_conta ?? '').toLowerCase().includes(term)
      );
    }
    if (blocoFilter !== 'all') {
      result = result.filter((i) => i.bloco_efd === blocoFilter);
    }
    return result;
  }, [itens, debouncedSearch, blocoFilter]);

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
          <div className="space-y-1 min-w-[150px]">
            <Label className="text-xs">Bloco EFD</Label>
            <Select value={blocoFilter} onValueChange={setBlocoFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {blocoOptions.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar Registro
          </Button>
        </div>

        {/* Tabela */}
        {filteredItens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Conta Contábil</TableHead>
                  <TableHead className="text-xs">Bloco SPED</TableHead>
                  <TableHead className="text-xs">CST</TableHead>
                  <TableHead className="text-xs text-right">Alíquota</TableHead>
                  <TableHead className="text-xs text-right">Valor EFD</TableHead>
                  <TableHead className="text-xs text-right">Débito</TableHead>
                  <TableHead className="text-xs text-right">Crédito</TableHead>
                  <TableHead className="text-xs text-right">Saldo Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItens.map((item, idx) => (
                    <TableRow key={`${item.cod_cta}-${item.bloco_efd}-${idx}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(item.dt_ini + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs">{item.cod_cta} - {item.descricao_conta}</TableCell>
                      <TableCell className="text-xs">{item.bloco_efd}</TableCell>
                      <TableCell className="text-xs">{item.cst_pis}</TableCell>
                      <TableCell className="text-xs text-right">{item.aliq_pis.toFixed(2)}%</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatBRL(item.vlr_efd)}</TableCell>
                      <TableCell className="text-xs text-right">{formatBRL(item.debito)}</TableCell>
                      <TableCell className="text-xs text-right">{formatBRL(item.credito)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatBRL(item.saldo_periodo)}</TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog placeholder */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Registro</DialogTitle>
              <DialogDescription>Formulário de inserção manual em desenvolvimento.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BalanceteEfdTab;
