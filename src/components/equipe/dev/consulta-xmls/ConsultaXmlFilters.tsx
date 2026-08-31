import { ArrowDownLeft, ArrowUpRight, CalendarIcon, Eraser, Filter, FolderDown, Info, Loader2, Search } from "lucide-react";
import { format, parse } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RequiredMark } from "@/components/ui/required-mark";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportDialog } from "@/components/equipe/dev/ExportDialog";
import { cn } from "@/lib/utils";
import { formatCnpj } from "@/lib/consultaXmls";
import { XML_TOOLTIPS } from "@/lib/consultaXmlsTooltips";
import type { CTeRecord, NFeRecord, TipoDocumentoXml, TipoMovimentoXml } from "@/types/consultaXmls";
import { ButtonTooltip, FieldTooltip } from "@/components/equipe/dev/consulta-xmls/tooltips";

interface DomainItem { id: string; nome?: string; nome_razao_social?: string; cpf_cnpj?: string | null }
export interface ConsultaXmlFiltersProps {
  values: { cliente: string; contribuinte: string; startDate: string; endDate: string; tipoDocumento: TipoDocumentoXml; tipoMov: TipoMovimentoXml; emitente: string; destinatario: string; chave: string };
  set: { cliente(value: string): void; contribuinte(value: string): void; startDate(value: string): void; endDate(value: string): void; tipoDocumento(value: TipoDocumentoXml): void; tipoMov(value: TipoMovimentoXml): void; emitente(value: string): void; destinatario(value: string): void; chave(value: string): void };
  clientes?: DomainItem[]; contribuintes?: DomainItem[]; loadingClientes: boolean; loadingContribuintes: boolean; errorContribuintes: Error | null;
  nfeRecords: NFeRecord[]; cteRecords: CTeRecord[]; totalRecords: number; isLoading: boolean; downloadingBatch: boolean;
  hasActiveFilters: boolean; onClear(): void; onSearch(): void; onDownloadBatch(): void;
}

export function ConsultaXmlFilters(props: ConsultaXmlFiltersProps) {
  const { values, set } = props;
  const navigate = useNavigate();
  const required = !!(values.cliente && values.contribuinte && values.tipoDocumento && values.startDate && values.endDate);
  const hasRecords = values.tipoDocumento === "nfe" ? props.nfeRecords.length > 0 : props.cteRecords.length > 0;
  return <Card>
    <CardHeader className="pb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><Filter className="h-5 w-5"/><span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 ml-1.5 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent side="top"className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">Use os campos abaixo para filtrar a consulta das notas fiscais.</TooltipContent></Tooltip></CardTitle></CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3"><Label text="Cliente"required tooltip={XML_TOOLTIPS.cliente} /><Select value={values.cliente} onValueChange={set.cliente}><SelectTrigger className="h-11"><SelectValue placeholder={props.loadingClientes ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Carregando...</span> :"Selecione um cliente"} /></SelectTrigger><SelectContent>{props.clientes?.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select></div>
        <div className="md:col-span-4"><Label text="Contribuinte"required tooltip={XML_TOOLTIPS.contribuinte} />{props.errorContribuintes ? <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-md bg-destructive/10">{props.errorContribuintes.message}<Button variant="link"className="text-destructive p-0 h-auto ml-2"onClick={() => navigate("/equipe")}>Fazer login novamente</Button></div> : <Select value={values.contribuinte} onValueChange={set.contribuinte}><SelectTrigger className="h-11"><SelectValue placeholder={props.loadingContribuintes ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Carregando...</span> :"Selecione um contribuinte"} /></SelectTrigger><SelectContent>{props.contribuintes?.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome_razao_social} {item.cpf_cnpj ?`(${formatCnpj(item.cpf_cnpj)})`:""}</SelectItem>)}</SelectContent></Select>}</div>
        <div className="md:col-span-2"><Label text="Tipo Doc."required tooltip={XML_TOOLTIPS.tipoDoc} /><Select value={values.tipoDocumento} onValueChange={(value:"nfe"|"cte"|"todos") => set.tipoDocumento(value)}><SelectTrigger className="h-11"><SelectValue placeholder="Selecione o tipo do doc"/></SelectTrigger><SelectContent><SelectItem value="nfe">NFe</SelectItem><SelectItem value="cte">CTe</SelectItem></SelectContent></Select></div>
        <div className="md:col-span-3"><Label text="Tipo Mov."tooltip={XML_TOOLTIPS.tipoMov} /><Select value={values.tipoMov} onValueChange={(value:"Entrada"|"Saida"|"todos") => set.tipoMov(value ==="todos"?"": value)}><SelectTrigger className="h-11"><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent><SelectItem value="todos"><span className="text-muted-foreground">Todos</span></SelectItem><SelectItem value="Entrada"><span className="flex items-center gap-1.5"><ArrowDownLeft className="h-3.5 w-3.5 text-green-600"/>Entrada</span></SelectItem><SelectItem value="Saida"><span className="flex items-center gap-1.5"><ArrowUpRight className="h-3.5 w-3.5 text-blue-600"/>Saída</span></SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <DateField label="Data Início" value={values.startDate} onChange={set.startDate} tooltip={XML_TOOLTIPS.start_date} />
        <DateField label="Data Fim" value={values.endDate} onChange={set.endDate} tooltip={XML_TOOLTIPS.end_date} />
        <div className="md:col-span-2"><Label text="CPF/CNPJ Emitente" tooltip={XML_TOOLTIPS.emitente} /><Input placeholder="Digite o CPF ou CNPJ" value={values.emitente} onChange={(event) => set.emitente(event.target.value)} className="h-11" /></div>
        <div className="md:col-span-2"><Label text="CPF/CNPJ Destinatário" tooltip={XML_TOOLTIPS.destinatario} /><Input placeholder="Digite o CPF ou CNPJ" value={values.destinatario} onChange={(event) => set.destinatario(event.target.value)} className="h-11" /></div>
        <div className="md:col-span-4"><Label text="Chave de Acesso" tooltip={XML_TOOLTIPS.chaveAcesso} /><Input placeholder="Digite a chave de acesso (44 dígitos)" value={values.chave} onChange={(event) => set.chave(event.target.value)} className="h-11 font-mono text-sm" maxLength={50} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {props.hasActiveFilters && <ButtonTooltip text={XML_TOOLTIPS.limpar}><Button variant="ghost"onClick={props.onClear} disabled={props.isLoading} className="text-slate-500 hover:text-red-600 hover:bg-red-50"><Eraser className="h-4 w-4 mr-2"/>Limpar filtros</Button></ButtonTooltip>}
        <ButtonTooltip text={XML_TOOLTIPS.baixarXmls}><Button variant="outline" onClick={props.onDownloadBatch} disabled={props.downloadingBatch || props.isLoading || !required || !hasRecords}>{props.downloadingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderDown className="h-4 w-4 mr-2" />}Baixar XMLs</Button></ButtonTooltip>
        <ButtonTooltip text={XML_TOOLTIPS.exportarExcel}><ExportDialog data={values.tipoDocumento === "nfe" ? props.nfeRecords : []} cteData={values.tipoDocumento === "cte" ? props.cteRecords : []} tipoDocumento={values.tipoDocumento || "nfe"} totalRecords={props.totalRecords} start_date={values.startDate} end_date={values.endDate} contribuinteId={values.contribuinte} tipoMov={values.tipoMov} emitente={values.emitente} destinatario={values.destinatario} disabled={props.isLoading || !required || !hasRecords} /></ButtonTooltip>
        <ButtonTooltip text={XML_TOOLTIPS.buscar}><Button variant="outline" onClick={props.onSearch} disabled={!required || props.isLoading} className="hover:bg-primary hover:text-primary-foreground shadow-sm transition-colors">{props.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Buscar</Button></ButtonTooltip>
      </div>
    </CardContent>
  </Card>;
}

function Label({ text, required, tooltip }: { text: string; required?: boolean; tooltip: string }) {
  return <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">{text} {required && <RequiredMark />}<FieldTooltip text={tooltip} /></label>;
}

function DateField({ label, value, onChange, tooltip }: { label: string; value: string; onChange(value: string): void; tooltip: string }) {
  return <div className="md:col-span-3"><Label text={label} required tooltip={tooltip} /><Popover><PopoverTrigger asChild><Button variant="outline"className={cn("w-full h-11 px-3 text-left font-normal justify-start bg-white", !value &&"text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50"/>{value ? format(parse(value,"yyyy-MM-dd", new Date()),"dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"align="start"><Calendar selected={value ? parse(value,"yyyy-MM-dd", new Date()) : undefined} onSelect={(date) => onChange(date ? format(date,"yyyy-MM-dd") :"")} /></PopoverContent></Popover></div>;
}
