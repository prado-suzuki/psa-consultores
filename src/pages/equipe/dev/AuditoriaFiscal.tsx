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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DifalAuditModal } from '@/components/equipe/dev/DifalAuditModal';
import { useToast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL, isProductionEnvironment } from '@/config/api';
import { cn } from '@/lib/utils';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DifalItem,
  DifalModo,
  ClassificacoesBuscarResponse,
  NFeRecord,
  NFeProduto,
} from '@/types/difal';
import {
  Search,
  X,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  CalendarIcon,
  Download,
} from 'lucide-react';

// Clientes permitidos para esta ferramenta
const CLIENTES_PERMITIDOS = ['BARRACOL', 'CROPODIA'];

// Datas padrão: primeiro e último dia do mês atual
const getDefaultDates = () => {
  const now = new Date();
  const firstDay = startOfMonth(now);
  const lastDay = endOfMonth(now);
  return {
    inicio: format(firstDay, 'yyyy-MM-dd'),
    fim: format(lastDay, 'yyyy-MM-dd'),
  };
};

// Tipos para as queries do Supabase
interface ClienteRecord {
  id: string;
  nome: string;
}

interface ContribuinteRecord {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
}

// Tipo de resposta paginada da API
interface NFeApiResponse {
  items: NFeRecord[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

const AuditoriaFiscal = () => {
  const { toast } = useToast();
  const { fetchWithAuth } = useApiAuth();

  // Datas padrão do mês atual
  const defaultDates = getDefaultDates();

  // Estados de filtros (formato yyyy-MM-dd)
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>('');
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio);
  const [dataFim, setDataFim] = useState(defaultDates.fim);
  const [modo, setModo] = useState<DifalModo>('icms');
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Estado do modal
  const [selectedItem, setSelectedItem] = useState<DifalItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Determinar tabela baseado no ambiente
  const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
  const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';

  // Query: Listar clientes (filtrado para Barracol e Cropodia)
  const { data: clientes, isLoading: isLoadingClientes } = useQuery({
    queryKey: ['difal-clientes', clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      // Filtrar apenas clientes permitidos
      const filtered = (data || []).filter((c) =>
        CLIENTES_PERMITIDOS.some(
          (nome) => c.nome.toUpperCase().includes(nome)
        )
      );
      return filtered as ClienteRecord[];
    },
  });

  // Query: Listar contribuintes do cliente
  const { data: contribuintes, isLoading: isLoadingContribuintes } = useQuery({
    queryKey: ['difal-contribuintes', selectedCliente, contribuinteTable],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedCliente)
        .order('nome_razao_social');

      if (error) throw error;
      return (data || []) as ContribuinteRecord[];
    },
    enabled: !!selectedCliente,
  });

  // Auto-selecionar contribuinte quando há apenas um
  useEffect(() => {
    if (contribuintes?.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [contribuintes, selectedContribuinte]);

  // Query: Buscar NFes do período
  const {
    data: nfesData,
    isLoading: isLoadingNFes,
    error: nfesError,
  } = useQuery({
    queryKey: ['difal-nfes', selectedContribuinte, dataInicio, dataFim],
    queryFn: async () => {
      if (!selectedContribuinte) {
        throw new Error('Contribuinte não selecionado');
      }

      // Usar ID do contribuinte (UUID) como na Consulta XMLs
      const url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo=entrada`;

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error('Erro ao buscar notas fiscais');
      }

      return response.json() as Promise<NFeApiResponse>;
    },
    enabled: searchTriggered && !!selectedContribuinte,
  });

  // Função para achatar NFes em itens
  const flattenNFeItems = (
    nfes: NFeRecord[],
    cnpj: string
  ): DifalItem[] => {
    return nfes.flatMap((nfe) =>
      (nfe.produtos || []).map((prod: NFeProduto) => ({
        id_contribuinte: cnpj,
        cod_produto: prod.cProd,
        cod_ncm: prod.NCM,
        xProd: prod.xProd,
        vProd: prod.vProd,
        cfop: prod.CFOP,
        uf_emit: nfe.emit?.UF || '??',
        uf_dest: nfe.dest?.UF || '??',
        cst_icms: prod.ICMS?.CST || null,
        aliq_icms: prod.ICMS?.pICMS || null,
        cst_pis: prod.PIS?.CST || null,
        cst_cofins: prod.COFINS?.CST || null,
        chave_nfe: nfe.chave_nfe,
        nItem: prod.nItem,
      }))
    );
  };

  // Itens achatados - corrigido para usar .items
  const flatItems = useMemo(() => {
    if (!nfesData?.items) return [];
    
    // Buscar CNPJ para usar como id_contribuinte na classificação
    const contribuinteData = contribuintes?.find(
      (c) => c.id === selectedContribuinte
    );
    const cnpj = contribuinteData?.cpf_cnpj?.replace(/\D/g, '') || selectedContribuinte;
    
    return flattenNFeItems(nfesData.items, cnpj);
  }, [nfesData, contribuintes, selectedContribuinte]);

  // Query: Buscar classificações existentes
  const { data: classificacoes, isLoading: isLoadingClassificacoes } = useQuery({
    queryKey: ['difal-classificacoes', flatItems.map((i) => `${i.cod_produto}|${i.cod_ncm}`)],
    queryFn: async () => {
      if (flatItems.length === 0) return {};

      const payload = {
        itens: flatItems.map((item) => ({
          id_contribuinte: item.id_contribuinte,
          cod_produto: item.cod_produto,
          cod_ncm: item.cod_ncm,
        })),
      };

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/classificacoes/buscar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar classificações');
      }

      return response.json() as Promise<ClassificacoesBuscarResponse>;
    },
    enabled: flatItems.length > 0,
  });

  // Merge itens com classificações
  const itemsWithStatus: DifalItem[] = useMemo(() => {
    if (!classificacoes) return flatItems;

    return flatItems.map((item) => {
      const chave = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
      const classificacao = classificacoes[chave];
      return {
        ...item,
        status: classificacao ? 'validado' : 'pendente',
        classificacao,
      };
    });
  }, [flatItems, classificacoes]);

  // Handlers
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

  const handleExportExcel = () => {
    toast({
      title: 'Exportação Teste Concluída',
      description: 'O endpoint de exportação será implementado em breve.',
    });
  };

  const handleItemClick = (item: DifalItem) => {
    if (item.status === 'pendente') {
      setSelectedItem(item);
      setModalOpen(true);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Estatísticas
  const stats = useMemo(() => {
    const validados = itemsWithStatus.filter((i) => i.status === 'validado').length;
    const pendentes = itemsWithStatus.filter((i) => i.status === 'pendente').length;
    const total = itemsWithStatus.length;
    return { validados, pendentes, total };
  }, [itemsWithStatus]);

  const isLoading = isLoadingNFes || isLoadingClassificacoes;

  // UF destino para o modal
  const ufDestino = useMemo(() => {
    if (itemsWithStatus.length > 0) {
      return itemsWithStatus[0].uf_dest;
    }
    return 'MT'; // Default
  }, [itemsWithStatus]);

  return (
    <DevLayout
      title="DIFAL Inteligente"
      subtitle="Auditoria e classificação fiscal de itens"
    >
      {/* Filtros */}
      <Card className="mb-6 border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-500" />
            Filtros de Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase">
                Cliente
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte - apenas nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase">
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((contribuinte) => (
                    <SelectItem key={contribuinte.id} value={contribuinte.id}>
                      {contribuinte.nome_razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início - Calendar + Popover */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase">
                Data Início
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 px-3 text-left font-normal justify-start",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataInicio 
                      ? format(parse(dataInicio, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio ? parse(dataInicio, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => {
                      setDataInicio(date ? format(date, "yyyy-MM-dd") : "");
                      setSearchTriggered(false);
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim - Calendar + Popover */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 uppercase">
                Data Fim
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 px-3 text-left font-normal justify-start",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataFim 
                      ? format(parse(dataFim, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim ? parse(dataFim, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => {
                      setDataFim(date ? format(date, "yyyy-MM-dd") : "");
                      setSearchTriggered(false);
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Toggle de Modo e Botões */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <ToggleGroup
              type="single"
              value={modo}
              onValueChange={(value) => value && setModo(value as DifalModo)}
              className="bg-slate-100 p-1 rounded-lg"
            >
              <ToggleGroupItem
                value="icms"
                className="data-[state=on]:bg-white data-[state=on]:shadow-sm px-4"
              >
                <Calculator className="h-4 w-4 mr-2" />
                ICMS-ST
              </ToggleGroupItem>
              <ToggleGroupItem
                value="pis"
                className="data-[state=on]:bg-white data-[state=on]:shadow-sm px-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                PIS/COFINS
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
              <Button
                onClick={handleSearch}
                disabled={!selectedContribuinte || isLoading}
                className="bg-teal-600 hover:bg-teal-700 gap-2"
              >
                <Search className="h-4 w-4" />
                Buscar Itens
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {searchTriggered && itemsWithStatus.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total de Itens</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
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
          <Card className="border-amber-200 bg-amber-50/50">
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
        </div>
      )}

      {/* Botão de Exportação */}
      {searchTriggered && itemsWithStatus.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      )}

      {/* Grid de Itens */}
      {searchTriggered && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              Itens para Classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : nfesError ? (
              <div className="p-6 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Erro ao carregar itens</p>
              </div>
            ) : itemsWithStatus.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum item encontrado para o período selecionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[80px]">Origem</TableHead>
                      <TableHead className="w-[120px] text-right">Valor</TableHead>
                      <TableHead className="w-[150px]">Tributação Entrada</TableHead>
                      {modo === 'icms' ? (
                        <TableHead className="w-[120px]">MVA/ST</TableHead>
                      ) : (
                        <TableHead className="w-[120px]">Natureza</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithStatus.map((item, index) => (
                      <TableRow
                        key={`${item.chave_nfe}-${item.nItem}-${index}`}
                        className={`
                          ${item.status === 'pendente' ? 'cursor-pointer hover:bg-amber-50' : 'hover:bg-slate-50'}
                        `}
                        onClick={() => handleItemClick(item)}
                      >
                        <TableCell>
                          {item.status === 'validado' ? (
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
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-900 line-clamp-1">
                              {item.xProd}
                            </p>
                            <div className="flex gap-2 text-xs text-slate-500">
                              <span>Cód: {item.cod_produto}</span>
                              <span>•</span>
                              <span className="font-mono">NCM: {item.cod_ncm}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.uf_emit}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.vProd)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-slate-600">CST:</span>{' '}
                            <span className="font-mono">{item.cst_icms || '—'}</span>
                            {item.aliq_icms && (
                              <>
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="font-mono">{item.aliq_icms}%</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {modo === 'icms' ? (
                            item.classificacao ? (
                              <div className="text-sm">
                                <span className="font-mono">
                                  {item.classificacao.aliquota_st}%
                                </span>
                                {item.classificacao.percentual_reducao && (
                                  <span className="text-slate-500 text-xs ml-1">
                                    (Red. {item.classificacao.percentual_reducao}%)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )
                          ) : (
                            <div className="text-sm font-mono">
                              {item.cst_pis || '—'} / {item.cst_cofins || '—'}
                            </div>
                          )}
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

      {/* Empty State Inicial */}
      {!searchTriggered && (
        <Card className="border-slate-200 border-dashed">
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              DIFAL Inteligente
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Selecione um contribuinte e período para carregar os itens de notas
              fiscais e iniciar a auditoria de classificação fiscal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Auditoria */}
      <DifalAuditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={selectedItem}
        ufDestino={ufDestino}
      />

    </DevLayout>
  );
};

export default AuditoriaFiscal;
