import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, ChevronsUpDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import { BalanceteTreeTable } from '@/components/equipe/dev/pis-cofins/BalanceteTreeTable';
import type { BalanceteEfdPeriodo } from '@/types/auditoriaCruzada';
import type { ContaNode } from '@/types/pisCofins';

interface BalanceteEfdTabProps {
  periodos?: BalanceteEfdPeriodo[];
  isLoading: boolean;
  error?: Error | null;
}

/** Recursively filter tree nodes matching search term on cod_cta or descricao_conta */
function filterContasTree(nodes: ContaNode[], term: string): ContaNode[] {
  const result: ContaNode[] = [];
  for (const node of nodes) {
    const selfMatch =
      (node.cod_cta ?? '').toLowerCase().includes(term) ||
      (node.descricao_conta ?? '').toLowerCase().includes(term);

    const filteredChildren = node.children?.length
      ? filterContasTree(node.children, term)
      : [];

    if (selfMatch || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: selfMatch ? (node.children ?? []) : filteredChildren,
      });
    }
  }
  return result;
}

const BalanceteEfdTab = ({ periodos = [], isLoading, error }: BalanceteEfdTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [periodoFechado, setPeriodoFechado] = useState(false);
  const treeRef = useRef<{ expandAll: () => void; collapseAll: () => void }>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados do Balancete. Tente novamente.');
  }, [error]);

  const filteredPeriodos = useMemo(() => {
    if (!debouncedSearch) return periodos;
    const term = debouncedSearch.toLowerCase();
    return periodos
      .map(p => ({ ...p, contas: filterContasTree(p.contas, term) }))
      .filter(p => p.contas.length > 0);
  }, [periodos, debouncedSearch]);

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
          <div className="flex gap-1 pb-0.5">
            <Button variant="outline" size="sm" onClick={() => treeRef.current?.expandAll()} className="gap-1 text-xs">
              <ChevronsUpDown className="h-3.5 w-3.5" /> Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={() => treeRef.current?.collapseAll()} className="gap-1 text-xs">
              <Minus className="h-3.5 w-3.5" /> Colapsar Tudo
            </Button>
          </div>
        </div>

        <BalanceteTreeTable
          ref={treeRef}
          contasTree={filteredPeriodos}
          periodoFechado={periodoFechado}
          hideTitle
        />
      </CardContent>
    </Card>
  );
};

export default BalanceteEfdTab;
