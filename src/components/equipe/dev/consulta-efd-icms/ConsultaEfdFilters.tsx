import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { RequiredMark } from '@/components/ui/required-mark';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { SelecaoDeContribuinte } from '@/components/equipe/selecao/SelecaoDeContribuinte';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClienteConsultaEFDICMS, ContribuinteConsultaEFDICMS } from '@/hooks/useDomainConsultaEFDICMS';
import type { MonthYear } from '@/lib/consultaEfdIcms';
import { Filter, Info, Loader2, Search } from 'lucide-react';
import { BotaoLimparFiltros } from '@/components/ui/BotaoLimparFiltros';

interface Props {
  clientes?: ClienteConsultaEFDICMS[];
  contribuintes?: ContribuinteConsultaEFDICMS[];
  loadingClientes: boolean;
  loadingContribuintes: boolean;
  cliente: string;
  contribuinte: string;
  inicio: MonthYear | null;
  fim: MonthYear | null;
  searching: boolean;
  onCliente: (value: string) => void;
  onContribuinte: (value: string) => void;
  onInicio: (value: MonthYear | null) => void;
  onFim: (value: MonthYear | null) => void;
  onClear: () => void;
  /** Quantos filtros o usuario mexeu — o periodo ja nasce preenchido. */
  filtrosAtivos: number;
  onSearch: () => void;
}

const FieldLabel = ({ children, tip }: { children: React.ReactNode; tip: string }) => <label className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2 uppercase tracking-wider">{children} <RequiredMark /><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent side="top"className="text-xs text-center max-w-[220px]">{tip}</TooltipContent></Tooltip></label>;

export function ConsultaEfdFilters(props: Props) {
  return <Card className="mb-6 shadow-sm"><CardHeader className="pb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><Filter className="h-5 w-5"/><span className="uppercase text-sm tracking-wider font-bold text-foreground">Filtros de Busca</span></CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-3"><FieldLabel tip="Filtra as EFD ICMS por cliente ou grupo.">Cliente</FieldLabel><SelecaoDeCliente clientes={props.clientes} value={props.cliente} onChange={props.onCliente} loading={props.loadingClientes} placeholder="Selecione o cliente" className="w-full min-w-0 h-11" /></div>
      <div className="md:col-span-5"><FieldLabel tip="CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.">Contribuinte</FieldLabel><SelecaoDeContribuinte contribuintes={props.contribuintes} value={props.contribuinte} onChange={props.onContribuinte} loading={props.loadingContribuintes} placeholder="Selecione o contribuinte" className="w-full min-w-0 h-11" /></div>
      <div className="md:col-span-2"><FieldLabel tip="Define o período inicial da busca.">Data de Início</FieldLabel><MonthYearPicker value={props.inicio} onChange={props.onInicio} placeholder="Selecione"className="bg-white"/></div>
      <div className="md:col-span-2"><FieldLabel tip="Define o período final da busca.">Data Fim</FieldLabel><MonthYearPicker value={props.fim} onChange={props.onFim} placeholder="Selecione"className="bg-white"/></div>
    </div>
    <div className="flex justify-end gap-3 pt-4 border-t border-border"><BotaoLimparFiltros quantidade={props.filtrosAtivos} onClick={props.onClear} /><Button onClick={props.onSearch} disabled={!props.contribuinte} className="bg-primary hover:bg-primary/90">{props.searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Search className="h-4 w-4 mr-2"/>}Buscar arquivos</Button></div>
  </CardContent></Card>;
}
