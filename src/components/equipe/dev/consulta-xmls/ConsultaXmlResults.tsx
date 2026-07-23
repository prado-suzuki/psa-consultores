import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Download, FileText, FileX2, Loader2, RefreshCw, Search } from "lucide-react";
import { formatCnpj, formatCurrency, formatXmlDate } from "@/lib/consultaXmls";
import { XML_TOOLTIPS } from "@/lib/consultaXmlsTooltips";
import type { CTeRecord, NFeRecord, TipoDocumentoXml } from "@/types/consultaXmls";
import { ButtonTooltip, ColumnTooltip } from "@/components/equipe/dev/consulta-xmls/tooltips";

interface Props {
  searchTriggered: boolean; contribuinteId: string; tipoDocumento: TipoDocumentoXml;
  nfeRecords: NFeRecord[]; cteRecords: CTeRecord[]; totalRecords: number; totalPages: number; currentPage: number;
  isLoading: boolean; error: Error | null; downloadingKey: string | null;
  onRetry(): void; onPage(page: number): void; onDownload(chave: string, type: "nfe" | "cte"): void;
}

export function ConsultaXmlResults(props: Props) {
  return <Card className="w-full min-w-0 overflow-hidden">
    <CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Documentos</CardTitle>{props.totalRecords > 0 && <Badge variant="secondary" className="text-xs font-medium">{props.totalRecords} nota(s) encontrada(s)</Badge>}</div></CardHeader>
    <CardContent className="p-0">
      {!props.searchTriggered ? <Empty icon="search" title="Pronto para buscar"><p className="text-sm text-muted-foreground max-w-sm mx-auto">Preencha <strong>Cliente</strong>, <strong>Contribuinte</strong> e o <strong>período</strong>, depois clique em <strong>Buscar</strong>.</p></Empty>
        : !props.contribuinteId ? <Empty title="Contribuinte não selecionado"><p className="text-sm text-muted-foreground">Selecione um contribuinte para buscar os documentos fiscais.</p></Empty>
        : props.error ? <div className="flex flex-col items-center justify-center py-12 gap-4"><p className="text-destructive text-center max-w-md">{props.error.message}</p><Button variant="outline" onClick={props.onRetry}><RefreshCw className="h-4 w-4 mr-2" />Tentar novamente</Button></div>
        : <><div className="w-full overflow-x-auto">{props.tipoDocumento === "nfe" ? <NfeTable {...props} /> : <CteTable {...props} />}</div><Pagination {...props} /></>}
    </CardContent>
  </Card>;
}

function Empty({ icon, title, children }: { icon?: "search"; title: string; children: React.ReactNode }) {
  const Icon = icon === "search" ? Search : FileText;
  return <div className="text-center py-16"><div className="flex flex-col items-center gap-4"><div className="rounded-full bg-muted/60 p-4"><Icon className="h-10 w-10 text-muted-foreground/60" /></div><div className="space-y-1"><p className="font-semibold text-foreground">{title}</p>{children}</div></div></div>;
}

function EmptyRow({ columns }: { columns: number }) {
  return <TableRow><TableCell colSpan={columns} className="text-center py-12"><div className="flex flex-col items-center gap-3"><FileX2 className="h-12 w-12 text-amber-400" /><div><p className="font-medium text-foreground">Nenhum documento encontrado</p><p className="text-sm text-muted-foreground">Tente ajustar o período ou selecionar outro contribuinte</p></div></div></TableCell></TableRow>;
}

function DownloadButton({ chave, type, props }: { chave: string; type: "nfe" | "cte"; props: Props }) {
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={props.downloadingKey === chave} onClick={() => props.onDownload(chave, type)}>{props.downloadingKey === chave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button></span></TooltipTrigger><TooltipContent>{XML_TOOLTIPS.downloadLinha}</TooltipContent></Tooltip>;
}

function NfeTable(props: Props) {
  return <Table className="min-w-[950px]"><TableHeader><TableRow>
    <Head label="CNPJ Emitente" text="CNPJ do emissor da nota fiscal." /><Head label="Razão Social" text="Nome ou Razão Social do emissor." /><Head label="Chave de Acesso" text="Chave única de 44 dígitos da NFe." /><Head label="UF" text="Estado de origem da emissão." className="hidden lg:table-cell" /><Head label="Número" text="Número do documento fiscal." /><Head label="Data Emissão" text="Data e hora de emissão da nota." /><Head label="Valor" text="Valor total da nota fiscal." className="text-right" /><Head label="Produtos" text="Quantidade total de itens na nota." /><Head label="Ações" text="Download individual do XML." className="text-right" />
  </TableRow></TableHeader><TableBody>{props.isLoading ? <SkeletonRows count={9} prefix="nfe" responsiveClasses={{ 3: "hidden lg:table-cell" }} /> : props.nfeRecords.length === 0 ? <EmptyRow columns={9} /> : props.nfeRecords.map((record) => <TableRow key={record.chave_nfe}>
    <TableCell className="font-mono text-sm whitespace-nowrap">{formatCnpj(record.emit.CNPJ)}</TableCell><TableCell className="max-w-[200px]"><span className="truncate block" title={record.emit.xNome}>{record.emit.xNome}</span></TableCell><TableCell className="max-w-[180px]"><Tooltip><TooltipTrigger asChild><span className="truncate block font-mono text-xs cursor-help">{record.chave_nfe}</span></TooltipTrigger><TooltipContent side="top" className="max-w-[450px]"><p className="font-mono text-xs break-all">{record.chave_nfe}</p></TooltipContent></Tooltip></TableCell><TableCell className="hidden lg:table-cell">{record.emit.UF}</TableCell><TableCell className="font-mono">{record.nNF}</TableCell><TableCell className="whitespace-nowrap">{formatXmlDate(record.dhEmi)}</TableCell><TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(record.vlrTotal)}</TableCell><TableCell><Badge variant="outline">{record.contItens} item(s)</Badge></TableCell><TableCell className="text-right"><DownloadButton chave={record.chave_nfe} type="nfe" props={props} /></TableCell>
  </TableRow>)}</TableBody></Table>;
}

function CteTable(props: Props) {
  return <Table className="min-w-[1050px]"><TableHeader><TableRow>
    <Head label="CNPJ Emitente" text="CNPJ do emissor do conhecimento." /><Head label="Razão Social" text="Nome ou Razão Social do emissor." /><Head label="Origem" text="Município de início da prestação." className="hidden xl:table-cell" /><Head label="Destino" text="Município de término da prestação." className="hidden xl:table-cell" /><Head label="CFOP" text="Código Fiscal de Operações e Prestações." className="hidden lg:table-cell" /><Head label="Tipo" text="Tipo do documento fiscal." /><Head label="Número" text="Número do documento (CTe)." /><Head label="Data Emissão" text="Data de emissão do CTe." /><Head label="Valor Prestação" text="Valor total do serviço de transporte." className="text-right" /><Head label="Ações" text="Download individual do XML." className="text-right" />
  </TableRow></TableHeader><TableBody>{props.isLoading ? <SkeletonRows count={10} prefix="cte" responsiveClasses={{ 2: "hidden xl:table-cell", 3: "hidden xl:table-cell", 4: "hidden lg:table-cell" }} /> : props.cteRecords.length === 0 ? <EmptyRow columns={10} /> : props.cteRecords.map((record) => <TableRow key={record.chave_cte}>
    <TableCell className="font-mono text-sm whitespace-nowrap">{formatCnpj(record.emit.CNPJ || "")}</TableCell><TableCell className="max-w-[200px]"><span className="truncate block" title={record.emit.xNome}>{record.emit.xNome}</span></TableCell><TableCell className="hidden xl:table-cell"><span className="truncate block" title={record.xMunIni}>{record.xMunIni}</span></TableCell><TableCell className="hidden xl:table-cell"><span className="truncate block" title={record.xMunFim}>{record.xMunFim}</span></TableCell><TableCell className="font-mono hidden lg:table-cell">{record.cfop}</TableCell><TableCell><span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">CTe</span></TableCell><TableCell className="font-mono">{record.nCT}</TableCell><TableCell className="whitespace-nowrap">{formatXmlDate(record.dEmi)}</TableCell><TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(record.vTPrest)}</TableCell><TableCell className="text-right"><DownloadButton chave={record.chave_cte} type="cte" props={props} /></TableCell>
  </TableRow>)}</TableBody></Table>;
}

function Head({ label, text, className = "" }: { label: string; text: string; className?: string }) { return <TableHead className={`whitespace-nowrap ${className}`}><ColumnTooltip label={label} text={text} /></TableHead>; }
function SkeletonRows({ count, prefix, responsiveClasses }: { count: number; prefix: string; responsiveClasses: Partial<Record<number, string>> }) { return <>{[...Array(5)].map((_, row) => <TableRow key={`skeleton-${prefix}-${row}`}>{[...Array(count)].map((__, cell) => <TableCell key={cell} className={responsiveClasses[cell]}><Skeleton className="h-5 w-20" /></TableCell>)}</TableRow>)}</>; }

function Pagination(props: Props) {
  if (props.totalPages <= 1) return null;
  const length = props.tipoDocumento === "nfe" ? props.nfeRecords.length : props.cteRecords.length;
  return <div className="flex items-center justify-between p-4 border-t"><span className="text-sm text-muted-foreground">Exibindo {length} de {props.totalRecords} notas • Página <span className="font-semibold text-foreground">{props.currentPage}</span> de {props.totalPages}</span><div className="flex gap-2"><ButtonTooltip text={XML_TOOLTIPS.paginacao}><Button variant="outline" size="sm" onClick={() => props.onPage(Math.max(1, props.currentPage - 1))} disabled={props.currentPage === 1 || props.isLoading}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button></ButtonTooltip><ButtonTooltip text={XML_TOOLTIPS.paginacao}><Button variant="outline" size="sm" onClick={() => props.onPage(Math.min(props.totalPages, props.currentPage + 1))} disabled={props.currentPage === props.totalPages || props.isLoading}>Próximo<ChevronRight className="h-4 w-4 ml-1" /></Button></ButtonTooltip></div></div>;
}
