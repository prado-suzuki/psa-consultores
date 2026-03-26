import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTableHeaders } from "@/hooks/useTableHeaders";
import { DynamicTableHeader } from "./DynamicTableHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { PivotRowGeneric } from "@/types/pisCofins";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ApuracaoDataTableProps {
  title?: string;
  titleTooltip?: string;
  data: PivotRowGeneric[];
  columnsData: { periods: string[]; yearsMap: Map<string, string[]> };
  expandedYear: string | null;
  setExpandedYear: (year: string | null) => void;
  showCst?: boolean;
  showBloco?: boolean;
  emptyMessage?: string;
}

export function ApuracaoDataTable({
  title,
  data,
  columnsData,
  expandedYear,
  setExpandedYear,
  showCst = false,
  showBloco = false,
  emptyMessage = "Nenhum dado encontrado para o período."
}: ApuracaoDataTableProps) {
  
  const {
    headerRow1,
    headerRow2,
    hasExpandedYear,
    headerRowsCount,
    headerBottom
  } = useTableHeaders({ columnsData, expandedYear });

  const firstColumns: { label: string }[] = [];
  if (showCst) firstColumns.push({ label: 'CST' });
  firstColumns.push({ label: 'Conta' });
  firstColumns.push({ label: 'Descrição' });
  if (showBloco) firstColumns.push({ label: 'Bloco' });

  const getColValue = (row: PivotRowGeneric, dataKeys: string[]) => {
    return dataKeys.reduce((sum, key) => sum + ((row[key] as number) || 0), 0);
  };

  return (
    <section>
      {title && <h2 className="text-lg font-bold uppercase mb-4 text-primary">{title}</h2>}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <DynamicTableHeader 
              firstColumns={firstColumns}
              headerRow1={headerRow1}
              headerRow2={headerRow2}
              hasExpandedYear={hasExpandedYear}
              headerRowsCount={headerRowsCount}
              setExpandedYear={setExpandedYear}
            />
            <TableBody>
              {data.length > 0 ? (
                data.map((row) => (
                  <TableRow key={row.key} className="hover:bg-slate-50/50">
                    {showCst && <TableCell className="font-mono text-xs">{row.cst_pis}</TableCell>}
                    <TableCell className="font-mono text-xs">{row.cod_cta}</TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]" title={row.descricao_conta}>{row.descricao_conta}</TableCell>
                    {showBloco && <TableCell className="font-mono text-xs">{row.bloco_efd}</TableCell>}
                    
                    {headerBottom.map((col) => (
                      <TableCell key={col.id} className="text-right font-mono text-sm border-r border-slate-100">
                        {formatCurrency(getColValue(row, col.dataKeys))}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-bold text-sm bg-slate-50/50 border-l">
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={99} className="text-center text-muted-foreground p-8 italic">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}