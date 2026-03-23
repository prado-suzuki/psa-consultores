import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { HeaderColumn, HeaderBottomColumn } from "@/hooks/useTableHeaders";

interface DynamicTableHeaderProps {
  firstColumns: { label: string }[];
  headerRow1: HeaderColumn[];
  headerRow2: HeaderBottomColumn[];
  hasExpandedYear: boolean;
  headerRowsCount: number;
  setExpandedYear: (year: string | null) => void;
}

export function DynamicTableHeader({
  firstColumns,
  headerRow1,
  headerRow2,
  hasExpandedYear,
  headerRowsCount,
  setExpandedYear
}: DynamicTableHeaderProps) {
  return (
    <TableHeader className="bg-muted/50">
      <TableRow>
        {firstColumns.map((col, i) => (
          <TableHead key={i} className="font-bold uppercase text-xs text-muted-foreground border-r" rowSpan={headerRowsCount}>
            {col.label}
          </TableHead>
        ))}
        
        {headerRow1.map(top => (
          top.isExpanded ? (
            <TableHead key={top.id} colSpan={top.colSpan} className="text-center border-b border-r bg-muted font-bold uppercase text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                {top.label}
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted-foreground/20" onClick={() => setExpandedYear(null)} title="Colapsar Ano">-</Button>
              </div>
            </TableHead>
          ) : (
            <TableHead key={top.id} rowSpan={headerRowsCount} className="text-right border-r font-bold uppercase text-xs text-muted-foreground">
              <div className="flex items-center justify-end gap-2">
                {top.label}
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted-foreground/20" onClick={() => setExpandedYear(top.id)} title="Expandir Ano">+</Button>
              </div>
            </TableHead>
          )
        ))}
        <TableHead className="text-right font-bold uppercase text-xs text-muted-foreground border-l" rowSpan={headerRowsCount}>Total</TableHead>
      </TableRow>
      {hasExpandedYear && (
        <TableRow>
          {headerRow2.map(bottom => (
            <TableHead key={bottom.id} className="text-right border-r font-bold uppercase text-xs text-muted-foreground bg-muted/20">
              {bottom.label}
            </TableHead>
          ))}
        </TableRow>
      )}
    </TableHeader>
  );
}