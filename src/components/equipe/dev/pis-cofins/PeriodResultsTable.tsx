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

const HEADER_CLASS = "bg-[#14B8A6] text-white border-[#0B7A70]";
const MONTH_HEADER_CLASS = "bg-[#3fd8c7] text-white border-[#0B7A70]";
const MONTH_VALUE_CLASS = "bg-[rgba(20,184,166,0.04)]";
const LEFT_EDGE_CLASS = "relative overflow-visible before:pointer-events-none before:absolute before:inset-y-0 before:-left-3 before:w-3 before:bg-[linear-gradient(to_left,rgba(15,118,110,0.22),transparent)]";
const RIGHT_EDGE_CLASS = "relative overflow-visible after:pointer-events-none after:absolute after:inset-y-0 after:-right-3 after:w-3 after:bg-[linear-gradient(to_right,rgba(15,118,110,0.22),transparent)]";

export const POSITIVE_VALUE_CLASS = "text-[#14B8A5]";
export const NEGATIVE_VALUE_CLASS = "text-[#B84714]";

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
            headerButtonClassName="text-white hover:bg-white/10 hover:text-white"
          />
          <TableBody>
            {rows.map((row) => (
              row.spacer ? (
                <TableRow key={row.label} className="bg-transparent border-none hover:bg-transparent" data-period-spacer="true" aria-hidden="true">
                  <TableCell colSpan={headerBottom.length + 2} className="p-2" />
                </TableRow>
              ) : row.section ? (
                <TableRow key={row.label} className="bg-[#14B8A6] text-white uppercase text-xs hover:!bg-[#3fd8c7]">
                  <TableCell className="font-bold sticky left-0 z-10 bg-[#14B8A6]" style={{ minWidth: 250 }}>{row.label}</TableCell>
                  <TableCell colSpan={headerBottom.length + 1} />
                </TableRow>
              ) : (
              <TableRow key={row.label} className={cn(
                row.highlighted && "bg-[#14B8A6] font-bold text-white hover:!bg-[#3fd8c7]",
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
