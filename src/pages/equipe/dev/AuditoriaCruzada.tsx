import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Search, X, CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';
import { useBalanceteEfd } from '@/hooks/useBalanceteEfd';
import { useEfdcIcms } from '@/hooks/useEfdcIcms';
import { useEfdcXml } from '@/hooks/useEfdcXml';
import { AuditoriaProvider, useAuditoriaStore } from '@/contexts/AuditoriaContext';
import BalanceteEfdTab from '@/components/equipe/dev/auditoria/BalanceteEfdTab';
import EfdcIcmsTab from '@/components/equipe/dev/auditoria/EfdcIcmsTab';
import EfdcXmlTab from '@/components/equipe/dev/auditoria/EfdcXmlTab';
import { FieldTooltip, AUDITORIA_TOOLTIPS } from '@/components/equipe/dev/auditoria/tooltipHelpers';
import { RequiredMark } from '@/components/ui/required-mark';

const PAGE_DESCRIPTION =
  "A ferramenta **Análise Cruzada** realiza a reconciliação fiscal cruzando dados de **Balancete x EFD Contribuições**, **EFD ICMS x EFD Contribuições x XML de NFe** e **XMLs de CT-e por lote**. Use os filtros para selecionar cliente, contribuinte e período, e navegue pelas abas para identificar divergências entre as fontes.";

const AuditoriaCruzadaContent = () => {
  const {
    clienteId, contribuinteId, dataInicio, dataFim, hasQueried,
    setClienteId, setContribuinteId, setDataInicio, setDataFim, setHasQueried, handleLimpar,
  } = useAuditoriaStore();

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  useEffect(() => {
    if (clienteId && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId, setContribuinteId]);

  const dtIni = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : '';
  const dtFim = dataFim ? format(dataFim, 'yyyy-MM-dd') : '';

  const balanceteQuery = useBalanceteEfd({
    id_contribuinte: contribuinteId,
    dt_ini: dtIni,
    dt_fim: dtFim,
  });

  const efdcIcmsQuery = useEfdcIcms({ id_contribuinte: contribuinteId });

  const efdcXmlQuery = useEfdcXml({
    id_contribuinte: contribuinteId,
    dt_ini: dtIni,
    dt_fim: dtFim,
  });

  const handleConsultar = () => {
    setHasQueried(true);
    balanceteQuery.refetch();
    efdcIcmsQuery.refetch();
    efdcXmlQuery.refetch();
  };

  return (
    <DevLayout title="Análise Cruzada" subtitle="Auditoria cruzada de arquivos e balancete contra a EFD Contribuições.">
      <TooltipProvider delayDuration={300}>
        <DevPageHeader description={PAGE_DESCRIPTION} hideManualLink />
        <div className="space-y-4">
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Filter className="h-5 w-5 text-teal-600" />
                <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Cliente <RequiredMark />
                    <FieldTooltip text={AUDITORIA_TOOLTIPS.cliente} />
                  </label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Contribuinte <RequiredMark />
                    <FieldTooltip text={AUDITORIA_TOOLTIPS.contribuinte} />
                  </label>
                  <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                      <SelectValue placeholder={clienteId ? 'Selecione...' : 'Selecione um cliente'} />
                    </SelectTrigger>
                    <SelectContent>
                      {contribuintes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Data Início <RequiredMark />
                    <FieldTooltip text={AUDITORIA_TOOLTIPS.dataInicio} />
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-11 w-full justify-start text-left font-normal bg-white dark:bg-slate-800", !dataInicio && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar selected={dataInicio ?? undefined} onSelect={(d) => setDataInicio(d ?? null)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Data Fim <RequiredMark />
                    <FieldTooltip text={AUDITORIA_TOOLTIPS.dataFim} />
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-11 w-full justify-start text-left font-normal bg-white dark:bg-slate-800", !dataFim && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar selected={dataFim ?? undefined} onSelect={(d) => setDataFim(d ?? null)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={handleLimpar}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button onClick={handleConsultar}>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="balancete-efd" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="balancete-efd" className="text-xs sm:text-sm">Balancete</TabsTrigger>
              <TabsTrigger value="efd-icms" className="text-xs sm:text-sm">EFD ICMS | XML NFe</TabsTrigger>
              <TabsTrigger value="efd-xml" className="text-xs sm:text-sm">XMLs de CTE por Lote</TabsTrigger>
            </TabsList>

            <TabsContent value="balancete-efd">
              <BalanceteEfdTab
                periodos={balanceteQuery.data?.periodos}
                isLoading={balanceteQuery.isLoading}
                error={balanceteQuery.error as Error | null}
              />
            </TabsContent>

            <TabsContent value="efd-icms">
              <EfdcIcmsTab
                notas={efdcIcmsQuery.data?.NOTAS}
                isLoading={efdcIcmsQuery.isLoading}
                error={efdcIcmsQuery.error as Error | null}
              />
            </TabsContent>

            <TabsContent value="efd-xml">
              <EfdcXmlTab
                lotes={efdcXmlQuery.data}
                isLoading={efdcXmlQuery.isLoading}
                error={efdcXmlQuery.error as Error | null}
              />
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </DevLayout>
  );
};

const AuditoriaCruzada = () => (
  <AuditoriaProvider>
    <AuditoriaCruzadaContent />
  </AuditoriaProvider>
);

export default AuditoriaCruzada;
