import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ColumnConfig } from "@/constants/exportConfig";
import { formatPreviewValue, getNestedValue } from "@/lib/consultaXmlsPreview";
import type { CTeRecord, NFeRecord } from "@/types/consultaXmls";

interface Props { records: Array<NFeRecord | CTeRecord>; selectedColumns: string[]; columns: ColumnConfig[]; totalRecords: number; availableCount: number }
export function ExportPreview({ records, selectedColumns, columns, totalRecords, availableCount }: Props) {
  return <div className="flex flex-col flex-1 min-h-0 space-y-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Mostrando {Math.min(10, availableCount)} de {totalRecords} registros</p><Badge variant="secondary">{selectedColumns.length} colunas selecionadas</Badge></div>
    {selectedColumns.length === 0 ? <div className="text-center py-8 text-muted-foreground">Selecione ao menos uma coluna para visualizar o preview.</div> : records.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível para preview.</div> : <div className="flex-1 min-h-0 overflow-auto w-full"><div className="min-w-max"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id} className="whitespace-nowrap text-xs">{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{records.map((record, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column.id} className="text-xs whitespace-nowrap max-w-[150px] truncate">{formatPreviewValue(getNestedValue(record, column.id), column.id)}</TableCell>)}</TableRow>)}</TableBody></Table></div></div>}
  </div>;
}
