import { useMemo, useRef, useState, useCallback } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { DynamicTableHeader } from "./DynamicTableHeader";
import { ColumnFilterDropdown } from "./ColumnFilterDropdown";
import { FloatingScrollbar } from "@/components/ui/floating-scrollbar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PivotRowGeneric } from "@/types/pisCofins";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/* ── Sticky column width constants ── */
const STICKY_WIDTHS: Record<string, number> = {
  CST: 80,
  Conta: 100,
  'Descrição': 250,
  Bloco: 80,
};

export interface StickyColumnConfig {
  label: string;
  width: number;
  left: number;
  isLast: boolean;
}

interface ApuracaoDataTableProps {
  title?: string;
  titleTooltip?: string;
  data: PivotRowGeneric[];
  columnsData: { periods: string[]; yearsMap: Map<string, string[]> };
  expandedYears: Set<string>;
  toggleYear: (year: string) => void;
  showCst?: boolean;
  showBloco?: boolean;
  showTotals?: boolean;
  emptyMessage?: string;
  highlightHeaderFooter?: boolean;
}

const HEADER_FOOTER_HIGHLIGHT_CLASS = "bg-[#14B8A6] text-white border-[#14B8A6]";
const MONTH_HEADER_HIGHLIGHT_CLASS = "bg-[#3fd8c7] text-white border-[#0B7A70]";
const HEADER_FOOTER_BUTTON_CLASS = "text-white hover:bg-white/10 hover:text-white";
const EXPANDED_MONTH_VALUE_CLASS = "bg-[rgba(20,184,166,0.04)]";
const EXPANDED_MONTH_LEFT_EDGE_CLASS = "relative overflow-visible before:pointer-events-none before:absolute before:inset-y-0 before:-left-3 before:w-3 before:bg-[linear-gradient(to_left,rgba(15,118,110,0.22),transparent)]";
const EXPANDED_MONTH_RIGHT_EDGE_CLASS = "relative overflow-visible after:pointer-events-none after:absolute after:inset-y-0 after:-right-3 after:w-3 after:bg-[linear-gradient(to_right,rgba(15,118,110,0.22),transparent)]";

export function ApuracaoDataTable({
  title,
  titleTooltip,
  data,
  columnsData,
  expandedYears,
  toggleYear,
  showCst = false,
  showBloco = false,
  showTotals = false,
  emptyMessage = "Nenhum dado encontrado para o período.",
  highlightHeaderFooter = false,
}: ApuracaoDataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    headerRow1,
    headerRow2,
    hasExpandedYear,
    headerRowsCount,
    headerBottom
  } = useTableHeaders({ columnsData, expandedYears });

  const firstColumns: { label: string }[] = [];
  if (showCst) firstColumns.push({ label: 'CST' });
  firstColumns.push({ label: 'Conta' });
  firstColumns.push({ label: 'Descrição' });
  if (showBloco) firstColumns.push({ label: 'Bloco' });

  // Build sticky config with cumulative left offsets
  const stickyConfig: StickyColumnConfig[] = firstColumns.map((col, i) => {
    const w = STICKY_WIDTHS[col.label] || 100;
    const left = firstColumns.slice(0, i).reduce((sum, c) => sum + (STICKY_WIDTHS[c.label] || 100), 0);
    const isLast = i === firstColumns.length - 1;
    return { label: col.label, width: w, left, isLast };
  });

  const getColValue = (row: PivotRowGeneric, dataKeys: string[]) => {
    return dataKeys.reduce((sum, key) => sum + ((row[key] as number) || 0), 0);
  };

  const isExpandedMonthColumn = (dataKeys: string[]) =>
    highlightHeaderFooter && dataKeys.length === 1 && /^\d{4}-\d{2}$/.test(dataKeys[0]);

  const expandedMonthEdgeIds = useMemo(() => {
    const firstMonthIds = new Set<string>();
    const lastMonthIds = new Set<string>();

    columnsData.yearsMap.forEach((months, year) => {
      if (!highlightHeaderFooter || !expandedYears.has(year) || months.length === 0) return;
      firstMonthIds.add(months[0]);
      lastMonthIds.add(months[months.length - 1]);
    });

    return { firstMonthIds, lastMonthIds };
  }, [columnsData.yearsMap, expandedYears, highlightHeaderFooter]);

  const getExpandedMonthEdgeClass = (columnId: string) =>
    cn(
      expandedMonthEdgeIds.firstMonthIds.has(columnId) && EXPANDED_MONTH_LEFT_EDGE_CLASS,
      expandedMonthEdgeIds.lastMonthIds.has(columnId) && EXPANDED_MONTH_RIGHT_EDGE_CLASS,
    );

  const stickyCell = (config: StickyColumnConfig, extraClass?: string) =>
    cn(
      "sticky z-10 bg-background cursor-copy",
      config.isLast && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
      extraClass
    );

  const formatBR = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const highlightClass = highlightHeaderFooter ? HEADER_FOOTER_HIGHLIGHT_CLASS : undefined;
  const footerRowClass = highlightHeaderFooter ? "bg-[#14B8A6] text-white border-t-[#14B8A6] hover:!bg-[#3fd8c7]" : "bg-muted font-bold border-t-2 border-border";
  const footerCellClass = highlightHeaderFooter ? "text-white bg-[#14B8A6]" : "bg-muted";
  const bodyTotalCellClass = "bg-muted/30 border-l";
  const footerTotalCellClass = highlightHeaderFooter ? "text-white bg-[#14B8A6] border-l-[#0B7A70]" : "bg-muted/30 border-l";

  const copyToClipboard = (value: string | number | undefined | null) => {
    const text = value == null ? "" : typeof value === "number" ? formatBR(value) : value;
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  };

  return (
    <section>
      {title && (
        <h2 className="text-lg font-bold uppercase mb-4 text-primary flex items-center gap-1.5">
          {title}
          {titleTooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-sm font-normal normal-case">
                  {titleTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h2>
      )}
      <div ref={scrollRef} className="rounded-md border bg-card overflow-x-auto max-w-full">
        <table className="w-full caption-bottom text-sm min-w-max">
          <DynamicTableHeader 
            stickyConfig={stickyConfig}
            headerRow1={headerRow1}
            headerRow2={headerRow2}
            hasExpandedYear={hasExpandedYear}
            headerRowsCount={headerRowsCount}
            toggleYear={toggleYear}
            headerClassName={highlightClass}
            stickyHeaderClassName={highlightClass}
            expandedHeaderClassName={highlightClass}
            monthHeaderClassName={highlightHeaderFooter ? MONTH_HEADER_HIGHLIGHT_CLASS : undefined}
            collapsedHeaderClassName={highlightClass}
            totalHeaderClassName={highlightClass}
            headerButtonClassName={highlightHeaderFooter ? HEADER_FOOTER_BUTTON_CLASS : undefined}
          />
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => {
                let colIdx = 0;
                return (
                  <TableRow key={row.key} className="hover:bg-muted/30">
                    {showCst && (
                      <TableCell
                        className={stickyCell(stickyConfig[colIdx], "font-mono text-xs")}
                        style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx++].width }}
                        onDoubleClick={() => copyToClipboard(row.cst_pis)}
                      >
                        {row.cst_pis}
                      </TableCell>
                    )}
                    <TableCell
                      className={stickyCell(stickyConfig[colIdx], "font-mono text-xs")}
                      style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx++].width }}
                      onDoubleClick={() => copyToClipboard(row.cod_cta)}
                    >
                      {row.cod_cta}
                    </TableCell>
                    <TableCell
                      className={stickyCell(stickyConfig[colIdx], "text-sm")}
                      style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx].width, maxWidth: stickyConfig[colIdx++].width }}
                      title={row.descricao_conta}
                      onDoubleClick={() => copyToClipboard(row.descricao_conta)}
                    >
                      <span className="block truncate">{row.descricao_conta}</span>
                    </TableCell>
                    {showBloco && (
                      <TableCell
                        className={stickyCell(stickyConfig[colIdx], "font-mono text-xs")}
                        style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx++].width }}
                        onDoubleClick={() => copyToClipboard(row.bloco_efd)}
                      >
                        {row.bloco_efd}
                      </TableCell>
                    )}
                    
                    {headerBottom.map((col) => {
                      const val = getColValue(row, col.dataKeys);
                      return (
                        <TableCell key={col.id} className={cn("text-right font-mono text-sm border-r border-border/20 cursor-copy", isExpandedMonthColumn(col.dataKeys) && EXPANDED_MONTH_VALUE_CLASS, getExpandedMonthEdgeClass(col.id))} onDoubleClick={() => copyToClipboard(val)}>
                          {formatCurrency(val)}
                        </TableCell>
                      );
                    })}
                    <TableCell className={cn("text-right font-mono font-bold text-sm border-l cursor-copy", bodyTotalCellClass)} onDoubleClick={() => copyToClipboard(row.total)}>
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={99} className="text-center text-muted-foreground p-8 italic">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {showTotals && data.length > 0 && (
              <TableRow className={footerRowClass}>
                {stickyConfig.map((cfg, i) => (
                  <TableCell
                    key={cfg.label}
                    className={stickyCell(cfg, cn("text-sm", footerCellClass))}
                    style={{ left: cfg.left, minWidth: cfg.width }}
                  >
                    {i === (showCst ? 2 : 1) ? "Total" : ""}
                  </TableCell>
                ))}
                {headerBottom.map((col) => {
                  const total = data.reduce((sum, row) => sum + getColValue(row, col.dataKeys), 0);
                  return (
                    <TableCell key={col.id} className={cn("text-right font-mono text-sm border-r border-border/20 cursor-copy", highlightHeaderFooter && "border-r-[#0B7A70] text-white", isExpandedMonthColumn(col.dataKeys) && "bg-[rgba(255,255,255,0.08)]", getExpandedMonthEdgeClass(col.id))} onDoubleClick={() => copyToClipboard(total)}>
                      {formatCurrency(total)}
                    </TableCell>
                  );
                })}
                <TableCell className={cn("text-right font-mono font-bold text-sm border-l cursor-copy", footerTotalCellClass)} onDoubleClick={() => copyToClipboard(data.reduce((sum, row) => sum + row.total, 0))}>
                  {formatCurrency(data.reduce((sum, row) => sum + row.total, 0))}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
      <FloatingScrollbar targetRef={scrollRef} />
    </section>
  );
}
