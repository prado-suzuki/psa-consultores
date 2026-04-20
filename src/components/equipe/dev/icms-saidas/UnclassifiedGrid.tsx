import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Download, Package, Save } from 'lucide-react';
import type { DifalGroupedItem } from '@/types/difal';

export interface IcmsGroupedItem extends DifalGroupedItem {
  tipo_operacao: string;
  uf_destino: string;
}

type StatusFilter = 'all' | 'validated' | 'pending';

interface UnclassifiedGridProps {
  title: string;
  groupedItems: IcmsGroupedItem[];
  isLoading: boolean;
  showStats?: boolean;
  showStatusFilter?: boolean;
  stats?: { total: number; validados: number; pendentes: number };
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (s: StatusFilter) => void;
  onGroupClick: (group: IcmsGroupedItem) => void;
  showActionButtons?: boolean;
  emptyMessage?: string;
}

export const UnclassifiedGrid = ({
  title,
  groupedItems,
  isLoading,
  showStats = true,
  showStatusFilter = true,
  stats,
  statusFilter = 'all',
  onStatusFilterChange,
  onGroupClick,
  showActionButtons = true,
  emptyMessage = 'Nenhum produto encontrado para os filtros aplicados',
}: UnclassifiedGridProps) => {
  const pendentesCount = stats?.pendentes ?? groupedItems.filter((g) => g.status === 'pendente').length;

  return (
    <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          <Package className="h-4 w-4 text-amber-700" />
          <span className="text-slate-800 dark:text-slate-200">{title}</span>
          <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200">
            {pendentesCount} {pendentesCount === 1 ? 'produto pendente' : 'produtos pendentes'} de classificação
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showStats && stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card
              className={cn(
                'border-amber-200 bg-amber-50/50 cursor-pointer transition-all hover:shadow-md',
                statusFilter === 'pending' && 'ring-2 ring-amber-500 ring-offset-2',
              )}
              onClick={() => showStatusFilter && onStatusFilterChange?.('pending')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{stats.pendentes}</p>
                  <p className="text-xs text-amber-600">Pendentes</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'border-green-200 bg-green-50/50 cursor-pointer transition-all hover:shadow-md',
                statusFilter === 'validated' && 'ring-2 ring-green-500 ring-offset-2',
              )}
              onClick={() => showStatusFilter && onStatusFilterChange?.('validated')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats.validados}</p>
                  <p className="text-xs text-green-600">Validados</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'border-slate-200 cursor-pointer transition-all hover:shadow-md',
                statusFilter === 'all' && 'ring-2 ring-primary ring-offset-2',
              )}
              onClick={() => showStatusFilter && onStatusFilterChange?.('all')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total de produtos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showActionButtons && groupedItems.length > 0 && (
          <TooltipProvider>
            <div className="flex justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="default" size="sm" disabled className="gap-2 bg-teal-600 hover:bg-teal-700 pointer-events-none">
                      <Save className="h-4 w-4" />
                      Salvar alterações
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Funcionalidade em desenvolvimento</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" size="sm" disabled className="gap-2 pointer-events-none">
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Funcionalidade em desenvolvimento</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        <div className="rounded-md border border-slate-200 bg-white">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groupedItems.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[70px]">UF</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[100px]">NCM</TableHead>
                    <TableHead className="w-[80px]">CFOP</TableHead>
                    <TableHead className="w-[150px]">Tributação</TableHead>
                    <TableHead className="w-[160px]">Contexto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedItems.map((group) => (
                    <TableRow
                      key={group.groupKey}
                      className={cn(
                        group.status === 'pendente'
                          ? 'cursor-pointer hover:bg-amber-50'
                          : 'cursor-pointer hover:bg-slate-50',
                      )}
                      onClick={() => onGroupClick(group)}
                    >
                      <TableCell>
                        {group.status === 'validado' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Validado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{group.uf_destino}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900 line-clamp-1">{group.xProd}</p>
                          <p className="text-xs text-slate-500">Cód: {group.cod_produto}</p>
                        </div>
                      </TableCell>
                      <TableCell><span className="font-mono text-sm">{group.cod_ncm}</span></TableCell>
                      <TableCell><Badge variant="outline">{group.cfop}</Badge></TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-slate-600">CST:</span>{' '}
                          <span className="font-mono">{group.cst_icms || '—'}</span>
                          {group.aliq_icms !== null && group.aliq_icms !== undefined && (
                            <>
                              <span className="text-slate-400 mx-1">|</span>
                              <span className="font-mono">{group.aliq_icms}%</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-slate-600">{group.tipo_operacao}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
