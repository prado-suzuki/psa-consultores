import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatEfdCurrency, formatEfdPeriod } from '@/lib/consultaEfdIcms';
import type { BlocoRegistro, EFDArquivo } from '@/types/efd';
import { BarChart3, FileSpreadsheet, FileText, Loader2, Search } from 'lucide-react';

interface Props {
  searchTriggered: boolean;
  loading: boolean;
  arquivos: EFDArquivo[];
  selected: Set<string>;
  allSelected: boolean;
  downloadingId: string | null;
  blocos: Record<string, BlocoRegistro[]>;
  idContribuinte: string;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onDownload: (arquivo: EFDArquivo) => void;
  onAnalyze: (arquivo: EFDArquivo) => void;
}

export function EfdResultsTable(props: Props) {
  if (!props.searchTriggered) return <Empty icon={<Search className="w-10 h-10 text-slate-400" />} title="Nenhum arquivo listado" text={'Utilize os filtros acima e clique em "Buscar" para carregar os arquivos EFD ICMS.'} />;
  if (props.loading) return <div className="p-6 space-y-4">{[0, 1, 2].map(item => <Skeleton key={item} className="h-16 w-full" />)}</div>;
  if (!props.arquivos.length) return <Empty icon={<FileText className="h-12 w-12 text-slate-400" />} title="Nenhum arquivo encontrado" text="Verifique os filtros e tente novamente." />;
  return <div className={cn('overflow-x-auto','[&::-webkit-scrollbar]:h-3','[&::-webkit-scrollbar-thumb]:bg-slate-400','[&::-webkit-scrollbar-thumb]:rounded-full')}><table className="w-full text-left border-collapse"><thead><tr className="bg-muted border-b">
    <th className="px-4 py-4 w-12"><Checkbox checked={props.allSelected} onCheckedChange={props.onToggleAll} aria-label="Selecionar todos" /></th>
    {['Arquivo', 'Período', 'Tipo'].map(label => <th key={label} className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider"><ColumnTip label={label} /></th>)}
    {['ICMS', 'ICMS ST'].map(label => <th key={label} className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right"><ColumnTip label={label} /></th>)}
    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center w-56">Ações</th>
  </tr></thead><tbody className="divide-y divide-border">{props.arquivos.map(arquivo => <tr key={arquivo.ID_ARQUIVO} className="hover:bg-muted transition-colors">
    <td className="px-4 py-4"><Checkbox checked={props.selected.has(arquivo.ID_ARQUIVO)} onCheckedChange={() => props.onToggle(arquivo.ID_ARQUIVO)} aria-label={`Selecionar ${arquivo.NOME}`} /></td>
    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><FileSpreadsheet className="h-5 w-5"/></div><div><p className="font-bold text-sm text-foreground">{arquivo.NOME}</p><p className="text-[10px] text-slate-400 uppercase font-mono">ID: {arquivo.ID_ARQUIVO}</p></div></div></td>
    <td className="px-6 py-4 text-sm font-semibold">{formatEfdPeriod(arquivo.DT_INI, arquivo.DT_FIN)}</td>
    <td className="px-6 py-4"><Badge variant={arquivo.TIPO_ESCRIT === 0 ? 'default' : 'secondary'} className={cn('text-[10px] font-bold uppercase', arquivo.TIPO_ESCRIT === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{arquivo.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}</Badge></td>
    <td className="px-6 py-4 text-sm font-bold text-right font-mono">{formatEfdCurrency(arquivo.icms_a_recolher)}</td><td className="px-6 py-4 text-sm font-bold text-right font-mono">{formatEfdCurrency(arquivo.icms_st_a_recolher)}</td>
    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><Button title="Download do arquivo EFD ICMS original (.txt)." variant="outline" size="icon" className="h-8 w-8" onClick={() => props.onDownload(arquivo)} disabled={props.downloadingId === arquivo.ID_ARQUIVO}>{props.downloadingId === arquivo.ID_ARQUIVO ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}</Button><EFDExportDialog arquivo={arquivo} blocosDisponiveis={props.blocos} tipo="icms" idContribuinte={props.idContribuinte} /><Button title="Abre a análise detalhada dos blocos e registros do arquivo em tela." size="sm" onClick={() => props.onAnalyze(arquivo)} className="bg-primary hover:bg-primary/90"><BarChart3 className="h-4 w-4 mr-1" />Analisar</Button></div></td>
  </tr>)}</tbody></table></div>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]"><div className="mb-4">{icon}</div><h3 className="text-xl font-bold text-foreground">{title}</h3><p className="text-base text-muted-foreground max-w-xs mt-2">{text}</p></div>;
}

const COLUMN_TIPS: Record<string, string> = { Arquivo: 'Nome e ID do arquivo EFD ICMS processado.', Período: 'Mês inicial e final da escrituração.', Tipo: 'Status do arquivo (Original ou Retificadora).', ICMS: 'Total de ICMS a recolher apurado no período.', 'ICMS ST': 'Total de ICMS ST a recolher apurado no período.' };
function ColumnTip({ label }: { label: string }) {
  return <Tooltip><TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">{label}</TooltipTrigger><TooltipContent side="top" className="text-xs text-center max-w-[220px]">{COLUMN_TIPS[label]}</TooltipContent></Tooltip>;
}
