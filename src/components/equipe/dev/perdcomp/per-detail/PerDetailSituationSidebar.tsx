import { DollarSign, History, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { PerdcompDetailSituacao } from '@/lib/perdcompDetail';
import { cn } from '@/lib/utils';

interface SituationOption {
  value: string;
  label: string;
}

interface PerDetailSituationSidebarProps {
  situacaoAtual: string | null;
  situacaoColors: Record<string, string>;
  situacaoOptions: SituationOption[];
  novaSituacao: string;
  onNovaSituacaoChange: (value: string) => void;
  onUpdateSituacao: () => void;
  updatePending: boolean;
  situacoes: PerdcompDetailSituacao[];
  loadingSituacoes: boolean;
  perPago: boolean;
  vlrRessarcido: number;
  vlrRessarcidoOriginal?: number | null;
  dataPagamento?: string | null;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | null) => string;
  formatDateTime: (value: string | null) => string;
  onDeleteRessarcimento: () => void;
}

export function PerDetailSituationSidebar({
  situacaoAtual,
  situacaoColors,
  situacaoOptions,
  novaSituacao,
  onNovaSituacaoChange,
  onUpdateSituacao,
  updatePending,
  situacoes,
  loadingSituacoes,
  perPago,
  vlrRessarcido,
  vlrRessarcidoOriginal,
  dataPagamento,
  formatCurrency,
  formatDate,
  formatDateTime,
  onDeleteRessarcimento,
}: PerDetailSituationSidebarProps) {
  return (
    <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Situação Atual
          </h4>
          {situacaoAtual ? (
            <Badge className={cn('text-sm px-3 py-1', situacaoColors[situacaoAtual] || '')}>
              {situacaoAtual}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1">
              Sem situação
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Atualizar Situação
          </h4>
          <Select value={novaSituacao} onValueChange={onNovaSituacaoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a situação" />
            </SelectTrigger>
            <SelectContent>
              {situacaoOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={onUpdateSituacao}
            disabled={!novaSituacao || updatePending}
            className="w-full"
          >
            {updatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Situação
          </Button>
        </div>

        <Separator />

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
            <History className="h-3 w-3" />
            Histórico
          </h4>
          <ScrollArea className={perPago ? 'h-[200px]' : 'h-[300px]'}>
            {loadingSituacoes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : situacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum histórico</p>
            ) : (
              <div className="space-y-2">
                {situacoes.map((sit, index) => (
                  <div
                    key={sit.id}
                    className={cn(
                      'p-2 rounded-lg border',
                      index === 0
                        ?'bg-white border-primary/20'
                        :'bg-slate-100/50 border-transparent',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={index === 0 ? 'default' : 'outline'}
                        className={cn('text-xs', index === 0 && situacaoColors[sit.situacao])}
                      >
                        {sit.situacao}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(sit.criado_em)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {perPago && (
        <div className="mt-auto p-4 border-t border-slate-200">
          <div className="rounded-lg border border-green-300 bg-green-50 p-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-green-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider">
                    Ressarcimento Registrado
                  </h5>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1 text-green-700 hover:text-destructive hover:bg-destructive/10"
                    title="Excluir ressarcimento"
                    onClick={onDeleteRessarcimento}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
                  <div>
                    <span className="text-[10px] text-green-600">
                      Valor Atualizado
                    </span>
                    <p className="text-sm font-mono font-bold text-green-800">
                      {formatCurrency(vlrRessarcido)}
                    </p>
                  </div>
                  {vlrRessarcidoOriginal != null && (
                    <div>
                      <span className="text-[10px] text-green-600">
                        Valor Original
                      </span>
                      <p className="text-sm font-mono font-bold text-green-800">
                        {formatCurrency(vlrRessarcidoOriginal)}
                      </p>
                    </div>
                  )}
                  {dataPagamento && (
                    <div>
                      <span className="text-[10px] text-green-600">
                        Data Pagamento
                      </span>
                      <p className="text-sm font-mono font-bold text-green-800">
                        {formatDate(dataPagamento)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
