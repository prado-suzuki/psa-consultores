import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IcmsSaidasAuditModal } from '@/components/equipe/dev/IcmsSaidasAuditModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import type { DifalGroupedItem } from '@/types/difal';
import {
  Search,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Package,
  CalendarIcon,
  Download,
  Save,
  Filter,
  Eraser,
} from 'lucide-react';

const CLIENTES_PERMITIDOS_NOMES = ['Barralcool', 'COPRODIA'];

const UFS_BR = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

// Mock — endpoints reais ainda não existem
const ALL_MOCK_ITEMS = [
  { cProd: '1001', xProd: 'ACUCAR CRISTAL ESP. DOCE DIA 10X2KG', NCM: '17019900',
    CFOP: '6101', CST: '020', tot_itens: 148, tot_nfes: 42, vlr_total: 8912441.22,
    aliq_prod: 12, pRedBC: null, UF_destino: 'GO', tipo_operacao: 'Venda' },
  { cProd: '1001', xProd: 'ACUCAR CRISTAL ESP. DOCE DIA 10X2KG', NCM: '17019900',
    CFOP: '6109', CST: '040', tot_itens: 22, tot_nfes: 8, vlr_total: 2854221.31,
    aliq_prod: 0, pRedBC: null, UF_destino: 'AM', tipo_operacao: 'Venda ZFM' },
  { cProd: '2100', xProd: 'ALCOOL ETILICO HIDRATADO COMBUSTIVEL', NCM: '22072010',
    CFOP: '6652', CST: '020', tot_itens: 521, tot_nfes: 178, vlr_total: 87238092.53,
    aliq_prod: 12, pRedBC: null, UF_destino: 'SP', tipo_operacao: 'Venda combustível' },
  { cProd: '1001', xProd: 'ACUCAR CRISTAL ESP. DOCE DIA 10X2KG', NCM: '17019900',
    CFOP: '5401', CST: '060', tot_itens: 312, tot_nfes: 96, vlr_total: 14557450.80,
    aliq_prod: 12, pRedBC: null, UF_destino: 'MT', tipo_operacao: 'Venda com ST' },
  { cProd: '2100', xProd: 'ALCOOL ETILICO HIDRATADO COMBUSTIVEL', NCM: '22072010',
    CFOP: '5652', CST: '020', tot_itens: 164, tot_nfes: 58, vlr_total: 11013742.66,
    aliq_prod: 17, pRedBC: null, UF_destino: 'MT', tipo_operacao: 'Venda combustível' },
  { cProd: '3050', xProd: 'FARELO DE SOJA A GRANEL', NCM: '23040090',
    CFOP: '6101', CST: '051', tot_itens: 89, tot_nfes: 31, vlr_total: 4251200.00,
    aliq_prod: 12, pRedBC: null, UF_destino: 'PR', tipo_operacao: 'Venda' },
  { cProd: '3050', xProd: 'FARELO DE SOJA A GRANEL', NCM: '23040090',
    CFOP: '6101', CST: '051', tot_itens: 42, tot_nfes: 15, vlr_total: 2105300.50,
    aliq_prod: 12, pRedBC: null, UF_destino: 'RS', tipo_operacao: 'Venda' },
  { cProd: '1001', xProd: 'ACUCAR CRISTAL ESP. DOCE DIA 10X2KG', NCM: '17019900',
    CFOP: '6101', CST: '020', tot_itens: 95, tot_nfes: 28, vlr_total: 5624100.00,
    aliq_prod: 12, pRedBC: null, UF_destino: 'SP', tipo_operacao: 'Venda' },
] as const;

interface ClienteRecord { id: string; nome: string }
interface ContribuinteRecord { id: string; nome_razao_social: string; cpf_cnpj: string | null }

const getDefaultDates = () => {
  const now = new Date();
  return {
    inicio: format(startOfMonth(now), 'yyyy-MM-dd'),
    fim: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
};

type StatusFilter = 'all' | 'validated' | 'pending';

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

  // Decisões locais — chave: groupKey (cProd|NCM|UF)
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

  // Mock query — sem ufFiltro na key (filtro aplicado no useMemo)
  const { data: mockItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['icms-saidas-grouped', selectedContribuinte, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return ALL_MOCK_ITEMS;
    },
    enabled: searchTriggered && !!selectedContribuinte,
    staleTime: Infinity,
  });

  // Itens agrupados (com UF na chave) e filtrados por UF + status
  const groupedItems = useMemo(() => {
    if (!mockItems) return [];

    const allGroups: (DifalGroupedItem & { tipo_operacao: string; uf_destino: string })[] = mockItems.map((item) => {
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

  // Stats globais (respeitam ufFiltro mas não statusFilter)
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

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };

  const handleGroupClick = (
    group: DifalGroupedItem & { tipo_operacao: string; uf_destino: string },
  ) => {
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

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const headerActions = (
    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
      Beta
    </Badge>
  );

  return (
    <DevLayout
      title="ICMS das Saídas"
      subtitle="Classificação fiscal de produtos em saídas interestaduais"
      headerActions={headerActions}
    >
      {/* Filtros */}
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
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
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
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_razao_social}
                    </SelectItem>
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
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
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

      {/* Estatísticas */}
      {searchTriggered && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card
            className={cn(
              'border-amber-200 bg-amber-50/50 cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'pending' && 'ring-2 ring-amber-500 ring-offset-2',
            )}
            onClick={() => handleStatusFilterChange('pending')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.pendentes}</p>
                <p className="text-xs text-amber-600">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'border-green-200 bg-green-50/50 cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'validated' && 'ring-2 ring-green-500 ring-offset-2',
            )}
            onClick={() => handleStatusFilterChange('validated')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.validados}</p>
                <p className="text-xs text-green-600">Validados</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'border-slate-200 cursor-pointer transition-all hover:shadow-md',
              statusFilter === 'all' && 'ring-2 ring-primary ring-offset-2',
            )}
            onClick={() => handleStatusFilterChange('all')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total de produtos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botões de ação (desabilitados — back-end pendente) */}
      {searchTriggered && groupedItems.length > 0 && (
        <TooltipProvider>
          <div className="flex justify-end gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    variant="default"
                    size="sm"
                    disabled
                    className="gap-2 bg-teal-600 hover:bg-teal-700 pointer-events-none"
                  >
                    <Save className="h-4 w-4" />
                    Salvar alterações
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Funcionalidade em desenvolvimento</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" disabled className="gap-2 pointer-events-none">
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Funcionalidade em desenvolvimento</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* Grid */}
      {searchTriggered && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              Produtos para classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingItems ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : groupedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado para os filtros aplicados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[70px]">UF</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-[100px]">NCM</TableHead>
                      <TableHead className="w-[80px]">CFOP</TableHead>
                      <TableHead className="w-[150px]">Tributação</TableHead>
                      <TableHead className="w-[120px]">MVA/ST</TableHead>
                      <TableHead className="w-[160px]">Tipo Operação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedItems.map((group) => (
                      <TableRow
                        key={group.groupKey}
                        className={cn(
                          group.status === 'pendente'
                            ? 'cursor-pointer hover:bg-amber-50'
                            : 'cursor-pointer hover:bg-slate-50',
                        )}
                        onClick={() => handleGroupClick(group)}
                      >
                        <TableCell>
                          {group.status === 'validado' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {group.uf_destino}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-900 line-clamp-1">{group.xProd}</p>
                            <p className="text-xs text-slate-500">Cód: {group.cod_produto}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{group.cod_ncm}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{group.cfop}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-slate-600">CST:</span>{' '}
                            <span className="font-mono">{group.cst_icms || '—'}</span>
                            {group.aliq_icms !== null && group.aliq_icms !== undefined && (
                              <>
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="font-mono">{group.aliq_icms}%</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-400">—</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{group.tipo_operacao}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty inicial */}
      {!searchTriggered && (
        <Card className="border-slate-200 border-dashed">
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">ICMS das Saídas</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Selecione um cliente, contribuinte e período para carregar os produtos de notas fiscais de saída e
              iniciar a classificação fiscal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
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
