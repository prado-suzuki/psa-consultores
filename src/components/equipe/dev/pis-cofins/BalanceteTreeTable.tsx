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
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { DynamicTableHeader } from "./DynamicTableHeader";
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

export interface BalanceteTreeTableHandle {
  expandAll: () => void;
  collapseAll: () => void;
}

interface BalanceteTreeTableProps {
  contasTree: { dt_ini: string; contas: ContaNode[] }[];
  /** When true, show saldo_atual instead of saldo_periodo */
  periodoFechado?: boolean;
  /** Hide the section title and expand/collapse buttons (caller provides them) */
  hideTitle?: boolean;
  /** Custom section title (defaults to "Resumo Hierárquico") */
  sectionTitle?: string;
  /** Map of extra accounts added manually: cod_cta → "D" | "C" */
  extraContas?: Map<string, "D" | "C">;
  /** Set of cod_cta that already have EFD lancamentos (in calculation) */
  efdContas?: Set<string>;
  /** Called when user selects Débito or Crédito for a leaf account */
  onToggleExtra?: (codCta: string, desc: string, tipo: "D" | "C") => void;
  /** Called when user clicks the badge to remove an extra account */
  onRemoveExtra?: (codCta: string) => void;
}

const STICKY_COLS: StickyColumnConfig[] = [
  { label: "Conta", width: 100, left: 0, isLast: false },
  { label: "Descrição", width: 280, left: 100, isLast: true },
];

const HEADER_HIGHLIGHT = "bg-[#14B8A6] text-white border-[#0B7A70]";
const MONTH_HIGHLIGHT = "bg-[#3fd8c7] text-white border-[#0B7A70]";
const HEADER_BTN = "text-white hover:bg-white/10 hover:text-white";

export const BalanceteTreeTable = forwardRef<BalanceteTreeTableHandle, BalanceteTreeTableProps>(
  function BalanceteTreeTable({ contasTree, periodoFechado = false, hideTitle = false, sectionTitle = "Resumo Hierárquico", extraContas, efdContas, onToggleExtra, onRemoveExtra }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

    const { mergedTree, periods } = useMemo(() => mergeContasTrees(contasTree), [contasTree]);

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
      setExpanded(collectAllKeys(mergedTree));
    }, [mergedTree]);

    const collapseAll = useCallback(() => setExpanded(new Set()), []);

    useImperativeHandle(ref, () => ({ expandAll, collapseAll }), [expandAll, collapseAll]);

    const valueAccessor = useMemo(() => {
      if (periodoFechado) {
        return (v: MergedNode["periodoValues"][string]) => v.saldo_atual;
      }
      return (v: MergedNode["periodoValues"][string]) => v.saldo_periodo;
    }, [periodoFechado]);

    // Build columnsData for useTableHeaders
    const columnsData = useMemo(() => {
      const yearsMap = new Map<string, string[]>();
      for (const p of periods) {
        const year = p.substring(0, 4);
        if (!yearsMap.has(year)) yearsMap.set(year, []);
        yearsMap.get(year)!.push(p);
      }
      return { periods, yearsMap };
    }, [periods]);

    const {
      headerRow1,
      headerRow2,
      hasExpandedYear,
      headerRowsCount,
      headerBottom,
    } = useTableHeaders({ columnsData, expandedYears });

    const getColValue = (node: MergedNode, dataKeys: string[]) => {
      return dataKeys.reduce((sum, key) => {
        const pv = node.periodoValues[key];
        return sum + (pv ? valueAccessor(pv) : 0);
      }, 0);
    };

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

            {headerBottom.map(col => {
              const val = getColValue(node, col.dataKeys);
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

    renderRows(mergedTree);

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
          <DynamicTableHeader
            stickyConfig={STICKY_COLS}
            headerRow1={headerRow1}
            headerRow2={headerRow2}
            hasExpandedYear={hasExpandedYear}
            headerRowsCount={headerRowsCount}
            toggleYear={toggleYear}
            headerClassName={HEADER_HIGHLIGHT}
            stickyHeaderClassName={HEADER_HIGHLIGHT}
            expandedHeaderClassName={HEADER_HIGHLIGHT}
            monthHeaderClassName={MONTH_HIGHLIGHT}
            collapsedHeaderClassName={HEADER_HIGHLIGHT}
            headerButtonClassName={HEADER_BTN}
            showTotal={false}
          />
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
