import { ArrowRight, FileText, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PerDetailHeaderProps {
  nrPer: string;
  tipoCredito: string;
  contribuinteNome?: string;
  exercicio: number;
  trimestre: number;
  nrProcessoRetificado?: string | null;
  valorCredito: number;
  saldoRestante: number;
  emCarencia: boolean;
  valorSelic: number | null;
  selicIndisponivel: boolean;
  selicError?: string;
  formatCurrency: (value: number) => string;
  formatProcessNumber: (value: string) => string;
  onDelete: () => void;
  onClose: () => void;
}

export function PerDetailHeader({
  nrPer,
  tipoCredito,
  contribuinteNome,
  exercicio,
  trimestre,
  nrProcessoRetificado,
  valorCredito,
  saldoRestante,
  emCarencia,
  valorSelic,
  selicIndisponivel,
  selicError,
  formatCurrency,
  formatProcessNumber,
  onDelete,
  onClose,
}: PerDetailHeaderProps) {
  return (
    <div className="h-20 flex items-center justify-between px-6 border-b border-border bg-white/95 backdrop-blur flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
          <FileText className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span>{formatProcessNumber(nrPer)}</span>
            <Badge variant="secondary" className="text-xs uppercase">
              {tipoCredito}
            </Badge>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {contribuinteNome || 'Contribuinte'}
            {' • '}
            <span className="text-slate-700 ml-1">
              {exercicio}/{trimestre}T
            </span>
          </p>
          {nrProcessoRetificado && (
            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              <span>Retifica:</span>
              <span className="font-mono font-medium">
                {formatProcessNumber(nrProcessoRetificado)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden xl:flex items-center gap-8 border-r border-border pr-6 h-12">
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
              Valor Crédito
            </p>
            <p className="text-lg font-mono font-bold text-slate-800">
              {formatCurrency(valorCredito)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
              Saldo Restante do PER
            </p>
            <p
              className={cn(
                'text-lg font-mono font-bold',
                saldoRestante > 0
                  ?'text-green-600'
                  : saldoRestante < 0
                    ?'text-red-600'
                    :'text-slate-800',
              )}
            >
              {formatCurrency(saldoRestante)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
              Vlr. Selic
            </p>
            {emCarencia ? (
              <p className="text-lg font-mono font-bold text-slate-400">
                Em carência
              </p>
            ) : valorSelic ? (
              <p className="text-lg font-mono font-bold text-blue-600">
                {formatCurrency(valorSelic)}
              </p>
            ) : selicIndisponivel ? (
              <p
                className="text-sm font-bold text-destructive max-w-[200px] truncate"
                title={selicError ?? 'SELIC indisponível'}
              >
                SELIC indisponível
              </p>
            ) : (
              <p className="text-lg font-mono font-bold text-slate-400">—</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-10 w-10 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
