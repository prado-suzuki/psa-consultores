import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FilialOption } from '@/lib/consultaEfdIcms';
import { formatCnpj } from '@/lib/consultaEfdIcms';
import { Building2, Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';

interface Props { filial: string; filiais: FilialOption[]; cnpj: string; selectedCount: number; loading: boolean; downloading: boolean; onFilial: (value: string) => void; onRefresh: () => void; onExport: () => void; onDownload: () => void }

export function EfdResultsHeader(props: Props) {
  const selectedFilial = props.filiais.find(item => item.codigo === props.filial);
  return <div className="px-6 py-4 bg-slate-50 border-b"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><Building2 className="h-5 w-5 text-primary"/><div className="flex flex-col">
    <Select value={props.filial} onValueChange={props.onFilial}><SelectTrigger className="h-auto w-auto min-w-[200px] border-0 bg-transparent p-0 shadow-none gap-1.5 text-sm font-bold focus:ring-0"><SelectValue>{props.filial === 'todas' ? 'Todas as filiais' : selectedFilial?.nome || 'Matriz'}</SelectValue></SelectTrigger><SelectContent className="bg-background border z-50 min-w-[300px]"><SelectItem value="todas"><span className="font-medium">Todas as filiais</span></SelectItem>{props.filiais.map(item => <SelectItem key={item.codigo} value={item.codigo}><div className="flex items-center justify-between w-full gap-4"><span className="font-medium truncate max-w-[200px]">{item.nome}</span><span className="text-xs text-muted-foreground">({item.codigo})</span></div></SelectItem>)}</SelectContent></Select>
    <span className="text-xs text-slate-500 mt-0.5">CNPJ: {formatCnpj(selectedFilial?.cnpjCompleto || props.cnpj)}</span></div><Button variant="ghost" size="icon" className="h-8 w-8" onClick={props.onRefresh} disabled={props.loading}>{props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button></div>
    <div className="flex items-center gap-2">{props.selectedCount > 0 && <Badge variant="secondary" className="text-xs">{props.selectedCount} selecionado(s)</Badge>}<ActionTip text="Exportar arquivo(s) selecionado(s) para Excel."><Button variant="outline" size="sm" onClick={props.onExport} disabled={!props.selectedCount} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Exportar excel</Button></ActionTip><ActionTip text="Download individual ou em lote (ZIP) dos arquivos selecionados."><Button variant="outline" size="sm" onClick={props.onDownload} disabled={props.downloading || !props.selectedCount} className="gap-2">{props.downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar txt</Button></ActionTip></div>
  </div></div>;
}

function ActionTip({ text, children }: { text: string; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex">{children}</span></TooltipTrigger><TooltipContent side="top" className="text-xs text-center max-w-[220px]">{text}</TooltipContent></Tooltip>;
}
