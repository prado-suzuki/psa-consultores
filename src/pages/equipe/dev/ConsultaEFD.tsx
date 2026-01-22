import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { useEFDOverview, useEFDDetail } from '@/hooks/useEFDData';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { generateColumnsFromData, formatEFDValue, EFD_COLUMN_GROUPS } from '@/constants/efdConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileText,
  ArrowLeft,
  Search,
  Info,
  FileSpreadsheet,
  Calendar,
  Building2,
  RefreshCw,
  Loader2,
  Filter,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EFDViewMode, EFDArquivo, BlocoRegistro } from '@/types/efd';

const ConsultaEFD = () => {
  // Estados de visualização
  const [viewMode, setViewMode] = useState<EFDViewMode>('lista');
  const [selectedArquivo, setSelectedArquivo] = useState<EFDArquivo | null>(null);
  const [selectedBloco, setSelectedBloco] = useState<string>('');
  const [selectedRegistro, setSelectedRegistro] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Estados de filtros de busca
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Query de clientes
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-efd"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  // Query de contribuintes (filtrado por cliente selecionado)
  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ["contribuintes-efd", selectedCliente],
    queryFn: async () => {
      let query = supabase
        .from("contribuinte")
        .select("id, nome_razao_social, cpf_cnpj, cliente_id")
        .order("nome_razao_social");
      
      if (selectedCliente) {
        query = query.eq("cliente_id", selectedCliente);
      }
      const { data } = await query;
      return data || [];
    },
  });

  // Obter CNPJ do contribuinte selecionado (apenas números)
  const cnpjContribuinte = useMemo(() => {
    const contrib = contribuintes?.find(c => c.id === selectedContribuinte);
    return contrib?.cpf_cnpj?.replace(/\D/g, '') || '';
  }, [contribuintes, selectedContribuinte]);

  // Hooks de dados - só busca após usuário acionar busca
  const { 
    data: overview, 
    isLoading: loadingOverview, 
    error: errorOverview,
    refetch: refetchOverview 
  } = useEFDOverview({
    enabled: searchTriggered && !!cnpjContribuinte,
    cnpj: cnpjContribuinte,
    dataInicio: dataInicio ? format(dataInicio, 'yyyy-MM-dd') : undefined,
    dataFim: dataFim ? format(dataFim, 'yyyy-MM-dd') : undefined,
  });

  // Hook de detalhes com paginação
  const { 
    data: detail, 
    isLoading: loadingDetail, 
    error: errorDetail 
  } = useEFDDetail(
    selectedArquivo && selectedRegistro ? {
      cnpj: overview?.cnpj || selectedArquivo.CNPJ,
      idArquivo: selectedArquivo.ID_ARQUIVO,
      registro: selectedRegistro,
      page: currentPage,
      limit: 100,
    } : undefined
  );

  // Resetar página quando mudar registro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRegistro]);

  // Quando overview carregar, selecionar primeiro bloco
  useEffect(() => {
    if (overview?.blocos_disponiveis) {
      const blocos = Object.keys(overview.blocos_disponiveis);
      if (blocos.length > 0 && !selectedBloco) {
        setSelectedBloco(blocos[0]);
      }
    }
  }, [overview, selectedBloco]);

  // Quando bloco mudar, selecionar primeiro registro
  useEffect(() => {
    if (selectedBloco && overview?.blocos_disponiveis[selectedBloco]) {
      const registros = overview.blocos_disponiveis[selectedBloco];
      if (registros.length > 0) {
        setSelectedRegistro(registros[0].codigo);
        setActiveTab(registros[0].codigo);
      }
    }
  }, [selectedBloco, overview]);

  // Gerar colunas dinâmicas a partir dos dados (já ordenadas por grupo)
  const dynamicColumns = useMemo(() => {
    if (!detail?.dados || detail.dados.length === 0) return [];
    return generateColumnsFromData(detail.dados);
  }, [detail]);

  // Agrupar colunas por categoria para renderizar separação visual
  const columnGroups = useMemo(() => {
    if (dynamicColumns.length === 0) return [];
    
    const groups: { name: string; columns: typeof dynamicColumns }[] = [];
    let currentGroup = '';
    
    dynamicColumns.forEach(col => {
      if (col.group !== currentGroup) {
        currentGroup = col.group;
        groups.push({ name: col.group, columns: [col] });
      } else {
        groups[groups.length - 1].columns.push(col);
      }
    });
    
    return groups;
  }, [dynamicColumns]);

  // Filtrar dados com busca
  const filteredData = useMemo(() => {
    if (!detail?.dados) return [];
    if (!searchTerm) return detail.dados;
    
    const term = searchTerm.toLowerCase();
    return detail.dados.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
  }, [detail, searchTerm]);

  // Handler para analisar arquivo
  const handleAnalisar = (arquivo: EFDArquivo) => {
    setSelectedArquivo(arquivo);
    setViewMode('analise');
    setCurrentPage(1);
  };

  // Handler para voltar à lista
  const handleVoltar = () => {
    setViewMode('lista');
    setSelectedArquivo(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Handler para buscar arquivos
  const handleSearch = () => {
    if (!selectedContribuinte) {
      toast({
        title: "Selecione um contribuinte",
        description: "É necessário selecionar um contribuinte para buscar os arquivos.",
        variant: "destructive",
      });
      return;
    }
    if (!cnpjContribuinte) {
      toast({
        title: "CNPJ não encontrado",
        description: "O contribuinte selecionado não possui CNPJ cadastrado.",
        variant: "destructive",
      });
      return;
    }
    setSearchTriggered(true);
  };

  // Handler para limpar filtros
  const handleClearFilters = () => {
    setSelectedCliente("");
    setSelectedContribuinte("");
    setDataInicio(undefined);
    setDataFim(undefined);
    setSearchTriggered(false);
  };

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  // Formatar moeda
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue || 0);
  };

  // Exibir erro se houver
  useEffect(() => {
    if (errorOverview) {
      const errorMessage = errorOverview instanceof Error ? errorOverview.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar dados',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [errorOverview]);

  // Blocos disponíveis
  const blocosDisponiveis = overview?.blocos_disponiveis 
    ? Object.keys(overview.blocos_disponiveis) 
    : [];

  // Registros do bloco selecionado
  const registrosBloco = selectedBloco && overview?.blocos_disponiveis[selectedBloco]
    ? overview.blocos_disponiveis[selectedBloco]
    : [];

  // Paginação
  const totalPaginas = detail?.paginacao?.total_paginas || 1;
  const podeIrAnterior = currentPage > 1;
  const podeIrProxima = currentPage < totalPaginas;

  return (
    <DevLayout 
      title="Consulta EFD Contribuições" 
      subtitle="Análise de arquivos SPED Contribuições"
      headerActions={
        viewMode === 'analise' && (
          <Button variant="outline" size="sm" onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        )
      }
    >
      {/* Card de Filtros de Busca - sempre visível */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Cliente */}
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Cliente
              </label>
              <Select value={selectedCliente} onValueChange={(value) => {
                setSelectedCliente(value);
                setSelectedContribuinte("");
                setSearchTriggered(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingClientes ? "Carregando..." : "Selecione o cliente"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <div className="flex-1 min-w-[220px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Contribuinte
              </label>
              <Select value={selectedContribuinte} onValueChange={(value) => {
                setSelectedContribuinte(value);
                setSearchTriggered(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingContribuintes ? "Carregando..." : "Selecione o contribuinte"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {contribuintes?.map((contrib) => (
                    <SelectItem key={contrib.id} value={contrib.id}>
                      {contrib.nome_razao_social} {contrib.cpf_cnpj ? `(${formatCNPJ(contrib.cpf_cnpj)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="w-[160px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Data Início
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="w-[160px]">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Data Fim
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Barra de Ações */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="ghost" onClick={handleClearFilters}>
              Limpar Filtros
            </Button>
            <Button 
              onClick={handleSearch} 
              disabled={!selectedContribuinte}
              className="bg-primary hover:bg-primary/90"
            >
              {loadingOverview && searchTriggered ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar Arquivos
            </Button>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'lista' ? (
        searchTriggered ? (
        <div className="space-y-6">
          {/* Card de Resultados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Arquivos EFD Contribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* CNPJ Info */}
              {overview?.cnpj && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Building2 className="h-4 w-4" />
                  <span>CNPJ: {formatCNPJ(overview.cnpj)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => refetchOverview()}
                    disabled={loadingOverview}
                  >
                    {loadingOverview ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              {/* Tabela de Arquivos */}
              {loadingOverview ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : overview?.arquivos && overview.arquivos.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Arquivo</TableHead>
                        <TableHead className="font-semibold">Período</TableHead>
                        <TableHead className="font-semibold">Tipo</TableHead>
                        <TableHead className="font-semibold">UF</TableHead>
                        <TableHead className="font-semibold text-right">PIS Devido</TableHead>
                        <TableHead className="font-semibold text-right">COFINS Devido</TableHead>
                        <TableHead className="font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.arquivos.map((arquivo) => (
                        <TableRow key={arquivo.ID_ARQUIVO} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{arquivo.NOME}</p>
                                <p className="text-xs text-muted-foreground">{arquivo.ID_ARQUIVO}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {arquivo.DT_INI} a {arquivo.DT_FIN}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={arquivo.TIPO_ESCRIT === 0 ? 'default' : 'secondary'}>
                              {arquivo.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{arquivo.UF}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(arquivo.pis_devido)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(arquivo.cofins_devido)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleAnalisar(arquivo)}
                            >
                              Analisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum arquivo encontrado</p>
                  <p className="text-sm mt-1">Verifique os filtros e tente novamente.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Selecione os filtros e clique em "Buscar Arquivos"</p>
                <p className="text-sm mt-1">Escolha pelo menos um contribuinte para iniciar a busca.</p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {/* Header da Análise */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedArquivo?.NOME}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Período: {selectedArquivo?.DT_INI} a {selectedArquivo?.DT_FIN}
                    <Badge variant="outline" className="ml-2">
                      {selectedArquivo?.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}
                    </Badge>
                    {selectedArquivo?.UF && (
                      <Badge variant="outline" className="ml-2">
                        {selectedArquivo.UF}
                      </Badge>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nos dados..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-[220px]"
                    />
                  </div>
                  
                  <EFDExportDialog
                    data={filteredData}
                    registro={selectedRegistro}
                    idArquivo={selectedArquivo?.ID_ARQUIVO || ''}
                    disabled={loadingDetail || filteredData.length === 0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navegação em Dois Níveis: Blocos + Registros */}
          <Card className="overflow-hidden">
            {/* NÍVEL 1: Tabs de Blocos */}
            <div className="border-b bg-muted/50">
              <ScrollArea className="w-full">
                <div className="flex items-center px-2">
                  {blocosDisponiveis.map(bloco => (
                    <button
                      key={bloco}
                      onClick={() => setSelectedBloco(bloco)}
                      className={cn(
                        "px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
                        selectedBloco === bloco
                          ? "border-primary text-primary bg-background"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      Bloco {bloco}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* NÍVEL 2: Tabs de Registros do Bloco */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              setSelectedRegistro(value);
              setCurrentPage(1);
            }}>
              <div className="border-b bg-background">
                <ScrollArea className="w-full">
                  <TabsList className="h-9 bg-transparent p-0 justify-start gap-0">
                    {registrosBloco.map(reg => (
                      <TabsTrigger
                        key={reg.codigo}
                        value={reg.codigo}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-muted/30 px-3 py-1.5 text-xs"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-mono font-medium">{reg.codigo.replace('REG_', '')}</span>
                          {reg.descricao && (
                            <span className="text-[10px] text-muted-foreground max-w-[100px] truncate">
                              {reg.descricao}
                            </span>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Conteúdo da Tab */}
              <TabsContent value={activeTab} className="m-0">
                <CardContent className="p-0">
                  {loadingDetail ? (
                    <div className="p-6 space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : errorDetail ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Info className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Erro ao carregar detalhes</p>
                      <p className="text-sm mt-1">
                        {errorDetail instanceof Error ? errorDetail.message : 'Erro desconhecido'}
                      </p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nenhum registro encontrado</p>
                      {searchTerm && (
                        <p className="text-sm mt-1">Tente ajustar o termo de busca.</p>
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="min-w-max">
                        <Table>
                          <TableHeader>
                            {/* Header de Grupos (primeira linha) */}
                            <TableRow className="bg-muted/70 border-b-2 border-muted">
                              {columnGroups.map((group, groupIdx) => (
                                <TableHead
                                  key={group.name}
                                  colSpan={group.columns.length}
                                  className={cn(
                                    "text-center font-semibold text-xs py-1.5 bg-muted/50",
                                    groupIdx > 0 && "border-l-2 border-muted-foreground/20"
                                  )}
                                >
                                  {group.name}
                                </TableHead>
                              ))}
                            </TableRow>
                            
                            {/* Header de Colunas (segunda linha) */}
                            <TableRow className="bg-muted/30">
                              {dynamicColumns.map((col, idx) => {
                                // Verificar se é primeira coluna do grupo
                                const isFirstOfGroup = idx === 0 || 
                                  dynamicColumns[idx - 1].group !== col.group;
                                
                                return (
                                  <TableHead
                                    key={col.id}
                                    className={cn(
                                      "whitespace-nowrap text-xs font-medium py-2",
                                      isFirstOfGroup && idx > 0 && "border-l-2 border-muted-foreground/20"
                                    )}
                                  >
                                    {col.label}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.map((row, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                {dynamicColumns.map((col, colIdx) => {
                                  const isFirstOfGroup = colIdx === 0 || 
                                    dynamicColumns[colIdx - 1].group !== col.group;
                                  
                                  return (
                                    <TableCell
                                      key={col.id}
                                      className={cn(
                                        "whitespace-nowrap text-xs py-2",
                                        isFirstOfGroup && colIdx > 0 && "border-l border-muted-foreground/10"
                                      )}
                                    >
                                      {formatEFDValue(row[col.id], col.id)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}

                  {/* Footer com info de paginação e controles */}
                  {detail?.paginacao && (
                    <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Exibindo {filteredData.length} de {detail.paginacao.total_registros} registros
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Página {detail.paginacao.page} de {detail.paginacao.total_paginas}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!podeIrAnterior || loadingDetail}
                            onClick={() => setCurrentPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!podeIrProxima || loadingDetail}
                            onClick={() => setCurrentPage(p => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </DevLayout>
  );
};

export default ConsultaEFD;
