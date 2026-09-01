import { AlertCircle, CheckCircle2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ColumnTooltip } from '@/components/equipe/dev/processo-difal/DifalTooltips';
import { PROCESSO_DIFAL_ITEMS_PER_PAGE } from '@/lib/processoDifal';
import type { DifalGroupedItem } from '@/types/difal';

interface DifalProductsCardProps {
  groupedItems: DifalGroupedItem[];
  isLoading: boolean;
  itemsError: Error | null;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onGroupClick: (group: DifalGroupedItem) => void;
  onPageChange: (direction: 'prev' | 'next') => void;
}

export function DifalProductsCard({
  groupedItems,
  isLoading,
  itemsError,
  totalItems,
  currentPage,
  totalPages,
  hasMore,
  onGroupClick,
  onPageChange,
}: DifalProductsCardProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          Produtos para classificação
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : itemsError ? (
          <div className="p-6 text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Erro ao carregar produtos</p>
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum produto encontrado para o período selecionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="w-[100px]">
                    <ColumnTooltip name="colStatus">Status</ColumnTooltip>
                  </TableHead>
                  <TableHead>
                    <ColumnTooltip name="colProduto">Produto</ColumnTooltip>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <ColumnTooltip name="colNcm">NCM</ColumnTooltip>
                  </TableHead>
                  <TableHead className="w-[80px]">
                    <ColumnTooltip name="colCfop">CFOP</ColumnTooltip>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <ColumnTooltip name="colTributacao">Tributação</ColumnTooltip>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <ColumnTooltip name="colMvaSt">MVA/ST</ColumnTooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedItems.map((group) => (
                  <TableRow
                    key={group.groupKey}
                    className={
                      group.status === 'pendente'
                        ? 'cursor-pointer hover:bg-amber-50'
                        : 'hover:bg-muted'
                    }
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
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground line-clamp-1">{group.xProd}</p>
                        <p className="text-xs text-muted-foreground">Cód: {group.cod_produto}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{group.cod_ncm}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{group.cfop}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">CST:</span>{' '}
                        <span className="font-mono">{group.cst_icms || '—'}</span>
                        {group.aliq_icms && (
                          <>
                            <span className="text-slate-400 mx-1">|</span>
                            <span className="font-mono">{group.aliq_icms}%</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.classificacao ? (
                        <div className="text-sm">
                          <span className="font-mono">{group.classificacao.aliquota_st}%</span>
                          {group.classificacao.percentual_reducao && (
                            <span className="text-muted-foreground text-xs ml-1">
                              (Red. {group.classificacao.percentual_reducao}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalItems > PROCESSO_DIFAL_ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} ({totalItems} produtos)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange('prev')}
                    disabled={currentPage === 1}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange('next')}
                    disabled={!hasMore}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
