import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IcmsSaidasAuditModal } from '@/components/equipe/dev/IcmsSaidasAuditModal';
import { T01ApuracaoTab } from '@/components/equipe/dev/icms-saidas/T01ApuracaoTab';
import { T02CfopTab } from '@/components/equipe/dev/icms-saidas/T02CfopTab';
import { T03_1SaidasTab } from '@/components/equipe/dev/icms-saidas/T03_1SaidasTab';
import { T03_2SaidasStTab } from '@/components/equipe/dev/icms-saidas/T03_2SaidasStTab';
import type { T031Linha, T032Linha } from '@/components/equipe/dev/icms-saidas/mocks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import type { DifalGroupedItem } from '@/types/difal';
import { Search, CalendarIcon, Filter, Eraser } from 'lucide-react';

const CLIENTES_PERMITIDOS_NOMES = ['Barralcool', 'COPRODIA'];

const UFS_BR = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

interface ClienteRecord { id: string; nome: string }
interface ContribuinteRecord { id: string; nome_razao_social: string; cpf_cnpj: string | null }

const getDefaultDates = () => {
  const now = new Date();
  return {
    inicio: format(startOfMonth(now), 'yyyy-MM-dd'),
    fim: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
};

const IcmsSaidas = () => {
  const { toast } = useToast();
  const defaultDates = getDefaultDates();

  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [ufFiltro, setUfFiltro] = useState<string>('ALL');
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio);
  const [dataFim, setDataFim] = useState(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Decisões locais — chave: groupKey (cProd|NCM|UF). Preservadas ao limpar filtros.
  const [decisions, setDecisions] = useState<Map<string, { regraId: string; decididoEm: string }>>(new Map());

  const [selectedGroup, setSelectedGroup] = useState<DifalGroupedItem | null>(null);
  const [selectedTipoOperacao, setSelectedTipoOperacao] = useState<string>('');
  const [selectedUfModal, setSelectedUfModal] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  // Clientes
  const { data: clientes, isLoading: isLoadingClientes } = useQuery({
    queryKey: ['icms-saidas-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .or(CLIENTES_PERMITIDOS_NOMES.map((n) => `nome.ilike.${n}`).join(','))
        .order('nome');
      if (error) throw error;
      return (data || []) as ClienteRecord[];
    },
  });

  // Contribuintes
  const { data: contribuintes, isLoading: isLoadingContribuintes } = useQuery({
    queryKey: ['icms-saidas-contribuintes', selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedCliente)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return (data || []) as ContribuinteRecord[];
    },
    enabled: !!selectedCliente,
  });

  useEffect(() => {
    if (contribuintes?.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [contribuintes, selectedContribuinte]);

  // Mock query do grid de não-classificados (T03.1 / T03.2)
  const { data: mockItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['icms-saidas-grouped', selectedContribuinte, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return ALL_MOCK_ITEMS;
    },
    enabled: searchTriggered && !!selectedContribuinte,
    staleTime: Infinity,
  });

  // Itens agrupados (com UF na chave) e filtrados por UF + status (para T03.1)
  const groupedItems = useMemo<IcmsGroupedItem[]>(() => {
    if (!mockItems) return [];

    const allGroups: IcmsGroupedItem[] = mockItems.map((item) => {
      const groupKey = `${item.cProd}|${item.NCM}|${item.UF_destino}`;
      const isDecided = decisions.has(groupKey);
      return {
        groupKey,
        xProd: item.xProd,
        cod_produto: item.cProd,
        cod_ncm: item.NCM,
        id_contribuinte: selectedContribuinte,
        cfop: item.CFOP,
        cst_icms: item.CST,
        aliq_icms: item.aliq_prod,
        pRedBC: item.pRedBC,
        count: item.tot_itens,
        totalValue: item.vlr_total,
        nfesCount: item.tot_nfes,
        status: isDecided ? ('validado' as const) : ('pendente' as const),
        classificacao: null,
        tipo_operacao: item.tipo_operacao,
        uf_destino: item.UF_destino,
      };
    });

    return allGroups.filter((g) => {
      if (ufFiltro !== 'ALL' && g.uf_destino !== ufFiltro) return false;
      if (statusFilter === 'validated' && g.status !== 'validado') return false;
      if (statusFilter === 'pending' && g.status !== 'pendente') return false;
      return true;
    });
  }, [mockItems, decisions, selectedContribuinte, ufFiltro, statusFilter]);

  // Lista global (sem filtro de status) para T03.2 aplicar seu próprio filtro de CFOPs ST
  const allGroupedItemsForSt = useMemo<IcmsGroupedItem[]>(() => {
    if (!mockItems) return [];
    return mockItems
      .map((item) => {
        const groupKey = `${item.cProd}|${item.NCM}|${item.UF_destino}`;
        const isDecided = decisions.has(groupKey);
        return {
          groupKey,
          xProd: item.xProd,
          cod_produto: item.cProd,
          cod_ncm: item.NCM,
          id_contribuinte: selectedContribuinte,
          cfop: item.CFOP,
          cst_icms: item.CST,
          aliq_icms: item.aliq_prod,
          pRedBC: item.pRedBC,
          count: item.tot_itens,
          totalValue: item.vlr_total,
          nfesCount: item.tot_nfes,
          status: isDecided ? ('validado' as const) : ('pendente' as const),
          classificacao: null,
          tipo_operacao: item.tipo_operacao,
          uf_destino: item.UF_destino,
        } as IcmsGroupedItem;
      })
      .filter((g) => (ufFiltro === 'ALL' ? true : g.uf_destino === ufFiltro));
  }, [mockItems, decisions, selectedContribuinte, ufFiltro]);

  // Stats T03.1 (respeitam ufFiltro mas não statusFilter)
  const stats = useMemo(() => {
    if (!mockItems) return { total: 0, validados: 0, pendentes: 0 };
    const filtered = ufFiltro === 'ALL' ? mockItems : mockItems.filter((i) => i.UF_destino === ufFiltro);
    const total = filtered.length;
    let validados = 0;
    filtered.forEach((item) => {
      const k = `${item.cProd}|${item.NCM}|${item.UF_destino}`;
      if (decisions.has(k)) validados += 1;
    });
    return { total, validados, pendentes: total - validados };
  }, [mockItems, ufFiltro, decisions]);

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
    setStatusFilter('all');
  };

  // Limpa filtros mas PRESERVA decisions (classificações da sessão)
  const handleClearFilters = () => {
    setSelectedCliente('');
    setSelectedContribuinte('');
    setUfFiltro('ALL');
    setDataInicio(defaultDates.inicio);
    setDataFim(defaultDates.fim);
    setSearchTriggered(false);
    setStatusFilter('all');
  };

  // Único no parent — repassado a T03.1 e T03.2 para o modal global
  const handleGroupClick = (group: IcmsGroupedItem) => {
    setSelectedGroup(group);
    setSelectedTipoOperacao(group.tipo_operacao);
    setSelectedUfModal(group.uf_destino);
    setModalOpen(true);
  };

  const handleDecisionSaved = (group: DifalGroupedItem, regraId: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(group.groupKey, { regraId, decididoEm: new Date().toISOString() });
      return next;
    });
  };

  const headerActions = (
    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
      Beta
    </Badge>
  );

  const tabsEnabled = searchTriggered && !!selectedContribuinte;

  return (
    <DevLayout
      title="ICMS das Saídas"
      subtitle="Apuração, reconciliação e classificação fiscal de saídas"
      headerActions={headerActions}
    >
      {/* Filtros globais */}
      <Card className="mb-6 border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Filter className="h-5 w-5" />
            <span className="uppercase text-sm tracking-wider font-bold text-slate-800 dark:text-slate-200">
              Filtros de Busca
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
            {/* Cliente */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Cliente <RequiredMark />
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
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Contribuinte
              </label>
              <Select
                value={selectedContribuinte}
                onValueChange={(value) => {
                  setSelectedContribuinte(value);
                  setSearchTriggered(false);
                }}
                disabled={!selectedCliente || isLoadingContribuintes}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UF Destino */}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                UF Destino
              </label>
              <Select value={ufFiltro} onValueChange={setUfFiltro}>
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">Todas</SelectItem>
                  {UFS_BR.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data Início
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-11 px-3 text-left font-normal justify-start bg-white dark:bg-slate-800',
                      !dataInicio && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataInicio ? format(parse(dataInicio, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    selected={dataInicio ? parse(dataInicio, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => {
                      setDataInicio(date ? format(date, 'yyyy-MM-dd') : '');
                      setSearchTriggered(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data Fim
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-11 px-3 text-left font-normal justify-start bg-white dark:bg-slate-800',
                      !dataFim && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataFim ? format(parse(dataFim, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    selected={dataFim ? parse(dataFim, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => {
                      setDataFim(date ? format(date, 'yyyy-MM-dd') : '');
                      setSearchTriggered(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
            <Button
              onClick={handleSearch}
              disabled={!selectedContribuinte || isLoadingItems}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar produtos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="t01" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="t01">T01 — Apuração</TabsTrigger>
          <TabsTrigger value="t02">T02 — CFOP</TabsTrigger>
          <TabsTrigger value="t03_1">T03.1 — Saídas</TabsTrigger>
          <TabsTrigger value="t03_2">T03.2 — Saídas ST</TabsTrigger>
        </TabsList>

        <TabsContent value="t01" className="mt-4">
          <T01ApuracaoTab
            enabled={tabsEnabled}
            contribuinteId={selectedContribuinte}
            dataInicio={dataInicio}
            dataFim={dataFim}
          />
        </TabsContent>

        <TabsContent value="t02" className="mt-4">
          <T02CfopTab
            enabled={tabsEnabled}
            contribuinteId={selectedContribuinte}
            dataInicio={dataInicio}
            dataFim={dataFim}
          />
        </TabsContent>

        <TabsContent value="t03_1" className="mt-4">
          <T03_1SaidasTab
            enabled={tabsEnabled}
            contribuinteId={selectedContribuinte}
            dataInicio={dataInicio}
            dataFim={dataFim}
            groupedItems={groupedItems}
            isLoading={isLoadingItems}
            stats={stats}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onGroupClick={handleGroupClick}
          />
        </TabsContent>

        <TabsContent value="t03_2" className="mt-4">
          <T03_2SaidasStTab
            enabled={tabsEnabled}
            contribuinteId={selectedContribuinte}
            dataInicio={dataInicio}
            dataFim={dataFim}
            allGroupedItems={allGroupedItemsForSt}
            isLoading={isLoadingItems}
            onGroupClick={handleGroupClick}
          />
        </TabsContent>
      </Tabs>

      {/* Modal global — único, compartilhado entre T03.1 e T03.2 */}
      <IcmsSaidasAuditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        group={selectedGroup}
        ufDestino={selectedUfModal}
        tipoOperacao={selectedTipoOperacao}
        onDecisionSaved={handleDecisionSaved}
      />
    </DevLayout>
  );
};

export default IcmsSaidas;
