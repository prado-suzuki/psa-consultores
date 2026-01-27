import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { useEFDOverview } from '@/hooks/useEFDData';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { EFDAnalysisModal } from '@/components/equipe/dev/EFDAnalysisModal';
import { getTableName } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import {
  FileText,
  Search,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Loader2,
  Filter,
  Eraser,
  BarChart3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { EFDArquivo } from '@/types/efd';

const ConsultaEFDICMS = () => {
  // Estados de modal
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedArquivo, setSelectedArquivo] = useState<EFDArquivo | null>(null);

  // Calcular datas padrão: 5 anos atrás até mês atual
  const getDefaultDates = () => {
    const now = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(now.getFullYear() - 5);
    
    return {
      inicio: { month: fiveYearsAgo.getMonth(), year: fiveYearsAgo.getFullYear() },
      fim: { month: now.getMonth(), year: now.getFullYear() },
    };
  };

  const defaultDates = getDefaultDates();

  // Estados de filtros de busca
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>("");
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(defaultDates.inicio);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Query de clientes - usa tabela correta conforme ambiente
  const clienteTable = getTableName('cliente');
  const contribuinteTable = getTableName('contribuinte');
  
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-efd-icms", clienteTable],
    queryFn: async () => {
      const { data } = await supabase
        .from(clienteTable as 'cliente')
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as unknown as { id: string; nome: string }[];
    },
  });

  // Query de contribuintes (filtrado por cliente selecionado)
  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ["contribuintes-efd-icms", contribuinteTable, selectedCliente],
    queryFn: async () => {
      let query = supabase
        .from(contribuinteTable as 'contribuinte')
        .select("id, nome_razao_social, cpf_cnpj, cliente_id")
        .order("nome_razao_social");
      
      if (selectedCliente) {
        query = query.eq("cliente_id", selectedCliente);
      }
      const { data } = await query;
      return (data || []) as unknown as { id: string; nome_razao_social: string; cpf_cnpj: string | null; cliente_id: string }[];
    },
  });

  // Auto-selecionar contribuinte quando cliente tem apenas um
  useEffect(() => {
    if (selectedCliente && contribuintes && contribuintes.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [selectedCliente, contribuintes, selectedContribuinte]);

  // Obter CNPJ do contribuinte selecionado (apenas números)
  const cnpjContribuinte = useMemo(() => {
    const contrib = contribuintes?.find(c => c.id === selectedContribuinte);
    return contrib?.cpf_cnpj?.replace(/\D/g, '') || '';
  }, [contribuintes, selectedContribuinte]);

  // Converter mês/ano para string de data para a API
  const dataInicio = monthYearToDateString(mesInicio, 'start');
  const dataFim = monthYearToDateString(mesFim, 'end');

  // Hooks de dados - busca do mock no Storage
  const { 
    data: overview, 
    isLoading: loadingOverview, 
    error: errorOverview,
    refetch: refetchOverview 
  } = useEFDOverview({
    enabled: searchTriggered && !!cnpjContribuinte,
    cnpj: cnpjContribuinte,
    tipo: 'icms', // Usar dados mockados do Storage
  });

  // Filtrar arquivos localmente por período (intersecção)
  const arquivosFiltrados = useMemo(() => {
    if (!overview?.arquivos) return [];
    
    if (!dataInicio && !dataFim) return overview.arquivos;
    
    return overview.arquivos.filter(arquivo => {
      const arquivoInicio = new Date(arquivo.DT_INI);
      const arquivoFim = new Date(arquivo.DT_FIN);
      const filtroInicio = dataInicio ? new Date(dataInicio) : null;
      const filtroFim = dataFim ? new Date(dataFim) : null;
      
      const depoisDoInicio = !filtroInicio || arquivoFim >= filtroInicio;
      const antesDoFim = !filtroFim || arquivoInicio <= filtroFim;
      
      return depoisDoInicio && antesDoFim;
    });
  }, [overview?.arquivos, dataInicio, dataFim]);

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

  // Handler para analisar arquivo
  const handleAnalisar = (arquivo: EFDArquivo) => {
    setSelectedArquivo(arquivo);
    setAnalysisModalOpen(true);
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
    setMesInicio(null);
    setMesFim(null);
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

  // Formatar moeda - trata null/undefined como traço
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '—';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  // Formatar período
  const formatPeriodo = (dtIni: string, dtFin: string) => {
    const formatDate = (date: string) => {
      if (!date) return '';
      if (date.includes('-')) {
        const [y, m, d] = date.split('-');
        return `${d}/${m}/${y}`;
      }
      return date;
    };
    return `${formatDate(dtIni)} a ${formatDate(dtFin)}`;
  };

  // Blocos disponíveis para o arquivo selecionado
  const blocosDisponiveis = overview?.blocos_disponiveis || {};

  return (
    <DevLayout 
      title="Consulta EFD ICMS" 
      subtitle="Análise e auditoria de arquivos SPED ICMS/IPI"
    >
      {/* Card de Filtros de Busca */}
      <Card className="mb-6 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Filter className="h-5 w-5" />
            <span className="uppercase text-sm tracking-wider font-bold text-slate-800 dark:text-slate-200">
              Filtros de Busca
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Cliente */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Cliente
              </label>
              <Select 
                value={selectedCliente} 
                onValueChange={(value) => {
                  setSelectedCliente(value);
                  setSelectedContribuinte("");
                  setSearchTriggered(false);
                }}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Contribuinte
              </label>
              <Select 
                value={selectedContribuinte} 
                onValueChange={(value) => {
                  setSelectedContribuinte(value);
                  setSearchTriggered(false);
                }}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data de Início
              </label>
              <div className="relative">
                <MonthYearPicker
                  value={mesInicio}
                  onChange={setMesInicio}
                  placeholder="Selecione"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Data Fim */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data Fim
              </label>
              <div className="relative">
                <MonthYearPicker
                  value={mesFim}
                  onChange={setMesFim}
                  placeholder="Selecione"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Barra de Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="ghost" 
              onClick={handleClearFilters}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button 
              onClick={handleSearch} 
              disabled={!selectedContribuinte}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
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

      {/* Tabela de Resultados */}
      <Card className="shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        {/* Header com CNPJ */}
        {overview?.cnpj && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            {/* Lado Esquerdo - CNPJ */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <Building2 className="h-5 w-5 text-primary" />
                CNPJ: <span className="text-slate-900 dark:text-white">{formatCNPJ(overview.cnpj)}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => refetchOverview()}
                disabled={loadingOverview}
              >
                {loadingOverview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-0">
          {!searchTriggered ? (
            // Estado inicial
            <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                Nenhum arquivo listado
              </h3>
              <p className="text-base text-slate-500 max-w-xs mt-2">
                Utilize os filtros acima e clique em "Buscar" para carregar os arquivos EFD ICMS.
              </p>
            </div>
          ) : loadingOverview ? (
            // Loading
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : arquivosFiltrados.length > 0 ? (
            // Tabela com scroll
            <div 
              className={cn(
                "overflow-x-auto",
                "[&::-webkit-scrollbar]:h-3",
                "[&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800",
                "[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600",
                "[&::-webkit-scrollbar-thumb]:rounded-full"
              )}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Arquivo
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right">
                      ICMS
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right">
                      ICMS ST
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-center w-56">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {arquivosFiltrados.map((arquivo) => (
                    <tr 
                      key={arquivo.ID_ARQUIVO} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">
                              {arquivo.NOME}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-mono">
                              ID: {arquivo.ID_ARQUIVO}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatPeriodo(arquivo.DT_INI, arquivo.DT_FIN)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={arquivo.TIPO_ESCRIT === 0 ? 'default' : 'secondary'}
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            arquivo.TIPO_ESCRIT === 0 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {arquivo.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right font-mono">
                        {formatCurrency(arquivo.icms_devido)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right font-mono">
                        {formatCurrency(arquivo.icms_st_devido)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-2">
                            <EFDExportDialog
                              arquivo={arquivo}
                              blocosDisponiveis={blocosDisponiveis}
                              tipo="icms"
                            />
                            
                            <Button 
                              size="sm"
                              onClick={() => handleAnalisar(arquivo)}
                              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Analisar
                            </Button>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Nenhum arquivo encontrado
            <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
              <FileText className="h-12 w-12 text-slate-400 mb-3" />
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Nenhum arquivo encontrado
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Verifique os filtros e tente novamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Análise */}
      <EFDAnalysisModal
        open={analysisModalOpen}
        onOpenChange={setAnalysisModalOpen}
        arquivo={selectedArquivo}
        blocosDisponiveis={blocosDisponiveis}
        cnpj={overview?.cnpj || ''}
        tipo="icms"
      />
    </DevLayout>
  );
};

export default ConsultaEFDICMS;
