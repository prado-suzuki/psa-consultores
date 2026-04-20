import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { useEFDOverview } from '@/hooks/useEFDData';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { EFDAnalysisModal } from '@/components/equipe/dev/EFDAnalysisModal';
import { getApiUrl, currentAmbiente } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { Checkbox } from '@/components/ui/checkbox';
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
  Download,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EFDArquivo } from '@/types/efd';
import { RequiredMark } from '@/components/ui/required-mark';

const ConsultaEFDICMS = () => {
  // Hooks
  const { fetchWithAuth } = useApiAuth();

  // Estados de modal
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedArquivo, setSelectedArquivo] = useState<EFDArquivo | null>(null);
  
  const [downloadingTxt, setDownloadingTxt] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  
  // Estados de seleção múltipla para exportação
  const [selectedArquivos, setSelectedArquivos] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
  const [selectedFilial, setSelectedFilial] = useState<string>("todas");
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(defaultDates.inicio);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-efd-icms"],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select("id, nome")
        .eq("ativo", true)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome");
      return (data || []) as unknown as { id: string; nome: string }[];
    },
  });

  // Query de contribuintes (filtrado por cliente selecionado)
  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ["contribuintes-efd-icms", selectedCliente],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select("id, nome_razao_social, cpf_cnpj, cliente_id")
        .eq("ambiente", currentAmbiente)
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

  // Interface para opções de filial
  interface FilialOption {
    codigo: string;
    nome: string;
    ie: string;
    cnpjCompleto: string;
  }

  // Extrair filiais únicas dos arquivos
  const filiaisDisponiveis = useMemo((): FilialOption[] => {
    if (!overview?.arquivos) return [];
    
    const filiaisMap = new Map<string, FilialOption>();
    
    overview.arquivos.forEach(arq => {
      const codigo = arq.num_filial || '0000';
      
      if (!filiaisMap.has(codigo)) {
        filiaisMap.set(codigo, {
          codigo,
          nome: arq.NOME || (codigo === '0000' ? 'Matriz' : `Filial ${codigo}`),
          ie: arq.IE || '',
          cnpjCompleto: arq.CNPJ,
        });
      }
    });
    
    return Array.from(filiaisMap.values())
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [overview?.arquivos]);

  // Obter dados da filial selecionada para exibição
  const filialSelecionada = useMemo(() => {
    if (selectedFilial === 'todas' || filiaisDisponiveis.length === 0) {
      return null;
    }
    return filiaisDisponiveis.find(f => f.codigo === selectedFilial) || null;
  }, [selectedFilial, filiaisDisponiveis]);

  // Filtrar arquivos localmente por filial e período (intersecção)
  const arquivosFiltrados = useMemo(() => {
    if (!overview?.arquivos) return [];
    
    let filtrados = overview.arquivos;
    
    // Filtro por filial
    if (selectedFilial && selectedFilial !== 'todas') {
      filtrados = filtrados.filter(arq => 
        (arq.num_filial || '0000') === selectedFilial
      );
    }
    
    // Filtro por período
    if (dataInicio || dataFim) {
      filtrados = filtrados.filter(arquivo => {
        const arquivoInicio = new Date(arquivo.DT_INI);
        const arquivoFim = new Date(arquivo.DT_FIN);
        const filtroInicio = dataInicio ? new Date(dataInicio) : null;
        const filtroFim = dataFim ? new Date(dataFim) : null;
        
        const depoisDoInicio = !filtroInicio || arquivoFim >= filtroInicio;
        const antesDoFim = !filtroFim || arquivoInicio <= filtroFim;
        
        return depoisDoInicio && antesDoFim;
      });
    }
    
    return filtrados;
  }, [overview?.arquivos, selectedFilial, dataInicio, dataFim]);

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

  // Handler para download individual de TXT
  const handleDownloadTxt = async (arquivo: EFDArquivo) => {
    setDownloadingTxt(arquivo.ID_ARQUIVO);
    try {
      const url = getApiUrl(`/api/v1/query/download/efd/icms/arquivo/${encodeURIComponent(arquivo.ID_ARQUIVO)}`);
      const response = await fetchWithAuth(url, {}, 60000);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao baixar arquivo`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Arquivo vazio retornado pelo servidor');
      }
      
      // Gera nome do arquivo
      const dtIni = arquivo.DT_INI.replace(/-/g, '');
      const fileName = `EFD_ICMS_${arquivo.CNPJ}_${dtIni}.txt`;
      
      // Cria link e dispara download
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlBlob);
      
      toast({
        title: 'Download concluído',
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro no download',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDownloadingTxt(null);
    }
  };

  // Handler para baixar todos os arquivos (ZIP)
  const handleDownloadAll = async () => {
    if (!cnpjContribuinte) return;
    
    setDownloadingAll(true);
    
    try {
      // Montar URL com query params opcionais
      const url = new URL(getApiUrl(`/api/v1/query/download/efd/icms/${cnpjContribuinte}`));
      if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
      if (dataFim) url.searchParams.set('data_fim', dataFim);
      
      // Usar timeout maior para downloads grandes (60s)
      const response = await fetchWithAuth(url.toString(), {}, 60000);
      
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error_message || `Erro ${response.status}`);
        }
        throw new Error(`Erro ${response.status} ao baixar arquivos`);
      }
      
      // Verificar headers informativos
      const filesFound = response.headers.get('X-Files-Found');
      const filesMissing = response.headers.get('X-Files-Missing');
      
      // Obter nome do arquivo
      const contentDisposition = response.headers.get('Content-Disposition');
      const contentType = response.headers.get('Content-Type');
      const isZip = contentType?.includes('application/zip');
      
      let filename = isZip ? `EFD_ICMS_${cnpjContribuinte}.zip` : `EFD_ICMS_${cnpjContribuinte}.txt`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }
      
      // Download do blob
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Arquivo vazio recebido do servidor');
      }
      
      // Criar link e download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Mensagem de sucesso com detalhes
      let description = `Arquivo ${filename} (${(blob.size / 1024).toFixed(1)} KB) baixado.`;
      if (filesFound && filesMissing && parseInt(filesMissing) > 0) {
        description = `${filesFound} arquivo(s) baixado(s), ${filesMissing} não encontrado(s) no storage.`;
      } else if (filesFound) {
        description = `${filesFound} arquivo(s) baixado(s) com sucesso.`;
      }
      
      toast({ title: 'Download concluído', description });
    } catch (error) {
      console.error('Erro ao baixar todos:', error);
      toast({
        title: 'Erro no download',
        description: error instanceof Error ? error.message : 'Não foi possível baixar os arquivos.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  // Handler para baixar arquivos selecionados
  const handleDownloadSelecionados = async () => {
    // Validação: precisa ter arquivos selecionados
    if (selectedArquivos.size === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione ao menos um arquivo para baixar.",
        variant: "destructive",
      });
      return;
    }
    
    // Múltiplos arquivos - usar download em lote (ZIP)
    if (selectedArquivos.size > 1) {
      await handleDownloadAll();
      return;
    }
    
    // Se apenas 1 arquivo selecionado, baixar individualmente
    const arquivoSelecionado = arquivosFiltrados.find(a => selectedArquivos.has(a.ID_ARQUIVO));
    if (arquivoSelecionado) {
      await handleDownloadTxt(arquivoSelecionado);
    }
  };

  // Handler para buscar arquivos
  const handleSearch = () => {
    const missing: string[] = [];
    if (!selectedCliente) missing.push("Cliente");
    if (!selectedContribuinte) missing.push("Contribuinte");
    if (missing.length > 0) {
      toast({
        title: "Preenchimento obrigatório",
        description: `Por favor, preencha ${missing.join(", ")} para realizar a busca.`,
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
    setSelectedFilial("todas");
    setMesInicio(null);
    setMesFim(null);
    setSearchTriggered(false);
    setSelectedArquivos(new Set()); // Limpar seleção
  };

  // ==================== Funções de Seleção Múltipla ====================
  
  // Obter IDs de todos os arquivos filtrados
  const getAllArquivoIds = (): string[] => {
    return arquivosFiltrados.map(arq => arq.ID_ARQUIVO);
  };

  // Verificar se todos estão selecionados
  const allSelected = useMemo(() => {
    const ids = getAllArquivoIds();
    return ids.length > 0 && ids.every(id => selectedArquivos.has(id));
  }, [selectedArquivos, arquivosFiltrados]);

  // Obter arquivo para exportar (quando apenas 1 selecionado)
  const arquivoParaExportar = useMemo(() => {
    if (selectedArquivos.size !== 1) return null;
    const [id] = Array.from(selectedArquivos);
    return arquivosFiltrados.find(a => a.ID_ARQUIVO === id) || null;
  }, [selectedArquivos, arquivosFiltrados]);

  // Toggle individual
  const handleToggleArquivo = (id: string) => {
    setSelectedArquivos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle todos
  const handleToggleAll = () => {
    const ids = getAllArquivoIds();
    if (allSelected) {
      // Desmarcar todos
      setSelectedArquivos(new Set());
    } else {
      // Marcar todos
      setSelectedArquivos(new Set(ids));
    }
  };

  // Handler para exportar arquivos selecionados
  const handleExportSelecionados = () => {
    if (selectedArquivos.size === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione ao menos um arquivo para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedArquivos.size === 1) {
      // Se apenas 1 selecionado, abrir modal de exportação
      setExportDialogOpen(true);
      return;
    }
    
    // Múltiplos arquivos - mostrar toast informativo
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `A exportação em lote de ${selectedArquivos.size} arquivos ainda está sendo implementada. Por enquanto, exporte cada arquivo individualmente.`,
      duration: 5000,
    });
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
      subtitle="Consulta de EFD ICMS/IPI"
    >
      <DevPageHeader
        description="A Consulta de EFD ICMS centraliza a busca e o download das **Escriturações Fiscais Digitais do ICMS e IPI** da base de dados. Utilize os filtros abaixo para consultar arquivos específicos ou analisar períodos inteiros, permitindo a análise detalhada de blocos e registros diretamente em tela, o download dos arquivos originais em lote (.zip) ou a exportação em formato Excel (.xlsx)."
        manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/"
      />

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
                Cliente <RequiredMark />
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
                Contribuinte <RequiredMark />
              </label>
              <Select 
                value={selectedContribuinte} 
                onValueChange={(value) => {
                  setSelectedContribuinte(value);
                  setSelectedFilial("todas");
                  setSearchTriggered(false);
                  setSelectedArquivos(new Set()); // Limpar seleção
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
              Limpar filtros
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
              Buscar arquivos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        {/* Header com Dropdown de Filial + CNPJ */}
        {overview?.cnpj && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              {/* Lado Esquerdo - Dropdown de Filial + CNPJ */}
              <div className="flex items-center gap-4">
                <Building2 className="h-5 w-5 text-primary" />
                
                <div className="flex flex-col">
                  {/* Dropdown de Filial */}
                  <Select 
                    value={selectedFilial} 
                    onValueChange={setSelectedFilial}
                  >
                    <SelectTrigger className="h-auto w-auto min-w-[200px] border-0 bg-transparent p-0 shadow-none gap-1.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 [&>svg]:h-4 [&>svg]:w-4">
                      <SelectValue>
                        {selectedFilial === 'todas' 
                          ? 'Todas as filiais' 
                          : filialSelecionada?.nome || 'Matriz'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50 min-w-[300px]">
                      <SelectItem value="todas">
                        <span className="font-medium">Todas as filiais</span>
                      </SelectItem>
                      {filiaisDisponiveis.map(filial => (
                        <SelectItem key={filial.codigo} value={filial.codigo}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium truncate max-w-[200px]">
                              {filial.nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({filial.codigo})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* CNPJ em tamanho menor */}
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    CNPJ: {formatCNPJ(
                      selectedFilial !== 'todas' && filialSelecionada 
                        ? filialSelecionada.cnpjCompleto 
                        : overview.cnpj
                    )}
                  </span>
                </div>
                
                {/* Botão Refresh */}
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

              {/* Lado Direito - Ações */}
              <div className="flex items-center gap-2">
                {/* Contador de selecionados */}
                {selectedArquivos.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedArquivos.size} selecionado(s)
                  </Badge>
                )}
                
                {/* Exportar Excel */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportSelecionados}
                        disabled={selectedArquivos.size === 0}
                        className="gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Exportar excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {selectedArquivos.size === 0 
                          ? "Selecione arquivos para exportar" 
                          : `Exportar ${selectedArquivos.size} arquivo(s) para Excel`
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Baixar txt */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSelecionados}
                        disabled={downloadingTxt !== null || downloadingAll || selectedArquivos.size === 0}
                        className="gap-2"
                      >
                        {(downloadingTxt !== null || downloadingAll) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Baixar txt
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {selectedArquivos.size === 0 
                          ? "Selecione arquivos para baixar" 
                          : `Baixar ${selectedArquivos.size} arquivo(s) TXT`
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
                    <th className="px-4 py-4 w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleToggleAll}
                        aria-label="Selecionar todos"
                      />
                    </th>
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
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedArquivos.has(arquivo.ID_ARQUIVO)}
                          onCheckedChange={() => handleToggleArquivo(arquivo.ID_ARQUIVO)}
                          aria-label={`Selecionar ${arquivo.NOME}`}
                        />
                      </td>
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
                        {formatCurrency(arquivo.icms_a_recolher)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right font-mono">
                        {formatCurrency(arquivo.icms_st_a_recolher)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-2">
                            {/* Download TXT */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadTxt(arquivo)}
                                  disabled={downloadingTxt === arquivo.ID_ARQUIVO}
                                >
                                  {downloadingTxt === arquivo.ID_ARQUIVO ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Baixar arquivo TXT original</p>
                              </TooltipContent>
                            </Tooltip>

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

      {/* Modal de Exportação Excel - Controlado externamente (para arquivo selecionado) */}
      {arquivoParaExportar && (
        <EFDExportDialog
          arquivo={arquivoParaExportar}
          blocosDisponiveis={blocosDisponiveis}
          tipo="icms"
          profileType="efd_icms"
          externalOpen={exportDialogOpen}
          onExternalOpenChange={setExportDialogOpen}
          hideTrigger
        />
      )}
    </DevLayout>
  );
};

export default ConsultaEFDICMS;
