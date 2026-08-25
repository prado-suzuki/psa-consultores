import { useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { FloatingScrollbar } from "@/components/ui/floating-scrollbar";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DynamicTableHeader } from "@/components/equipe/dev/pis-cofins/DynamicTableHeader";
import type { StickyColumnConfig } from "@/components/equipe/dev/pis-cofins/ApuracaoDataTable";
import type { HeaderBottomColumn, HeaderColumn } from "@/hooks/useTableHeaders";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPisCofinsCurrency } from "@/lib/pisCofinsPresentation";
import {
  PIS_HEADER_CLASS as HEADER_CLASS,
  PIS_MONTH_HEADER_CLASS as MONTH_HEADER_CLASS,
  PIS_MONTH_VALUE_CLASS as MONTH_VALUE_CLASS,
  PIS_ROW_HIGHLIGHT_CLASS as ROW_HIGHLIGHT_CLASS,
  PIS_HEADER_BUTTON_CLASS as HEADER_BUTTON_CLASS,
  PIS_MONTH_LEFT_EDGE_CLASS as LEFT_EDGE_CLASS,
  PIS_MONTH_RIGHT_EDGE_CLASS as RIGHT_EDGE_CLASS,
  PIS_POSITIVE_VALUE_CLASS,
  PIS_NEGATIVE_VALUE_CLASS,
} from "@/components/equipe/dev/pis-cofins/theme";

export const POSITIVE_VALUE_CLASS = PIS_POSITIVE_VALUE_CLASS;
export const NEGATIVE_VALUE_CLASS = PIS_NEGATIVE_VALUE_CLASS;

export interface PeriodResultRow {
  label: string;
  value: (dataKeys: string[]) => number;
  total?: number | "-" | null;
  className?: string;
  highlighted?: boolean;
  muted?: boolean;
  totalRow?: boolean;
  subdued?: boolean;
  format?: (value: number) => string;
  section?: boolean;
  spacer?: boolean;
}

interface PeriodResultsTableProps {
  title: string;
  tooltip: string;
  stickyLabel?: string;
  rows: PeriodResultRow[];
  headerBottom: HeaderBottomColumn[];
  headerRow1: HeaderColumn[];
  headerRow2: HeaderBottomColumn[];
  hasExpandedYear: boolean;
  headerRowsCount: number;
  expandedYears: Set<string>;
  toggleYear: (year: string) => void;
  columnTooltips: Record<string, string>;
}

export function PeriodResultsTable({
  title, tooltip, stickyLabel = "Descrição", rows, headerBottom, headerRow1, headerRow2,
  hasExpandedYear, headerRowsCount, expandedYears, toggleYear, columnTooltips,
}: PeriodResultsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sticky: StickyColumnConfig[] = [{ label: stickyLabel, width: 250, left: 0, isLast: true }];
  const edges = useMemo(() => {
    const first = new Set<string>(); const last = new Set<string>();
    headerRow1.forEach((year) => {
      if (!expandedYears.has(year.id) || !year.dataKeys.length) return;
      first.add(year.dataKeys[0]); last.add(year.dataKeys.at(-1)!);
    });
    return { first, last };
  }, [expandedYears, headerRow1]);
  const valueClass = (column: HeaderBottomColumn, highlighted: boolean) => cn(
    column.dataKeys.length === 1 && /^\d{4}-\d{2}$/.test(column.dataKeys[0]) && (highlighted ? "bg-[rgba(255,255,255,0.08)] text-white" : MONTH_VALUE_CLASS),
    edges.first.has(column.id) && LEFT_EDGE_CLASS,
    edges.last.has(column.id) && RIGHT_EDGE_CLASS,
  );

  return (
    <section>
      <h2 className="text-lg font-bold uppercase mb-4 text-primary flex items-center gap-1.5">
        {title}
        <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" /></TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs text-sm font-normal normal-case">{tooltip}</TooltipContent>
        </Tooltip>
      </h2>
      <Card ref={scrollRef} className="overflow-x-auto max-w-full">
        <table className="w-full caption-bottom text-sm min-w-max">
          <DynamicTableHeader
            stickyConfig={sticky} headerRow1={headerRow1} headerRow2={headerRow2}
            hasExpandedYear={hasExpandedYear} headerRowsCount={headerRowsCount} toggleYear={toggleYear}
            columnTooltips={columnTooltips} headerClassName={HEADER_CLASS} stickyHeaderClassName={HEADER_CLASS}
            expandedHeaderClassName={HEADER_CLASS} monthHeaderClassName={MONTH_HEADER_CLASS}
            collapsedHeaderClassName={HEADER_CLASS} totalHeaderClassName={HEADER_CLASS}
            headerButtonClassName={HEADER_BUTTON_CLASS}
          />
          <TableBody>
            {rows.map((row) => (
              row.spacer ? (
                <TableRow key={row.label} className="bg-transparent border-none hover:bg-transparent" data-period-spacer="true" aria-hidden="true">
                  <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                </TableRow>
              ) : row.section ? (
                <TableRow key={row.label} className={cn(ROW_HIGHLIGHT_CLASS, "uppercase text-xs")}>
                  {/* bg-[#14B8A6] sem hover aqui: a célula não precisa repetir o
                      estado da linha-pai. Mesmo teal de PIS_HEADER_CLASS/
                      PIS_TEAL_HEX em theme.ts — cravado por ser um utilitário
                      só, sem combo suficiente pra valer um export próprio. */}
                  <TableCell className="font-bold sticky left-0 z-10 bg-[#14B8A6]" style={{ minWidth: 250 }}>{row.label}</TableCell>
                  <TableCell colSpan={headerBottom.length + 1} />
                </TableRow>
              ) : (
              <TableRow key={row.label} className={cn(
                row.highlighted && cn(ROW_HIGHLIGHT_CLASS, "font-bold"),
                row.muted && "bg-muted/50 text-xs",
                row.totalRow && "font-bold bg-muted/30",
                row.subdued && "text-muted-foreground",
              )}>
                <TableCell className={cn(
                  "sticky left-0 z-10 font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                  row.highlighted
                    ? "bg-[#14B8A6] text-white font-bold"
                    : row.totalRow
                      ? "bg-muted/30 font-bold"
                      : row.muted
                        ? "bg-muted/50 font-bold"
                        : "bg-card",
                )} style={{ minWidth: 250 }}>{row.label}</TableCell>
                {headerBottom.map((column) => (
                  <TableCell key={column.id} className={cn("text-right font-mono", row.className, valueClass(column, !!row.highlighted), row.totalRow && "font-bold bg-muted/30")}>
                    {row.format?.(row.value(column.dataKeys)) ?? formatPisCofinsCurrency(row.value(column.dataKeys))}
                  </TableCell>
                ))}
                <TableCell className={cn("text-right font-mono font-bold bg-muted/30", row.className, row.highlighted && "bg-[#14B8A6] text-white")}>
                  {row.total === "-" || row.total == null ? row.total : formatPisCofinsCurrency(row.total)}
                </TableCell>
              </TableRow>
              )
            ))}
          </TableBody>
        </table>
      </Card>
      <FloatingScrollbar targetRef={scrollRef} />
    </section>
  );
}
