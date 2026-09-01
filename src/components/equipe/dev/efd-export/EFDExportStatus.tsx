import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import type { EfdExportStatus } from '@/hooks/useEfdExportMachine';
import { CheckCircle2, Download, Loader2, Server } from 'lucide-react';

interface Props { status: EfdExportStatus; message: string; count: number; onCancel: () => void; onExport: () => void }

export function EFDExportStatus({ status, message, count, onCancel, onExport }: Props) {
  const processing = status === 'processing' || status === 'starting';
  return <DialogFooter className="p-5 border-t border-border flex justify-between items-center bg-white flex-shrink-0">
    <div className="flex items-center gap-3">
      {processing ? <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Server className="h-5 w-5 text-amber-600 animate-pulse"/></div> : status ==='completed'? <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600"/></div> : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold">{count}</div>}
      <div className="flex flex-col"><span className="text-sm font-bold">{status === 'idle' ? 'Registros Selecionados' : 'Exportação em Andamento'}</span><span className="text-xs text-slate-500">{message || 'Pronto para exportar'}</span></div>
    </div>
    <div className="flex gap-3"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={onExport} disabled={status !== 'idle' || count === 0} className="bg-emerald-600 hover:bg-emerald-700">{processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</> : <><Download className="h-4 w-4 mr-2" />Gerar Relatório ({count})</>}</Button></div>
  </DialogFooter>;
}
