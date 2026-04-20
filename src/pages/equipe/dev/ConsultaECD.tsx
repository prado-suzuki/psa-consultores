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
  Info,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { EFDArquivo } from '@/types/efd';
import { RequiredMark } from '@/components/ui/required-mark';

// --- Tooltip helpers ---
const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">
      {text}
    </TooltipContent>
  </Tooltip>
);

// --- Tooltip texts ---
const TOOLTIPS = {
  cliente: "Filtra as ECD por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  dataInicio: "Define o período inicial da busca.",
  dataFim: "Define o período final da busca.",
} as const;

// Mapeamento de COD_FIN para ECD
const COD_FIN_MAP: Record<number, string> = {
  0: 'Original',
  1: 'Substituta',
  2: 'Original de entidade que não existia na data-base',
  3: 'Substituta de entidade que não existia na data-base',
};

const ConsultaECD = () => {
  const { fetchWithAuth } = useApiAuth();

  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedArquivo, setSelectedArquivo] = useState<EFDArquivo | null>(null);
  const [downloadingTxt, setDownloadingTxt] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedArquivos, setSelectedArquivos] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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

  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>("");
  const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(defaultDates.inicio);
  const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-efd-ecd"],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select("id, nome")
        .eq("ativo", true)
        .eq("ambiente", currentAmbiente)
        .order("nome");
      return (data || []) as unknown as { id: string; nome: string }[];
    },
  });

  const { data: contribuintes, isLoading: loadingContribuintes } = useQuery({
    queryKey: ["contribuintes-efd-ecd", selectedCliente],
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

  useEffect(() => {
    if (selectedCliente && contribuintes && contribuintes.length === 1 && !selectedContribuinte) {
      setSelectedContribuinte(contribuintes[0].id);
    }
  }, [selectedCliente, contribuintes, selectedContribuinte]);

  const cnpjContribuinte = useMemo(() => {
    const contrib = contribuintes?.find(c => c.id === selectedContribuinte);
    return contrib?.cpf_cnpj?.replace(/\D/g, '') || '';
  }, [contribuintes, selectedContribuinte]);

  const dataInicio = monthYearToDateString(mesInicio, 'start');
  const dataFim = monthYearToDateString(mesFim, 'end');

  const {
    data: overview,
    isLoading: loadingOverview,
    error: errorOverview,
    refetch: refetchOverview
  } = useEFDOverview({
    enabled: searchTriggered && !!cnpjContribuinte,
    cnpj: cnpjContribuinte,
    tipo: 'ecd',
  });

  const arquivosFiltrados = useMemo(() => {
    if (!overview?.arquivos) return [];
    let filtrados = overview.arquivos;
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
  }, [overview?.arquivos, dataInicio, dataFim]);

  useEffect(() => {
    if (errorOverview) {
      const errorMessage = errorOverview instanceof Error ? errorOverview.message : 'Erro desconhecido';
      toast({ title: 'Erro ao carregar dados', description: errorMessage, variant: 'destructive' });
    }
  }, [errorOverview]);

  const handleAnalisar = (arquivo: EFDArquivo) => {
    setSelectedArquivo(arquivo);
    setAnalysisModalOpen(true);
  };

  const handleDownloadTxt = async (arquivo: EFDArquivo) => {
    setDownloadingTxt(arquivo.ID_ARQUIVO);
    try {
      const url = getApiUrl(`/api/v1/query/download/efd/ecd/arquivo/${encodeURIComponent(arquivo.ID_ARQUIVO)}`);
      const response = await fetchWithAuth(url, {}, 60000);
      if (!response.ok) throw new Error(`Erro ${response.status}: Falha ao baixar arquivo`);
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Arquivo vazio retornado pelo servidor');
      const dtIni = arquivo.DT_INI.replace(/-/g, '');
      const fileName = `ECD_${arquivo.CNPJ}_${dtIni}.txt`;
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlBlob);
      toast({ title: 'Download concluído', description: `Arquivo ${fileName} baixado com sucesso.` });
    } catch (error) {
      toast({ title: 'Erro no download', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setDownloadingTxt(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!cnpjContribuinte) return;
    setDownloadingAll(true);
    try {
      const url = new URL(getApiUrl(`/api/v1/query/download/efd/ecd/${cnpjContribuinte}`));
      if (dataInicio) url.searchParams.set('data_inicio', dataInicio);
      if (dataFim) url.searchParams.set('data_fim', dataFim);
      const response = await fetchWithAuth(url.toString(), {}, 60000);
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error_message || `Erro ${response.status}`);
        }
        throw new Error(`Erro ${response.status} ao baixar arquivos`);
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      const contentType = response.headers.get('Content-Type');
      const isZip = contentType?.includes('application/zip');
      let filename = isZip ? `ECD_${cnpjContribuinte}.zip` : `ECD_${cnpjContribuinte}.txt`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Arquivo vazio recebido do servidor');
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      const filesFound = response.headers.get('X-Files-Found');
      const filesMissing = response.headers.get('X-Files-Missing');
      let description = `Arquivo ${filename} (${(blob.size / 1024).toFixed(1)} KB) baixado.`;
      if (filesFound && filesMissing && parseInt(filesMissing) > 0) {
        description = `${filesFound} arquivo(s) baixado(s), ${filesMissing} não encontrado(s).`;
      } else if (filesFound) {
        description = `${filesFound} arquivo(s) baixado(s) com sucesso.`;
      }
      toast({ title: 'Download concluído', description });
    } catch (error) {
      toast({ title: 'Erro no download', description: error instanceof Error ? error.message : 'Não foi possível baixar os arquivos.', variant: 'destructive' });
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSelecionados = async () => {
    if (selectedArquivos.size === 0) {
      toast({ title: "Nenhum arquivo selecionado", description: "Selecione ao menos um arquivo para baixar.", variant: "destructive" });
      return;
    }
    if (selectedArquivos.size > 1) {
      await handleDownloadAll();
      return;
    }
    const arquivoSelecionado = arquivosFiltrados.find(a => selectedArquivos.has(a.ID_ARQUIVO));
    if (arquivoSelecionado) await handleDownloadTxt(arquivoSelecionado);
  };

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
      toast({ title: "CNPJ não encontrado", description: "O contribuinte selecionado não possui CNPJ cadastrado.", variant: "destructive" });
      return;
    }
    setSearchTriggered(true);
  };

  const handleClearFilters = () => {
    setSelectedCliente("");
    setSelectedContribuinte("");
    setMesInicio(null);
    setMesFim(null);
    setSearchTriggered(false);
    setSelectedArquivos(new Set());
  };

  const getAllArquivoIds = (): string[] => arquivosFiltrados.map(arq => arq.ID_ARQUIVO);

  const allSelected = useMemo(() => {
    const ids = getAllArquivoIds();
    return ids.length > 0 && ids.every(id => selectedArquivos.has(id));
  }, [selectedArquivos, arquivosFiltrados]);

  const arquivoParaExportar = useMemo(() => {
    if (selectedArquivos.size !== 1) return null;
    const [id] = Array.from(selectedArquivos);
    return arquivosFiltrados.find(a => a.ID_ARQUIVO === id) || null;
  }, [selectedArquivos, arquivosFiltrados]);

  const handleToggleArquivo = (id: string) => {
    setSelectedArquivos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const ids = getAllArquivoIds();
    setSelectedArquivos(allSelected ? new Set() : new Set(ids));
  };

  const handleExportSelecionados = () => {
    if (selectedArquivos.size === 0) {
      toast({ title: "Nenhum arquivo selecionado", description: "Selecione ao menos um arquivo para exportar.", variant: "destructive" });
      return;
    }
    if (selectedArquivos.size === 1) {
      setExportDialogOpen(true);
      return;
    }
    toast({ title: "Funcionalidade em desenvolvimento", description: `A exportação em lote de ${selectedArquivos.size} arquivos ainda está sendo implementada.`, duration: 5000 });
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    return cnpj;
  };

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

  const blocosDisponiveis = overview?.blocos_disponiveis || {};

  return (
    <DevLayout
      title="Consulta ECD"
      subtitle="Consulta de Escrituração Contábil Digital"
    >
      <DevPageHeader
        description="A Consulta ECD centraliza a busca e o download das **Escriturações Contábeis Digitais** da base de dados. Utilize os filtros abaixo para consultar arquivos específicos ou analisar períodos inteiros, permitindo a análise detalhada de blocos e registros diretamente em tela, o download dos arquivos originais em lote (.zip) ou a exportação em formato Excel (.xlsx)."
        manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/"
      />

      {/* Card de Filtros */}
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
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Cliente <RequiredMark /></label>
              <Select value={selectedCliente} onValueChange={(value) => { setSelectedCliente(value); setSelectedContribuinte(""); setSearchTriggered(false); }}>
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800"><SelectValue placeholder={loadingClientes ? "Carregando..." : "Selecione o cliente"} /></SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {clientes?.map((cliente) => (<SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Contribuinte <RequiredMark /></label>
              <Select value={selectedContribuinte} onValueChange={(value) => { setSelectedContribuinte(value); setSearchTriggered(false); setSelectedArquivos(new Set()); }}>
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800"><SelectValue placeholder={loadingContribuintes ? "Carregando..." : "Selecione o contribuinte"} /></SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {contribuintes?.map((contrib) => (<SelectItem key={contrib.id} value={contrib.id}>{contrib.nome_razao_social} {contrib.cpf_cnpj ? `(${formatCNPJ(contrib.cpf_cnpj)})` : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Data de Início</label>
              <MonthYearPicker value={mesInicio} onChange={setMesInicio} placeholder="Selecione" className="bg-white dark:bg-slate-800" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Data Fim</label>
              <MonthYearPicker value={mesFim} onChange={setMesFim} placeholder="Selecione" className="bg-white dark:bg-slate-800" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={handleClearFilters} className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Eraser className="h-4 w-4 mr-2" />Limpar filtros
            </Button>
            <Button onClick={handleSearch} disabled={!selectedContribuinte} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0">
              {loadingOverview && searchTriggered ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar arquivos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="shadow-sm min-h-[400px] flex flex-col overflow-hidden">
        {overview?.cnpj && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">Escrituração Contábil Digital</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">CNPJ: {formatCNPJ(overview.cnpj)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchOverview()} disabled={loadingOverview}>
                  {loadingOverview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {selectedArquivos.size > 0 && <Badge variant="secondary" className="text-xs">{selectedArquivos.size} selecionado(s)</Badge>}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExportSelecionados} disabled={selectedArquivos.size === 0} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />Exportar excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{selectedArquivos.size === 0 ? "Selecione arquivos para exportar" : `Exportar ${selectedArquivos.size} arquivo(s) para Excel`}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleDownloadSelecionados} disabled={downloadingTxt !== null || downloadingAll || selectedArquivos.size === 0} className="gap-2">
                        {(downloadingTxt !== null || downloadingAll) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Baixar txt
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{selectedArquivos.size === 0 ? "Selecione arquivos para baixar" : `Baixar ${selectedArquivos.size} arquivo(s) TXT`}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-0">
          {!searchTriggered ? (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum arquivo listado</h3>
              <p className="text-base text-slate-500 max-w-xs mt-2">Utilize os filtros acima e clique em "Buscar" para carregar os arquivos ECD.</p>
            </div>
          ) : loadingOverview ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : arquivosFiltrados.length > 0 ? (
            <div className={cn("overflow-x-auto", "[&::-webkit-scrollbar]:h-3", "[&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800", "[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600", "[&::-webkit-scrollbar-thumb]:rounded-full")}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-4 w-12"><Checkbox checked={allSelected} onCheckedChange={handleToggleAll} aria-label="Selecionar todos" /></th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Arquivo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Período</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Finalidade</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-center w-56">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {arquivosFiltrados.map((arquivo) => (
                    <tr key={arquivo.ID_ARQUIVO} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-4"><Checkbox checked={selectedArquivos.has(arquivo.ID_ARQUIVO)} onCheckedChange={() => handleToggleArquivo(arquivo.ID_ARQUIVO)} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><FileSpreadsheet className="h-5 w-5" /></div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{arquivo.NOME}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-mono">ID: {arquivo.ID_ARQUIVO}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{formatPeriodo(arquivo.DT_INI, arquivo.DT_FIN)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={arquivo.TIPO_ESCRIT === 0 ? 'default' : 'secondary'} className={cn("text-[10px] font-bold uppercase", arquivo.TIPO_ESCRIT === 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                          {arquivo.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {COD_FIN_MAP[arquivo.COD_FIN ?? 0] || `Código ${arquivo.COD_FIN}`}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadTxt(arquivo)} disabled={downloadingTxt === arquivo.ID_ARQUIVO}>
                                  {downloadingTxt === arquivo.ID_ARQUIVO ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Baixar arquivo TXT original</p></TooltipContent>
                            </Tooltip>
                            <EFDExportDialog arquivo={arquivo} blocosDisponiveis={blocosDisponiveis} tipo="ecd" />
                            <Button size="sm" onClick={() => handleAnalisar(arquivo)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0">
                              <BarChart3 className="h-4 w-4 mr-1" />Analisar
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
            <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[300px]">
              <FileText className="h-12 w-12 text-slate-400 mb-3" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Nenhum arquivo encontrado</p>
              <p className="text-sm text-slate-500 mt-1">Verifique os filtros e tente novamente.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EFDAnalysisModal open={analysisModalOpen} onOpenChange={setAnalysisModalOpen} arquivo={selectedArquivo} blocosDisponiveis={blocosDisponiveis} cnpj={overview?.cnpj || ''} tipo="ecd" />
      {arquivoParaExportar && (
        <EFDExportDialog arquivo={arquivoParaExportar} blocosDisponiveis={blocosDisponiveis} tipo="ecd" profileType="efd_ecd" externalOpen={exportDialogOpen} onExternalOpenChange={setExportDialogOpen} hideTrigger />
      )}
    </DevLayout>
  );
};

export default ConsultaECD;
