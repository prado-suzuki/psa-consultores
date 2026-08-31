import { AlertCircle, CheckCircle2, Download, Loader2, Package, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ButtonTooltip } from '@/components/equipe/dev/processo-difal/DifalTooltips';

export type DifalStatusFilter = 'all' | 'validated' | 'pending';

interface DifalSummaryActionsProps {
  searchTriggered: boolean;
  hasItems: boolean;
  totalItems: number;
  qtdValidados: number;
  qtdPendentes: number;
  statusFilter: DifalStatusFilter;
  pendingDecisionsCount: number;
  isSaving: boolean;
  isExporting: boolean;
  exportStatus: string;
  onStatusFilterChange: (filter: DifalStatusFilter) => void;
  onSaveChanges: () => void;
  onExportExcel: () => void;
}

export function DifalSummaryActions({
  searchTriggered,
  hasItems,
  totalItems,
  qtdValidados,
  qtdPendentes,
  statusFilter,
  pendingDecisionsCount,
  isSaving,
  isExporting,
  exportStatus,
  onStatusFilterChange,
  onSaveChanges,
  onExportExcel,
}: DifalSummaryActionsProps) {
  return (
    <>
      {searchTriggered && (totalItems > 0 || qtdValidados > 0 || qtdPendentes > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card
            className={cn(
              'border-warning/40 bg-warning/10 cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'pending' && 'ring-2 ring-warning ring-offset-2',
            )}
            onClick={() => onStatusFilterChange('pending')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{qtdPendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'border-success/40 bg-success/10 cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'validated' && 'ring-2 ring-success ring-offset-2',
            )}
            onClick={() => onStatusFilterChange('validated')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{qtdValidados}</p>
                <p className="text-xs text-muted-foreground">Validados</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'all' && 'ring-2 ring-primary ring-offset-2',
            )}
            onClick={() => onStatusFilterChange('all')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Total de produtos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {searchTriggered && hasItems && (
        <div className="flex justify-end gap-2 mb-4">
          {pendingDecisionsCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 h-9 px-3">
              <AlertCircle className="h-4 w-4" />
              {pendingDecisionsCount} decisão(ões) não sincronizada(s)
            </Badge>
          )}
          <ButtonTooltip name="salvarAlteracoes">
            <Button
              variant="default"
              size="sm"
              onClick={onSaveChanges}
              disabled={pendingDecisionsCount === 0 || isSaving}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar alterações
            </Button>
          </ButtonTooltip>
          <ButtonTooltip name="exportarExcel">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={isExporting || pendingDecisionsCount > 0}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportStatus === 'starting'
                ? 'Iniciando...'
                : exportStatus === 'processing'
                  ? 'Processando...'
                  : 'Exportar Excel'}
            </Button>
          </ButtonTooltip>
        </div>
      )}
    </>
  );
}
