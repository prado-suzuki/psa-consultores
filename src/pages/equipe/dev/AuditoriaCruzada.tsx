import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, CalendarIcon } from 'lucide-react';
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';
import { useBalanceteEfd } from '@/hooks/useBalanceteEfd';
import { useEfdcIcms } from '@/hooks/useEfdcIcms';
import { useEfdcXml } from '@/hooks/useEfdcXml';
import { AuditoriaProvider, useAuditoriaStore } from '@/contexts/AuditoriaContext';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import BalanceteEfdTab from '@/components/equipe/dev/auditoria/BalanceteEfdTab';
import EfdcIcmsTab from '@/components/equipe/dev/auditoria/EfdcIcmsTab';
import EfdcXmlTab from '@/components/equipe/dev/auditoria/EfdcXmlTab';

const AuditoriaCruzadaContent = () => {
  const {
    clienteId, contribuinteId, dataInicio, dataFim, hasQueried,
    setClienteId, setContribuinteId, setDataInicio, setDataFim, setHasQueried, handleLimpar,
  } = useAuditoriaStore();

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  const dtIni = monthYearToDateString(dataInicio, 'start');
  const dtFim = monthYearToDateString(dataFim, 'end');

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
    <DevLayout title="Auditoria Cruzada" subtitle="Auditoria cruzada de arquivos e balancete contra a EFD Contribuições.">
      <div className="space-y-4">
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contribuinte</Label>
                <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={clienteId ? 'Selecione...' : 'Selecione um cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contribuintes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                  <MonthYearPicker
                    value={dataInicio}
                    onChange={setDataInicio}
                    placeholder="Selecione..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                  <MonthYearPicker
                    value={dataFim}
                    onChange={setDataFim}
                    placeholder="Selecione..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleLimpar}>
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
              <Button size="sm" onClick={handleConsultar}>
                <Search className="h-3.5 w-3.5 mr-1" />
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="balancete-efd" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balancete-efd" className="text-xs sm:text-sm">Balancete</TabsTrigger>
            <TabsTrigger value="efd-icms" className="text-xs sm:text-sm">EFD ICMS</TabsTrigger>
            <TabsTrigger value="efd-xml" className="text-xs sm:text-sm">XMLs</TabsTrigger>
          </TabsList>

          <TabsContent value="balancete-efd">
            <BalanceteEfdTab
              itens={balanceteQuery.data?.itens}
              contas={balanceteQuery.data?.metadata?.contas}
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
    </DevLayout>
  );
};

const AuditoriaCruzada = () => (
  <AuditoriaProvider>
    <AuditoriaCruzadaContent />
  </AuditoriaProvider>
);

export default AuditoriaCruzada;
