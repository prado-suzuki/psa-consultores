import {
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PerdcompDetailDcomp } from '@/lib/perdcompDetail';
import { cn } from '@/lib/utils';

export interface PerDetailDcompRow {
  dcomp: PerdcompDetailDcomp;
  valorExibido: number;
  tributoExibido: string;
  originalDoc: string;
  isRetificacao: boolean;
  tooltipTodos?: string;
}

interface PerDetailDcompPanelProps {
  rows: PerDetailDcompRow[];
  loading: boolean;
  tributoFiltro: string;
  onTributoFiltroChange: (value: string) => void;
  tributosDisponiveis: string[];
  perPago: boolean;
  saldoRestante: number;
  valorCredito: number;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | null) => string;
  formatProcessNumber: (value: string) => string;
  onExport: () => void;
  onNewRessarcimento: () => void;
  onNewDcomp: () => void;
  onEditDcomp: (dcomp: PerdcompDetailDcomp) => void;
  onDeleteDcomp: (dcomp: PerdcompDetailDcomp) => void;
}

export function PerDetailDcompPanel({
  rows,
  loading,
  tributoFiltro,
  onTributoFiltroChange,
  tributosDisponiveis,
  perPago,
  saldoRestante,
  valorCredito,
  formatCurrency,
  formatDate,
  formatProcessNumber,
  onExport,
  onNewRessarcimento,
  onNewDcomp,
  onEditDcomp,
  onDeleteDcomp,
}: PerDetailDcompPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <h4 className="text-lg font-bold text-slate-800">Lançamentos PER</h4>
          <Badge variant="secondary" className="text-xs">
            {rows.length} registro{rows.length !== 1 ? 's' : ''}
          </Badge>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Tipo Tributo:</Label>
            <Select value={tributoFiltro} onValueChange={onTributoFiltroChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {tributosDisponiveis.map((tributo) => (
                  <SelectItem key={tributo} value={tributo}>
                    {tributo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onExport} size="sm" variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Planilha
          </Button>
          {perPago && (
            <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Ressarcido
            </Badge>
          )}
          {!perPago && (
            <Button onClick={onNewRessarcimento} size="sm" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Novo Ressarcimento
            </Button>
          )}
          {saldoRestante > 0 && (
            <Button onClick={onNewDcomp} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo DCOMP
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N DCOMP Original</TableHead>
                <TableHead>N DCOMP Retificado</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Data Envio</TableHead>
                <TableHead>Imposto</TableHead>
                <TableHead className="text-right">Valor Compensado</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {tributoFiltro === '__todos__'
                      ? 'Nenhum DCOMP vinculado a este PER'
                      : `Nenhum DCOMP com ${tributoFiltro} no rateio`}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(
                  ({
                    dcomp,
                    valorExibido,
                    tributoExibido,
                    originalDoc,
                    isRetificacao,
                    tooltipTodos,
                  }) => (
                    <TableRow key={dcomp.nr_documento}>
                      <TableCell className="font-medium">
                        {formatProcessNumber(isRetificacao ? originalDoc : dcomp.nr_documento)}
                      </TableCell>
                      <TableCell>
                        {isRetificacao ? (
                          <span className="text-orange-600 font-medium">
                            {formatProcessNumber(dcomp.nr_documento)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{dcomp.mes_ano_exercicio}</TableCell>
                      <TableCell>{formatDate(dcomp.dt_envio)}</TableCell>
                      <TableCell>
                        {tooltipTodos ? (
                          <span
                            className="cursor-help border-b border-dashed border-muted-foreground/50"
                            title={tooltipTodos}
                          >
                            {tributoExibido}
                          </span>
                        ) : (
                          tributoExibido
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(valorExibido)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEditDcomp(dcomp)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteDcomp(dcomp)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="xl:hidden h-16 px-6 border-t border-border bg-muted/50 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-slate-500">Valor Crédito</p>
          <p className="font-mono font-bold">{formatCurrency(valorCredito)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Saldo Restante do PER</p>
          <p
            className={cn(
              'font-mono font-bold',
              saldoRestante > 0 ? 'text-green-600' : saldoRestante < 0 ? 'text-red-600' : '',
            )}
          >
            {formatCurrency(saldoRestante)}
          </p>
        </div>
      </div>
    </div>
  );
}
