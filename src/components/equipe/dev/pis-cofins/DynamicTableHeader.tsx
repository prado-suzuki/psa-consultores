import { TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeaderColumn, HeaderBottomColumn } from "@/hooks/useTableHeaders";
import type { StickyColumnConfig } from "./ApuracaoDataTable";

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
}: DynamicTableHeaderProps) {
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
            {col.label}
          </TableHead>
        ))}
        
        {headerRow1.map(top => (
          top.isExpanded ? (
            <TableHead key={top.id} colSpan={top.colSpan} className={cn("text-center border-b border-r bg-primary/10 !font-bold uppercase text-xs text-muted-foreground", expandedHeaderClassName)}>
              <div className="flex items-center justify-center gap-2">
                {top.label}
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-muted-foreground/20", headerButtonClassName)} onClick={() => toggleYear(top.id)} title="Colapsar Ano">-</Button>
              </div>
            </TableHead>
          ) : (
            <TableHead key={top.id} rowSpan={headerRowsCount} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-muted", collapsedHeaderClassName)}>
              <div className="flex items-center justify-end gap-2">
                {top.label}
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-muted-foreground/20", headerButtonClassName)} onClick={() => toggleYear(top.id)} title="Expandir Ano">+</Button>
              </div>
            </TableHead>
          )
        ))}
        <TableHead className={cn("text-right !font-bold uppercase text-xs text-muted-foreground border-l", totalHeaderClassName)} rowSpan={headerRowsCount}>Total</TableHead>
      </TableRow>
      {hasExpandedYear && (
        <TableRow>
          {headerRow2.map(bottom => (
            <TableHead key={bottom.id} className={cn("text-right border-r !font-bold uppercase text-xs text-muted-foreground bg-primary/5", monthHeaderClassName ?? expandedHeaderClassName)}>
              {bottom.label}
            </TableHead>
          ))}
        </TableRow>
      )}
    </thead>
  );
}
