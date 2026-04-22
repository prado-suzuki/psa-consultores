import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, AlertCircle, ChevronsUpDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditoriaStore } from '@/contexts/AuditoriaContext';
import { BalanceteTreeTable } from '@/components/equipe/dev/pis-cofins/BalanceteTreeTable';
import { FieldTooltip, AUDITORIA_TOOLTIPS } from '@/components/equipe/dev/auditoria/tooltipHelpers';
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

/** Recursively collect unique contas from tree */
function collectAllContas(nodes: ContaNode[], map: Map<string, string>) {
  for (const node of nodes) {
    if (node.cod_cta && !map.has(node.cod_cta)) {
      map.set(node.cod_cta, node.descricao_conta ?? '');
    }
    if (node.children?.length) collectAllContas(node.children, map);
  }
}

const BalanceteEfdTab = ({ periodos = [], isLoading, error }: BalanceteEfdTabProps) => {
  const { hasQueried } = useAuditoriaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [periodoFechado, setPeriodoFechado] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const treeRef = useRef<{ expandAll: () => void; collapseAll: () => void }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar os dados do Balancete. Tente novamente.');
  }, [error]);

  // Collect all unique contas from all periodos
  const allContas = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of periodos) {
      if (p.contas) collectAllContas(p.contas, map);
    }
    return Array.from(map.entries()); // [cod_cta, descricao_conta][]
  }, [periodos]);

  // Filter suggestions based on searchTerm (max 50)
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const term = searchTerm.toLowerCase();
    const results: { cod: string; desc: string }[] = [];
    for (const [cod, desc] of allContas) {
      if (cod.toLowerCase().includes(term) || desc.toLowerCase().includes(term)) {
        results.push({ cod, desc });
        if (results.length >= 50) break;
      }
    }
    return results;
  }, [allContas, searchTerm]);

  const popoverOpen = inputFocused && searchTerm.length >= 1 && suggestions.length > 0;

  const handleSelectSuggestion = (cod: string) => {
    setSearchTerm(cod);
    setInputFocused(false);
    inputRef.current?.blur();
  };

  const filteredPeriodos = useMemo(() => {
    if (!debouncedSearch) return periodos;
    const term = debouncedSearch.toLowerCase();
    return periodos
      .map(p => ({ ...p, contas: filterContasTree(p.contas, term) }))
      .filter(p => p.contas.length > 0);
  }, [periodos, debouncedSearch]);

  // Build column tooltips map (static + dynamic months/years)
  const columnTooltips = useMemo(() => {
    const map: Record<string, string> = {
      Conta: "Código contábil da conta no plano de contas do cliente.",
      "Descrição": "Descrição da conta contábil.",
      __total__: "Soma de todos os meses exibidos no período consultado.",
      __year__: "Total do ano. Clique no '+' para expandir e ver os meses.",
      __month__: "Valor total do mês.",
      __vlr_efd__: "Valor extraído da EFD Contribuições para a conta no período.",
      __saldo__: periodoFechado
        ? "Saldo atual acumulado da conta até o fim do período."
        : "Saldo do período (movimentação) da conta.",
    };
    const years = new Set<string>();
    for (const p of periodos) {
      const ym = p.dt_ini.substring(0, 7); // YYYY-MM
      const y = p.dt_ini.substring(0, 4);
      map[ym] = "Valor total do mês.";
      years.add(y);
    }
    for (const y of years) {
      map[y] = "Total do ano. Clique no '+' para expandir e ver os meses.";
    }
    return map;
  }, [periodos, periodoFechado]);

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
            <Label className="text-xs">
              <FieldTooltip text={AUDITORIA_TOOLTIPS.contaContabil}>Conta Contábil</FieldTooltip>
            </Label>
            <Popover open={popoverOpen} onOpenChange={() => {}}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="Buscar conta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => setInputFocused(false), 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setInputFocused(false);
                        inputRef.current?.blur();
                      }
                    }}
                    className="h-8 text-sm pl-7"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)]"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="max-h-[240px] overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.cod}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-baseline gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(s.cod);
                      }}
                    >
                      <span className="font-medium text-foreground shrink-0">{s.cod}</span>
                      <span className="text-muted-foreground truncate">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch id="periodo-fechado" checked={periodoFechado} onCheckedChange={setPeriodoFechado} />
            <Label htmlFor="periodo-fechado" className="text-xs cursor-pointer whitespace-nowrap">
              <FieldTooltip text={AUDITORIA_TOOLTIPS.periodoFechado}>Período Fechado</FieldTooltip>
            </Label>
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
          columnTooltips={columnTooltips}
        />
      </CardContent>
    </Card>
  );
};

export default BalanceteEfdTab;
