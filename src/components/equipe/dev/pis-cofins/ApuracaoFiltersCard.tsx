import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { RequiredMark } from "@/components/ui/required-mark";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelecaoDeCliente } from "@/components/equipe/selecao/SelecaoDeCliente";
import { SelecaoDeContribuinte } from "@/components/equipe/selecao/SelecaoDeContribuinte";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApuracaoPisCofinsController, TipoApuracao } from "@/hooks/useApuracaoPisCofinsController";
import { Eraser, Filter, Info, Loader2, Search } from "lucide-react";

const FieldTooltip = ({ children }: { children: string }) => (
  <Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" /></TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">{children}</TooltipContent>
  </Tooltip>
);

export function ApuracaoFiltersCard({ controller }: { controller: ApuracaoPisCofinsController }) {
  const clientes = controller.clientesQuery.data;
  const contribuintes = controller.contribuintesQuery.data;
  return <>
    <Alert className="mb-6 bg-[#E6F2F1]/80 border-[#E6F2F1]">
      <Info className="h-5 w-5 text-primary" />
      <AlertTitle className="text-sm font-semibold text-foreground">Visão Geral</AlertTitle>
      <AlertDescription className="text-sm leading-relaxed text-foreground mt-1">
        A <strong className="font-semibold">Apuração PIS/COFINS</strong> consolida débitos, créditos, isenções e rateios do contribuinte a partir do <strong className="font-semibold">EFD Contribuições</strong> (modo Cliente) ou do <strong className="font-semibold">Balancete</strong> importado (modo Prado), permitindo conferir a base de cálculo, o resultado do período e o saldo apurado mês a mês.
      </AlertDescription>
    </Alert>
    <Card className="mb-6">
      <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg text-primary"><Filter className="h-5 w-5 text-primary" /><span className="uppercase text-sm tracking-wider font-bold text-foreground">Filtros de Busca</span></CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Cliente <RequiredMark /><FieldTooltip>Cliente/grupo cujo contribuinte será apurado.</FieldTooltip></label>
            <SelecaoDeCliente clientes={clientes} value={controller.selectedCliente} onChange={controller.setSelectedCliente} loading={controller.clientesQuery.isLoading} placeholder="Selecione o cliente" className="w-full min-w-0 h-11" />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Contribuinte <RequiredMark /><FieldTooltip>CNPJ vinculado ao cliente. Define os dados consultados no EFD ou Balancete.</FieldTooltip></label>
            <SelecaoDeContribuinte contribuintes={contribuintes} value={controller.selectedContribuinte} onChange={(value) => { controller.setSelectedContribuinte(value); controller.setSearchTriggered(false); }} loading={controller.contribuintesQuery.isLoading && !!controller.selectedCliente} disabled={!controller.selectedCliente} placeholder="Selecione o contribuinte" className="w-full min-w-0 h-11" />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Tipo de análise<FieldTooltip>Cliente utiliza EFD Contribuições; Prado utiliza o balancete importado.</FieldTooltip></label>
            <Select value={controller.tipoApuracao} onValueChange={(value) => controller.setTipoApuracao(value as TipoApuracao)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EFD">Cliente</SelectItem><SelectItem value="BALANCETE">Prado</SelectItem></SelectContent></Select>
          </div>
          <div className="col-span-12 md:col-span-3"><label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Data Início <RequiredMark /><FieldTooltip>Mês/ano inicial do período de apuração. Obrigatório.</FieldTooltip></label><MonthYearPicker value={controller.mesInicio} onChange={controller.setMesInicio} placeholder="Mês/Ano" /></div>
          <div className="col-span-12 md:col-span-3"><label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">Data Fim <RequiredMark /><FieldTooltip>Mês/ano final do período (≥ Data Início). Obrigatório.</FieldTooltip></label><MonthYearPicker value={controller.mesFim} onChange={controller.setMesFim} placeholder="Mês/Ano" /></div>
          {controller.tipoApuracao === "BALANCETE" && <div className="col-span-12 md:col-span-6 flex items-end pb-2"><div className="flex items-center gap-2"><Switch id="periodo-fechado" checked={controller.periodoFechado} onCheckedChange={controller.setPeriodoFechado} /><Label htmlFor="periodo-fechado" className="text-sm text-muted-foreground flex items-center gap-1">Período Fechado<FieldTooltip>Quando ativo, considera apenas competências já encerradas no balancete (modo Prado).</FieldTooltip></Label></div></div>}
        </div>
        <Separator />
        <div className="flex items-center justify-end gap-2"><Button variant="outline" onClick={controller.handleClear} className="gap-1.5"><Eraser className="h-4 w-4" /> Limpar</Button><Button onClick={controller.handleSearch} disabled={controller.query.isLoading} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">{controller.query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Consultar</Button></div>
      </CardContent>
    </Card>
  </>;
}
