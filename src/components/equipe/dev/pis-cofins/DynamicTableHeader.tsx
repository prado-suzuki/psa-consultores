import { TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeaderColumn, HeaderBottomColumn } from "@/hooks/useTableHeaders";
import type { StickyColumnConfig } from "./ApuracaoDataTable";
import { renderColumnLabel } from "./ColumnTooltip";

interface DynamicTableHeaderProps {
  stickyConfig: StickyColumnConfig[];
  headerRow1: HeaderColumn[];
  headerRow2: HeaderBottomColumn[];
  hasExpandedYear: boolean;
  headerRowsCount: number;
  toggleYear: (year: string) => void;
  headerClassName?: string;
  stickyHeaderClassName?: string;
  expandedHeaderClassName?: string;
  monthHeaderClassName?: string;
  collapsedHeaderClassName?: string;
  totalHeaderClassName?: string;
  headerButtonClassName?: string;
  renderHeaderExtra?: (label: string) => React.ReactNode;
  showTotal?: boolean;
  /**
   * Optional map of column id/label → tooltip text.
   * Keys: sticky column label (e.g., "CST", "Conta"), year id (e.g., "2024"),
   * month id (e.g., "2024-01"), or "__total__" for the Total column.
   */
  columnTooltips?: Record<string, string>;
}

export function DynamicTableHeader({
  stickyConfig,
  headerRow1,
  headerRow2,
  hasExpandedYear,
  headerRowsCount,
  toggleYear,
  headerClassName,
  stickyHeaderClassName,
  expandedHeaderClassName,
  monthHeaderClassName,
  collapsedHeaderClassName,
  totalHeaderClassName,
  headerButtonClassName,
  renderHeaderExtra,
  showTotal = true,
  columnTooltips,
}: DynamicTableHeaderProps) {
  const tip = (key: string) => columnTooltips?.[key];
  return (
    <thead className={cn("bg-muted sticky top-0 z-30 [&_tr]:border-b", headerClassName)}>
      <TableRow>
        {stickyConfig.map((col) => (
          <TableHead
            key={col.label}
            className={cn(
              "!font-bold uppercase text-xs text-muted-foreground border-r sticky z-40 bg-muted",
              stickyHeaderClassName,
              col.isLast && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
            )}
            style={{ left: col.left, minWidth: col.width }}
            rowSpan={headerRowsCount}
          >
            <span className="inline-flex items-center">
              {renderColumnLabel(col.label, tip(col.label))}
              {renderHeaderExtra?.(col.label)}
            </span>
          </TableHead>
        ))}
        
        {headerRow1.map(top => (
          top.isExpanded ? (
            <TableHead key={top.id} colSpan={top.colSpan} className={cn("text-center border-b border-r bg-primary/10 !font-bold uppercase text-xs text-muted-foreground", expandedHeaderClassName)}>
              <div className="flex items-center justify-center gap-2">
                {renderColumnLabel(top.label, tip(top.id))}
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-muted-foreground/20", headerButtonClassName)} onClick={() => toggleYear(top.id)} title="Colapsar Ano">-</Button>
              </div>
            </TableHead>
          ) : (
            <TableHead key={top.id} rowSpan={headerRowsCount} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-muted", collapsedHeaderClassName)}>
              <div className="flex items-center justify-end gap-2">
                {renderColumnLabel(top.label, tip(top.id))}
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-muted-foreground/20", headerButtonClassName)} onClick={() => toggleYear(top.id)} title="Expandir Ano">+</Button>
              </div>
            </TableHead>
          )
        ))}
        {showTotal && (
          <TableHead className={cn("text-right !font-bold uppercase text-xs text-muted-foreground border-l", totalHeaderClassName)} rowSpan={headerRowsCount}>
            {renderColumnLabel("Total", tip("__total__"))}
          </TableHead>
        )}
      </TableRow>
      {hasExpandedYear && (
        <TableRow>
          {headerRow2.map(bottom => (
            <TableHead key={bottom.id} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-primary/5", monthHeaderClassName ?? expandedHeaderClassName)}>
              {renderColumnLabel(bottom.label, tip(bottom.id))}
            </TableHead>
          ))}
        </TableRow>
      )}
    </thead>
  );
}
