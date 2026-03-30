import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { DynamicTableHeader } from "./DynamicTableHeader";
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
}

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
  emptyMessage = "Nenhum dado encontrado para o período."
}: ApuracaoDataTableProps) {
  
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

  const stickyCell = (config: StickyColumnConfig, extraClass?: string) =>
    cn(
      "sticky z-10 bg-background",
      config.isLast && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
      extraClass
    );

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
      <div className="rounded-md border bg-card overflow-x-auto max-w-full">
        <table className="w-full caption-bottom text-sm min-w-max">
          <DynamicTableHeader 
            stickyConfig={stickyConfig}
            headerRow1={headerRow1}
            headerRow2={headerRow2}
            hasExpandedYear={hasExpandedYear}
            headerRowsCount={headerRowsCount}
            toggleYear={toggleYear}
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
                      >
                        {row.cst_pis}
                      </TableCell>
                    )}
                    <TableCell
                      className={stickyCell(stickyConfig[colIdx], "font-mono text-xs")}
                      style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx++].width }}
                    >
                      {row.cod_cta}
                    </TableCell>
                    <TableCell
                      className={stickyCell(stickyConfig[colIdx], "text-sm")}
                      style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx].width, maxWidth: stickyConfig[colIdx++].width }}
                      title={row.descricao_conta}
                    >
                      <span className="block truncate">{row.descricao_conta}</span>
                    </TableCell>
                    {showBloco && (
                      <TableCell
                        className={stickyCell(stickyConfig[colIdx], "font-mono text-xs")}
                        style={{ left: stickyConfig[colIdx].left, minWidth: stickyConfig[colIdx++].width }}
                      >
                        {row.bloco_efd}
                      </TableCell>
                    )}
                    
                    {headerBottom.map((col) => (
                      <TableCell key={col.id} className="text-right font-mono text-sm border-r border-border/20">
                        {formatCurrency(getColValue(row, col.dataKeys))}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-bold text-sm bg-muted/30 border-l">
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
              <TableRow className="bg-muted font-bold border-t-2 border-border">
                {stickyConfig.map((cfg, i) => (
                  <TableCell
                    key={cfg.label}
                    className={stickyCell(cfg, "text-sm bg-muted")}
                    style={{ left: cfg.left, minWidth: cfg.width }}
                  >
                    {i === (showCst ? 2 : 1) ? "Total" : ""}
                  </TableCell>
                ))}
                {headerBottom.map((col) => (
                  <TableCell key={col.id} className="text-right font-mono text-sm border-r border-border/20">
                    {formatCurrency(data.reduce((sum, row) => sum + getColValue(row, col.dataKeys), 0))}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono font-bold text-sm bg-muted/30 border-l">
                  {formatCurrency(data.reduce((sum, row) => sum + row.total, 0))}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </section>
  );
}
