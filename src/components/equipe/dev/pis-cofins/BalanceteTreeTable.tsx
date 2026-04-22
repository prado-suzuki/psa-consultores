import { useState, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingScrollbar } from "@/components/ui/floating-scrollbar";
import { ChevronRight, ChevronDown, ChevronsUpDown, Minus, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ColumnFilterDropdown } from "./ColumnFilterDropdown";
import { renderColumnLabel } from "./ColumnTooltip";
import type { StickyColumnConfig } from "./ApuracaoDataTable";
import type { ContaNode } from "@/types/pisCofins";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatBR = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const copyToClipboard = (value: string | number | undefined | null) => {
  const text = value == null ? "" : typeof value === "number" ? formatBR(value) : value;
  navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
};

/** Merged tree node: aggregates values across periods */
interface MergedNode {
  plano_conta: string;
  cod_cta: string;
  descricao_conta: string;
  periodoValues: Record<string, { vlr_efd: number; credito: number; debito: number; saldo_periodo: number; saldo_atual: number }>;
  children: MergedNode[];
  depth: number;
  hasChildren: boolean;
}

function mergeContasTrees(
  periodTrees: { dt_ini: string; contas: ContaNode[] }[],
): { mergedTree: MergedNode[]; periods: string[] } {
  const periods = periodTrees.map(pt => pt.dt_ini.substring(0, 7)).sort();

  function mergeLevel(nodesPerPeriod: { pk: string; nodes: ContaNode[] }[], depth: number): MergedNode[] {
    const allKeys = new Map<string, { cod_cta: string; descricao_conta: string }>();
    for (const { nodes } of nodesPerPeriod) {
      for (const n of nodes) {
        if (!allKeys.has(n.plano_conta)) {
          allKeys.set(n.plano_conta, { cod_cta: n.cod_cta, descricao_conta: n.descricao_conta.trim() });
        }
      }
    }

    const result: MergedNode[] = [];

    for (const [plano, meta] of allKeys) {
      const periodoValues: MergedNode["periodoValues"] = {};
      const childInputs: { pk: string; nodes: ContaNode[] }[] = [];

      for (const { pk, nodes } of nodesPerPeriod) {
        const match = nodes.find(n => n.plano_conta === plano);
        if (match) {
          periodoValues[pk] = {
            vlr_efd: match.vlr_efd,
            credito: match.credito,
            debito: match.debito,
            saldo_periodo: match.saldo_periodo,
            saldo_atual: match.saldo_atual,
          };
          if (match.children?.length) {
            childInputs.push({ pk, nodes: match.children });
          }
        }
      }

      const children = childInputs.length > 0 ? mergeLevel(childInputs, depth + 1) : [];

      result.push({
        plano_conta: plano,
        cod_cta: meta.cod_cta,
        descricao_conta: meta.descricao_conta,
        periodoValues,
        children,
        depth,
        hasChildren: children.length > 0,
      });
    }

    return result.sort((a, b) => a.plano_conta.localeCompare(b.plano_conta, "pt-BR", { numeric: true }));
  }

  const inputs = periodTrees.map(pt => ({ pk: pt.dt_ini.substring(0, 7), nodes: pt.contas }));
  return { mergedTree: mergeLevel(inputs, 0), periods };
}

function collectAllKeys(nodes: MergedNode[]): Set<string> {
  const keys = new Set<string>();
  for (const n of nodes) {
    if (n.hasChildren) {
      keys.add(n.plano_conta);
      for (const k of collectAllKeys(n.children)) keys.add(k);
    }
  }
  return keys;
}

// ── Recursive helpers for filtering / sorting / collecting ──

type FilterKey = "cod_cta" | "descricao_conta";

function collectUniqueValues(nodes: MergedNode[], key: FilterKey): Set<string> {
  const values = new Set<string>();
  for (const n of nodes) {
    values.add(n[key]);
    if (n.children.length) {
      for (const v of collectUniqueValues(n.children, key)) values.add(v);
    }
  }
  return values;
}

function filterTree(
  nodes: MergedNode[],
  filters: Map<string, Set<string>>,
): MergedNode[] {
  if (filters.size === 0) return nodes;

  const result: MergedNode[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, filters);

    let selfMatch = true;
    for (const [key, allowed] of filters) {
      if (!allowed.has(node[key as FilterKey])) {
        selfMatch = false;
        break;
      }
    }

    if (selfMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
}

function sortTree(
  nodes: MergedNode[],
  key: FilterKey,
  direction: "asc" | "desc",
): MergedNode[] {
  const mul = direction === "asc" ? 1 : -1;
  const sorted = [...nodes].sort((a, b) => mul * a[key].localeCompare(b[key], "pt-BR", { numeric: true }));
  return sorted.map(n =>
    n.children.length ? { ...n, children: sortTree(n.children, key, direction) } : n,
  );
}

const FILTERABLE_KEYS: { key: FilterKey; label: string }[] = [
  { key: "cod_cta", label: "Conta" },
  { key: "descricao_conta", label: "Descrição" },
];

// ── Component ──

export interface BalanceteTreeTableHandle {
  expandAll: () => void;
  collapseAll: () => void;
}

interface BalanceteTreeTableProps {
  contasTree: { dt_ini: string; contas: ContaNode[] }[];
  periodoFechado?: boolean;
  hideTitle?: boolean;
  sectionTitle?: string;
  extraContas?: Map<string, "D" | "C">;
  efdContas?: Set<string>;
  onToggleExtra?: (codCta: string, desc: string, tipo: "D" | "C") => void;
  onRemoveExtra?: (codCta: string) => void;
  columnTooltips?: Record<string, string>;
}

const STICKY_COLS: StickyColumnConfig[] = [
  { label: "Conta", width: 100, left: 0, isLast: false },
  { label: "Descrição", width: 280, left: 100, isLast: true },
];

const HEADER_HIGHLIGHT = "bg-[#14B8A6] text-white border-[#0B7A70]";
const STICKY_HEADER_HIGHLIGHT = "bg-[#14B8A6] text-white border-r-[#0B7A70]";
const MONTH_HIGHLIGHT = "bg-[#3fd8c7] text-white border-[#0B7A70]";
const HEADER_BTN = "text-white hover:bg-white/10 hover:text-white";

type DisplayColumn = {
  id: string;
  label: string;
  dataKeys: string[];
  metric: "vlr_efd" | "saldo";
};

export const BalanceteTreeTable = forwardRef<BalanceteTreeTableHandle, BalanceteTreeTableProps>(
  function BalanceteTreeTable({ contasTree, periodoFechado = false, hideTitle = false, sectionTitle = "Resumo Hierárquico", extraContas, efdContas, onToggleExtra, onRemoveExtra, columnTooltips }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

    // ── Filter / sort state ──
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [columnFilters, setColumnFilters] = useState<Map<string, Set<string>>>(new Map());

    const { mergedTree, periods } = useMemo(() => mergeContasTrees(contasTree), [contasTree]);

    // ── Cascading unique values ──
    const cascadingUniqueValues = useMemo(() => {
      const result: Record<string, string[]> = {};
      for (const { key } of FILTERABLE_KEYS) {
        // Build filters excluding this column
        const otherFilters = new Map<string, Set<string>>();
        for (const [k, v] of columnFilters) {
          if (k !== key) otherFilters.set(k, v);
        }
        const filtered = filterTree(mergedTree, otherFilters);
        result[key] = [...collectUniqueValues(filtered, key)];
      }
      return result;
    }, [mergedTree, columnFilters]);

    // ── Processed tree (filtered + sorted) ──
    const processedTree = useMemo(() => {
      let tree = filterTree(mergedTree, columnFilters);
      if (sortConfig && (sortConfig.key === "cod_cta" || sortConfig.key === "descricao_conta")) {
        tree = sortTree(tree, sortConfig.key as FilterKey, sortConfig.direction);
      }
      return tree;
    }, [mergedTree, columnFilters, sortConfig]);

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
      setSortConfig(prev =>
        prev?.key === key && prev.direction === direction ? null : { key, direction },
      );
    }, []);

    const handleFilter = useCallback((key: string, values: Set<string> | null) => {
      setColumnFilters(prev => {
        const next = new Map(prev);
        if (values == null) next.delete(key);
        else next.set(key, values);
        return next;
      });
    }, []);

    const toggleNode = useCallback((key: string) => {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }, []);

    const toggleYear = useCallback((year: string) => {
      setExpandedYears(prev => {
        const next = new Set(prev);
        if (next.has(year)) next.delete(year);
        else next.add(year);
        return next;
      });
    }, []);

    const expandAll = useCallback(() => {
      setExpanded(collectAllKeys(processedTree));
    }, [processedTree]);

    const collapseAll = useCallback(() => setExpanded(new Set()), []);

    useImperativeHandle(ref, () => ({ expandAll, collapseAll }), [expandAll, collapseAll]);

    const valueAccessor = useMemo(() => {
      if (periodoFechado) {
        return (v: MergedNode["periodoValues"][string]) => v.saldo_atual;
      }
      return (v: MergedNode["periodoValues"][string]) => v.saldo_periodo;
    }, [periodoFechado]);

    const yearsMap = useMemo(() => {
      const yearsMap = new Map<string, string[]>();
      for (const p of periods) {
        const year = p.substring(0, 4);
        if (!yearsMap.has(year)) yearsMap.set(year, []);
        yearsMap.get(year)!.push(p);
      }
      return yearsMap;
    }, [periods]);

    const yearEntries = useMemo(
      () => Array.from(yearsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      [yearsMap],
    );

    const hasExpandedYear = expandedYears.size > 0;
    const headerRowsCount = hasExpandedYear ? 3 : 2;

    const displayColumns = useMemo<DisplayColumn[]>(() => {
      const cols: DisplayColumn[] = [];
      for (const [year, months] of yearEntries) {
        const sortedMonths = [...months].sort((a, b) => a.localeCompare(b));
        if (expandedYears.has(year)) {
          for (const month of sortedMonths) {
            cols.push(
              { id: `${month}-vlr_efd`, label: "Vlr. EFD", dataKeys: [month], metric: "vlr_efd" },
              { id: `${month}-saldo`, label: periodoFechado ? "Saldo Atual" : "Saldo Per.", dataKeys: [month], metric: "saldo" },
            );
          }
        } else {
          cols.push(
            { id: `${year}-vlr_efd`, label: "Vlr. EFD", dataKeys: sortedMonths, metric: "vlr_efd" },
            { id: `${year}-saldo`, label: periodoFechado ? "Saldo Atual" : "Saldo Per.", dataKeys: sortedMonths, metric: "saldo" },
          );
        }
      }
      return cols;
    }, [yearEntries, expandedYears, periodoFechado]);

    const getColValue = (node: MergedNode, dataKeys: string[], metric: DisplayColumn["metric"]) => {
      return dataKeys.reduce((sum, key) => {
        const pv = node.periodoValues[key];
        if (!pv) return sum;
        return sum + (metric === "vlr_efd" ? pv.vlr_efd : valueAccessor(pv));
      }, 0);
    };

    // ── renderHeaderExtra for filter dropdowns on sticky columns ──
    const renderHeaderExtra = useCallback((label: string) => {
      const match = FILTERABLE_KEYS.find(f => f.label === label);
      if (!match) return null;
      return (
        <ColumnFilterDropdown
          columnKey={match.key}
          uniqueValues={cascadingUniqueValues[match.key] ?? []}
          activeSort={sortConfig}
          activeFilter={columnFilters.get(match.key) ?? null}
          onSort={handleSort}
          onFilter={handleFilter}
        />
      );
    }, [cascadingUniqueValues, sortConfig, columnFilters, handleSort, handleFilter]);

    const rows: JSX.Element[] = [];

    function renderRows(nodes: MergedNode[]) {
      for (const node of nodes) {
        const isExpanded = expanded.has(node.plano_conta);
        const isParent = node.hasChildren;
        const depth = node.depth;

        const bgClass = isParent
          ? depth === 0
            ? "bg-muted/60 font-semibold"
            : "bg-muted/30 font-medium"
          : "";

        const extraTipo = extraContas?.get(node.cod_cta);
        const isInEfd = !isParent && efdContas?.has(node.cod_cta);

        rows.push(
          <TableRow key={node.plano_conta} className={cn("hover:bg-muted/20 group", bgClass)}>
            <TableCell
              className="sticky left-0 z-10 bg-background font-mono text-xs cursor-copy whitespace-nowrap"
              style={{ minWidth: 100 }}
              onDoubleClick={() => copyToClipboard(node.cod_cta)}
            >
              <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
                {isParent ? (
                  <button
                    onClick={() => toggleNode(node.plano_conta)}
                    className="mr-1 p-0.5 rounded hover:bg-muted-foreground/20 shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground/40 mr-1 shrink-0" />
                )}
                {node.cod_cta}
              </div>
            </TableCell>

            <TableCell
              className="sticky left-[100px] z-10 bg-background text-sm shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] cursor-copy"
              style={{ minWidth: 280, maxWidth: 280 }}
              title={node.descricao_conta}
              onDoubleClick={() => copyToClipboard(node.descricao_conta)}
            >
              <div className="flex items-center gap-1.5">
                <span className="block truncate flex-1">{node.descricao_conta}</span>
                {!isParent && isInEfd && !extraTipo && (
                  <Badge
                    className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-bold bg-blue-500/15 text-blue-600 border-blue-500/30"
                    variant="outline"
                    title="Conta presente na EFD"
                  >
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
                {!isParent && onToggleExtra && (
                  extraTipo ? (
                    <Badge
                      className={cn(
                        "cursor-pointer shrink-0 text-[10px] px-1.5 py-0 h-5 font-bold",
                        extraTipo === "D"
                          ? "bg-[#B84714]/15 text-[#B84714] border-[#B84714]/30 hover:bg-[#B84714]/25"
                          : "bg-[#14B8A5]/15 text-[#14B8A5] border-[#14B8A5]/30 hover:bg-[#14B8A5]/25",
                      )}
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveExtra?.(node.cod_cta);
                      }}
                      title={`Clique para remover (${extraTipo === "D" ? "Débito" : "Crédito"})`}
                    >
                      {extraTipo}
                    </Badge>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-5 w-5 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center text-xs font-bold"
                          onClick={(e) => e.stopPropagation()}
                          title="Adicionar conta ao cálculo"
                        >
                          +
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 flex gap-2" align="start" sideOffset={4}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-[#14B8A5] border-[#14B8A5]/40 hover:bg-[#14B8A5]/10"
                          onClick={() => onToggleExtra(node.cod_cta, node.descricao_conta, "C")}
                        >
                          Crédito
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-[#B84714] border-[#B84714]/40 hover:bg-[#B84714]/10"
                          onClick={() => onToggleExtra(node.cod_cta, node.descricao_conta, "D")}
                        >
                          Débito
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )
                )}
              </div>
            </TableCell>

            {displayColumns.map(col => {
              const val = getColValue(node, col.dataKeys, col.metric);
              return (
                <TableCell
                  key={col.id}
                  className="text-right font-mono text-sm border-r border-border/20 cursor-copy"
                  onDoubleClick={() => copyToClipboard(val)}
                >
                  {formatCurrency(val)}
                </TableCell>
              );
            })}
          </TableRow>,
        );

        if (isParent && isExpanded) {
          renderRows(node.children);
        }
      }
    }

    renderRows(processedTree);

    if (contasTree.length === 0) {
      return hideTitle ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado</p>
      ) : (
        <section>
          <h2 className="text-lg font-bold uppercase mb-4 text-primary">{sectionTitle}</h2>
          <Card className="p-8 text-center text-muted-foreground italic">
            Nenhum dado hierárquico disponível.
          </Card>
        </section>
      );
    }

    const table = (
      <>
      <Card ref={scrollRef} className="overflow-x-auto max-w-full">
        <table className="w-full caption-bottom text-sm min-w-max">
          <thead className={cn("bg-muted sticky top-0 z-30 [&_tr]:border-b", HEADER_HIGHLIGHT)}>
            <TableRow>
              {STICKY_COLS.map((col) => (
                <TableCell
                  key={col.label}
                  className={cn(
                    "!font-bold uppercase text-xs text-muted-foreground border-r sticky z-40 bg-muted",
                    STICKY_HEADER_HIGHLIGHT,
                    col.isLast && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                  )}
                  style={{ left: col.left, minWidth: col.width }}
                  rowSpan={headerRowsCount}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {renderHeaderExtra(col.label)}
                  </span>
                </TableCell>
              ))}

              {yearEntries.map(([year, months]) => {
                const isExpanded = expandedYears.has(year);
                const colSpan = isExpanded ? months.length * 2 : 2;
                return (
                  <TableCell
                    key={year}
                    colSpan={colSpan}
                    className={cn("text-center border-b border-r bg-primary/10 !font-bold uppercase text-xs text-muted-foreground", HEADER_HIGHLIGHT)}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {year}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6 hover:bg-muted-foreground/20", HEADER_BTN)}
                        onClick={() => toggleYear(year)}
                        title={isExpanded ? "Colapsar Ano" : "Expandir Ano"}
                      >
                        {isExpanded ? "-" : "+"}
                      </Button>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>

            <TableRow>
              {yearEntries.map(([year, months]) => {
                const sortedMonths = [...months].sort((a, b) => a.localeCompare(b));
                if (expandedYears.has(year)) {
                  return sortedMonths.map((month) => (
                    <TableCell
                      key={month}
                      colSpan={2}
                      className={cn("text-center border-r !font-bold uppercase text-xs text-muted-foreground bg-primary/5", MONTH_HIGHLIGHT)}
                    >
                      {month.split('-').reverse().join('/')}
                    </TableCell>
                  ));
                }

                return [
                  <TableCell key={`${year}-vlr`} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-muted", HEADER_HIGHLIGHT)}>
                    Vlr. EFD
                  </TableCell>,
                  <TableCell key={`${year}-saldo`} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-muted", HEADER_HIGHLIGHT)}>
                    {periodoFechado ? "Saldo Atual" : "Saldo Per."}
                  </TableCell>,
                ];
              })}
            </TableRow>

            {hasExpandedYear && (
              <TableRow>
                {yearEntries.flatMap(([year, months]) => {
                  if (!expandedYears.has(year)) return [];
                  const sortedMonths = [...months].sort((a, b) => a.localeCompare(b));
                  return sortedMonths.flatMap((month) => [
                    <TableCell key={`${month}-vlr_efd`} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-primary/5", MONTH_HIGHLIGHT)}>
                      Vlr. EFD
                    </TableCell>,
                    <TableCell key={`${month}-saldo`} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-primary/5", MONTH_HIGHLIGHT)}>
                      {periodoFechado ? "Saldo Atual" : "Saldo Per."}
                    </TableCell>,
                  ]);
                })}
              </TableRow>
            )}
          </thead>
          <TableBody>
            {rows.length > 0 ? rows : (
              <TableRow>
                <TableCell colSpan={99} className="text-center text-muted-foreground p-8 italic">
                  Nenhum dado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </Card>
      <FloatingScrollbar targetRef={scrollRef} />
      </>
    );

    if (hideTitle) return table;

    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase text-primary">{sectionTitle}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={expandAll} className="gap-1 text-xs">
              <ChevronsUpDown className="h-3.5 w-3.5" /> Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1 text-xs">
              <Minus className="h-3.5 w-3.5" /> Colapsar Tudo
            </Button>
          </div>
        </div>
        {table}
      </section>
    );
  }
);
