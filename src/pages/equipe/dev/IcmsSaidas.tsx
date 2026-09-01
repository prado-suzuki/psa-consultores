import { useState, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { T01ApuracaoTab } from '@/components/equipe/dev/icms-saidas/T01ApuracaoTab';
import { T02CfopTab } from '@/components/equipe/dev/icms-saidas/T02CfopTab';
import { T03_1SaidasTab } from '@/components/equipe/dev/icms-saidas/T03_1SaidasTab';
import { T03_2SaidasStTab } from '@/components/equipe/dev/icms-saidas/T03_2SaidasStTab';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';
import {
  ButtonTooltip,
  FieldTooltip,
  InlineTooltip,
} from '@/components/equipe/dev/icms-saidas/tooltipHelpers';
import { ICMS_PAGE_TOOLTIPS } from '@/components/equipe/dev/icms-saidas/tooltipContent';
import { useToast } from '@/hooks/use-toast';
import { useDomainIcmsSaidas } from '@/hooks/useDomainIcmsSaidas';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { Search, CalendarIcon, Filter, Eraser } from 'lucide-react';

const getDefaultDates = () => {
  const now = new Date();
  return {
    inicio: format(startOfMonth(now), 'yyyy-MM-dd'),
    fim: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
};

const IcmsSaidas = () => {
  // Apuração em abas com cabeçalho de dois níveis e colunas largas em scroll.
  useTelaDeTrabalhoLargo();

  const { toast } = useToast();
  const defaultDates = getDefaultDates();

  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [start_date, setDataInicio] = useState(defaultDates.inicio);
  const [end_date, setDataFim] = useState(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [activeTab, setActiveTab] = useState('t01');

  const { clientesQuery, contribuintesQuery } = useDomainIcmsSaidas(selectedCliente);
  const { data: clientes, isLoading: isLoadingClientes } = clientesQuery;
  const { data: contribuintes, isLoading: isLoadingContribuintes } = contribuintesQuery;

  useEffect(() => {
    if (contribuintes?.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [contribuintes, selectedContribuinte]);

  const isLoadingItems = false;

  const handleSearch = () => {
    if (!selectedContribuinte) {
      toast({
        title: 'Selecione um contribuinte',
        description: 'É necessário selecionar um contribuinte para buscar.',
        variant: 'destructive',
      });
      return;
    }
    setSearchTriggered(true);
  };

  const handleClearFilters = () => {
    setSelectedCliente('');
    setSelectedContribuinte('');
    setDataInicio(defaultDates.inicio);
    setDataFim(defaultDates.fim);
    setSearchTriggered(false);
  };

  const tabsEnabled = searchTriggered && !!selectedContribuinte;

  return (
    <TooltipProvider delayDuration={200}>
      <DevLayout
        title="ICMS das Saídas"
        subtitle="Apuração, reconciliação e classificação fiscal de saídas"
      >
        <Card className="mb-6 border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Filter className="h-5 w-5" />
              <span className="uppercase text-sm tracking-wider font-bold text-foreground">
                Filtros de Busca
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span>
                      Cliente <RequiredMark />
                    </span>
                    <FieldTooltip text={ICMS_PAGE_TOOLTIPS.cliente} />
                  </span>
                </label>
                <Select
                  value={selectedCliente}
                  onValueChange={(value) => {
                    setSelectedCliente(value);
                    setSelectedContribuinte('');
                    setSearchTriggered(false);
                  }}
                  disabled={isLoadingClientes}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span>
                      Contribuinte <RequiredMark />
                    </span>
                    <FieldTooltip text={ICMS_PAGE_TOOLTIPS.contribuinte} />
                  </span>
                </label>
                <Select
                  value={selectedContribuinte}
                  onValueChange={(value) => {
                    setSelectedContribuinte(value);
                    setSearchTriggered(false);
                  }}
                  disabled={!selectedCliente || isLoadingContribuintes}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o contribuinte" />
                  </SelectTrigger>
                  <SelectContent>
                    {contribuintes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span>
                      Data Início <RequiredMark />
                    </span>
                    <FieldTooltip text={ICMS_PAGE_TOOLTIPS.start_date} />
                  </span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-11 px-3 text-left font-normal justify-start bg-white',
                        !start_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {start_date ? format(parse(start_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      selected={start_date ? parse(start_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => {
                        setDataInicio(date ? format(date, 'yyyy-MM-dd') : '');
                        setSearchTriggered(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <span>
                      Data Fim <RequiredMark />
                    </span>
                    <FieldTooltip text={ICMS_PAGE_TOOLTIPS.end_date} />
                  </span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-11 px-3 text-left font-normal justify-start bg-white',
                        !end_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {end_date ? format(parse(end_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      selected={end_date ? parse(end_date, 'yyyy-MM-dd', new Date()) : undefined}
                      onSelect={(date) => {
                        setDataFim(date ? format(date, 'yyyy-MM-dd') : '');
                        setSearchTriggered(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pt-4 border-t border-border">
              <ButtonTooltip text={ICMS_PAGE_TOOLTIPS.limparFiltros}>
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              </ButtonTooltip>
              <ButtonTooltip text={ICMS_PAGE_TOOLTIPS.buscar}>
                <Button
                  onClick={handleSearch}
                  disabled={!selectedContribuinte || isLoadingItems}
                  className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar produtos
                </Button>
              </ButtonTooltip>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="grid w-full grid-cols-4 h-12 p-1 rounded-lg border border-border shadow-sm"
          >
            {[
              { value: 't01', label: 'T01 - Apuração', tip: ICMS_PAGE_TOOLTIPS.tabT01 },
              { value: 't02', label: 'T02 - CFOP', tip: ICMS_PAGE_TOOLTIPS.tabT02 },
              { value: 't03_1', label: 'T03.1 - Saídas', tip: ICMS_PAGE_TOOLTIPS.tabT03_1 },
              { value: 't03_2', label: 'T03.2 - Saídas ST', tip: ICMS_PAGE_TOOLTIPS.tabT03_2 },
            ].map((t) => (
              <InlineTooltip key={t.value} content={t.tip}>
                <TabsTrigger
                  value={t.value}
                  className={cn(
                    'relative isolate h-10 overflow-hidden text-sm font-semibold rounded-md border border-transparent',
                    'text-muted-foreground',
                    'transition-all duration-300 ease-out',
                    'hover:-translate-y-0.5 hover:border-primary/15 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20',
                    t.value === activeTab
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-primary/15 -translate-y-0.5'
                      : 'bg-transparent',
                  )}
                >
                  {t.label}
                </TabsTrigger>
              </InlineTooltip>
            ))}
          </TabsList>

          <TabsContent value="t01" className="mt-4">
            <T01ApuracaoTab
              enabled={tabsEnabled}
              contribuinteId={selectedContribuinte}
              start_date={start_date}
              end_date={end_date}
            />
          </TabsContent>

          <TabsContent value="t02" className="mt-4">
            <T02CfopTab
              enabled={tabsEnabled}
              contribuinteId={selectedContribuinte}
              start_date={start_date}
              end_date={end_date}
            />
          </TabsContent>

          <TabsContent value="t03_1" className="mt-4">
            <T03_1SaidasTab
              enabled={tabsEnabled}
              contribuinteId={selectedContribuinte}
              start_date={start_date}
              end_date={end_date}
            />
          </TabsContent>

          <TabsContent value="t03_2" className="mt-4">
            <T03_2SaidasStTab
              enabled={tabsEnabled}
              contribuinteId={selectedContribuinte}
              start_date={start_date}
              end_date={end_date}
            />
          </TabsContent>
        </Tabs>
      </DevLayout>
    </TooltipProvider>
  );
};

export default IcmsSaidas;
