import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Info,
  FileX2,
  CalendarIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { ExportDialog } from "@/components/equipe/dev/ExportDialog";
import { toast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { API_BASE_URL, TABLE_NAMES } from "@/config/api";

const DEFAULT_DATA_INICIO = "2024-01-01";
const DEFAULT_DATA_FIM = "2026-01-31";
const DEFAULT_TIPO_DOCUMENTO = "nfe";
const DEFAULT_TIPO_MOV = "";

interface NFeProduto {
  nItem: number;
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  vProd: number;
  ICMS: {
    CST: string;
    vBC: number;
    pICMS: number;
    vICMS: number;
  };
  IPI: {
    vIPI: number;
    CST: number;
  };
  PIS: {
    CST: string | null;
    vBC: number | null;
    pPIS: number | null;
    vPIS: number | null;
    qBCProd: number | null;
    vAliqProd: number | null;
    vBC_ST: number | null;
    pPIS_ST: number | null;
    vPIS_ST: number | null;
  };
  COFINS: {
    CST: string | null;
    vBC: number | null;
    pCOFINS: number | null;
    vCOFINS: number | null;
    qBCProd: number | null;
    vAliqProd: number | null;
    vBC_ST: number | null;
    pCOFINS_ST: number | null;
    vCOFINS_ST: number | null;
  };
}

interface NFeEmit {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

interface NFeDest {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

interface NFeRecord {
  chave_nfe: string;
  cUF: number;
  natOp: string;
  mod: string;
  serie: number;
  nNF: string;
  dhEmi: string | null;
  tpNF: number;
  emit: NFeEmit;
  dest: NFeDest;
  produtos: NFeProduto[];
  ICMSTot: {
    vICMS: number;
    vICMSST: number;
  };
  infAdic: {
    infAdFisco: string | null;
    infCpl: string | null;
  };
}

// Interfaces CT-e
interface CTeEmit {
  CNPJ: string | null;
  CPF: string | null;
  IE: string | null;
  xNome: string;
  xFant: string | null;
  UF: string;
  cMun: number;
}

interface CTeDest {
  CNPJ: string | null;
  CPF: string | null;
  IE: string | null;
  xNome: string;
  xFant: string | null;
  UF: string;
  cMun: number;
  ISUF: string | null;
}

interface CTeTomador {
  toma: number;
  CNPJ: string | null;
  CPF: string | null;
  IE: string | null;
  xNome: string;
  UF: string;
  cMun: number;
}

interface CTeICMS {
  CST: string;
  vBC: number | null;
  pICMS: number | null;
  vICMS: number | null;
  pRedBC: number | null;
  vBCSTRet: number | null;
  vICMSSTRet: number | null;
  vTotTrib: number | null;
}

interface CTeMedida {
  cUnid: string;
  tpMed: string;
  qCarga: number;
}

interface CTeRecord {
  chave_cte: string;
  cCT: number;
  cfop: string;
  natOp: string;
  mod: string;
  serie: number;
  nCT: number;
  dEmi: string | null;
  tpEmis: number;
  tpCTe: number;
  modal: string;
  tpServ: number;
  cMunIni: number;
  xMunIni: string;
  cMunFim: number;
  xMunFim: string;
  vTPrest: number;
  vRec: number;
  vCarga: number | null;
  proPred: string | null;
  emit: CTeEmit;
  dest: CTeDest;
  rems: Array<{
    CNPJ: string | null;
    CPF: string | null;
    IE: string | null;
    xNome: string;
    xFant: string | null;
    UF: string;
    cMun: number;
  }>;
  tomador: CTeTomador;
  icms: CTeICMS;
  infAdic: {
    xObs: string | null;
    infAdFisco: string | null;
  };
  docs_nfe: string[];
  medidas: CTeMedida[];
}

interface NFeApiResponse {
  items: NFeRecord[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

interface CTeApiResponse {
  items: CTeRecord[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

interface Contribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string | null;
}

interface Cliente {
  id: string;
  nome: string;
}

const ITEMS_PER_PAGE = 10;

const ConsultaXMLs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedContribuinte, setSelectedContribuinte] = useState("");
  const [dataInicio, setDataInicio] = useState(DEFAULT_DATA_INICIO);
  const [dataFim, setDataFim] = useState(DEFAULT_DATA_FIM);
  const [tipoDocumento, setTipoDocumento] = useState<"nfe" | "cte" | "todos">(DEFAULT_TIPO_DOCUMENTO);
  const [tipoMov, setTipoMov] = useState<"Entrada" | "Saida" | "">(DEFAULT_TIPO_MOV);
  const [emitente, setEmitente] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [isDownloadingXml, setIsDownloadingXml] = useState(false);
  const { fetchWithAuth } = useApiAuth();

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCliente !== "" ||
      selectedContribuinte !== "" ||
      dataInicio !== DEFAULT_DATA_INICIO ||
      dataFim !== DEFAULT_DATA_FIM ||
      tipoDocumento !== DEFAULT_TIPO_DOCUMENTO ||
      tipoMov !== DEFAULT_TIPO_MOV ||
      emitente !== "" ||
      destinatario !== ""
    );
  }, [selectedCliente, selectedContribuinte, dataInicio, dataFim, tipoDocumento, tipoMov, emitente, destinatario]);

  const handleClearFilters = () => {
    setSelectedCliente("");
    setSelectedContribuinte("");
    setDataInicio(DEFAULT_DATA_INICIO);
    setDataFim(DEFAULT_DATA_FIM);
    setTipoDocumento(DEFAULT_TIPO_DOCUMENTO);
    setTipoMov(DEFAULT_TIPO_MOV);
    setEmitente("");
    setDestinatario("");
    setSearchTriggered(false);
    setCurrentPage(1);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram resetados para os valores padrão",
    });
  };
  const navigate = useNavigate();

  // Buscar lista de clientes
  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-list", TABLE_NAMES.cliente],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const { data, error } = await supabase
        .from(TABLE_NAMES.cliente)
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw new Error(`Erro ao carregar clientes: ${error.message}`);
      }

      return data as Cliente[];
    },
  });

  // Buscar lista de contribuintes
  const {
    data: contribuintes,
    isLoading: loadingContribuintes,
    error: errorContribuintes,
  } = useQuery({
    queryKey: ["contribuintes-list", selectedCliente, TABLE_NAMES.contribuinte],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      let query = supabase
        .from(TABLE_NAMES.contribuinte)
        .select("id, nome_razao_social, cpf_cnpj, cliente_id")
        .order("nome_razao_social");

      // Filtrar por cliente se selecionado (e não for "all")
      if (selectedCliente && selectedCliente !== "all") {
        query = query.eq("cliente_id", selectedCliente);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar contribuintes:", error);
        if (error.message.includes("JWT")) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        throw new Error(`Erro ao carregar contribuintes: ${error.message}`);
      }

      return data as Contribuinte[];
    },
    retry: (failureCount, error) => {
      if ((error as Error).message.includes("Sessão expirada")) return false;
      return failureCount < 2;
    },
  });

  // Buscar NFe
  const {
    data: nfeData,
    isLoading: loadingNfe,
    error: errorNfe,
    refetch: refetchNfe,
  } = useQuery({
    queryKey: ["nfe-docs", selectedContribuinte, dataInicio, dataFim, currentPage, tipoMov, emitente, destinatario],
    queryFn: async () => {
      if (!selectedContribuinte) return null;

      const baseUrl = `${API_BASE_URL}/api/v1/query/contribuintes`;
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        page: currentPage.toString(),
        page_size: ITEMS_PER_PAGE.toString(),
      });
      if (tipoMov) params.append("tipo_mov", tipoMov);
      if (emitente) params.append("emitente", emitente.replace(/\D/g, ""));
      if (destinatario) params.append("destinatario", destinatario.replace(/\D/g, ""));

      const url = `${baseUrl}/${selectedContribuinte}/nfes?${params.toString()}`;

      const response = await fetchWithAuth(url, { method: "GET" });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      return response.json() as Promise<NFeApiResponse>;
    },
    enabled: searchTriggered && !!selectedContribuinte && tipoDocumento === "nfe",
    retry: (failureCount, error) => {
      if ((error as Error).message === "Sessão expirada") return false;
      return failureCount < 2;
    },
  });

  // Buscar CT-e
  const {
    data: cteData,
    isLoading: loadingCte,
    error: errorCte,
    refetch: refetchCte,
  } = useQuery({
    queryKey: ["cte-docs", selectedContribuinte, dataInicio, dataFim, currentPage, tipoMov, emitente, destinatario],
    queryFn: async () => {
      if (!selectedContribuinte) return null;

      const baseUrl = `${API_BASE_URL}/api/v1/query/contribuintes`;
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        page: currentPage.toString(),
        page_size: ITEMS_PER_PAGE.toString(),
      });
      if (tipoMov) params.append("tipo_mov", tipoMov);
      if (emitente) params.append("emitente", emitente.replace(/\D/g, ""));
      if (destinatario) params.append("destinatario", destinatario.replace(/\D/g, ""));

      const url = `${baseUrl}/${selectedContribuinte}/ctes?${params.toString()}`;

      const response = await fetchWithAuth(url, { method: "GET" });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      return response.json() as Promise<CTeApiResponse>;
    },
    enabled: searchTriggered && !!selectedContribuinte && tipoDocumento === "cte",
    retry: (failureCount, error) => {
      if ((error as Error).message === "Sessão expirada") return false;
      return failureCount < 2;
    },
  });

  const isLoading = tipoDocumento === "nfe" ? loadingNfe : loadingCte;
  const error = tipoDocumento === "nfe" ? errorNfe : errorCte;
  const refetch = tipoDocumento === "nfe" ? refetchNfe : refetchCte;

  const nfeRecords = nfeData?.items || [];
  const cteRecords = cteData?.items || [];
  const totalRecords = tipoDocumento === "nfe" ? nfeData?.total || 0 : cteData?.total || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // Toast de erro automático
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro na busca",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error]);

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return "-";
    const cleaned = cnpj.replace(/\D/g, "");
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    return cnpj;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      NFe: "bg-blue-100 text-blue-800",
      NFSe: "bg-green-100 text-green-800",
      CTe: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[tipo] || "bg-gray-100 text-gray-800"}`}>
        {tipo}
      </span>
    );
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchTriggered(true);
    // Se já foi triggered antes, forçar refetch
    if (searchTriggered) {
      refetch();
    }
  };

  const handleDownloadXml = async () => {
    if (!selectedContribuinte) {
      toast({
        title: "Contribuinte não selecionado",
        description: "Selecione um contribuinte para baixar os XMLs",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingXml(true);
    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      if (tipoMov) params.append("tipo_mov", tipoMov);
      if (emitente) params.append("emitente", emitente.replace(/\D/g, ""));
      if (destinatario) params.append("destinatario", destinatario.replace(/\D/g, ""));

      const url = `${API_BASE_URL}/api/v1/query/download/contribuintes/${selectedContribuinte}/${tipoDocumento}/xml?${params.toString()}`;

      const response = await fetchWithAuth(url, { method: "GET" });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      // Baixar o arquivo ZIP
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${tipoDocumento}_${dataInicio}_${dataFim}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download iniciado",
        description: "O arquivo ZIP com os XMLs está sendo baixado",
      });
    } catch (error) {
      console.error("Erro ao baixar XMLs:", error);
      toast({
        title: "Erro no download",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDownloadingXml(false);
    }
  };

  return (
    <DevLayout title="Consulta de XMLs" subtitle="Busque e visualize documentos fiscais">
      <div className="w-full min-w-0 max-w-full overflow-hidden space-y-6">
        {/* Alerta de Instruções */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-700">
            Utilize os filtros de <strong>Data</strong> e <strong>Contribuinte</strong> abaixo para localizar as notas
            fiscais desejadas. Após a busca, você pode conferir os detalhes na tabela ou gerar um relatório clicando em{" "}
            <strong>Exportar Excel</strong>.
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid de Inputs */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Cliente</label>
                <Select
                  value={selectedCliente}
                  onValueChange={(value) => {
                    setSelectedCliente(value);
                    setSelectedContribuinte("");
                    setSearchTriggered(false);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        loadingClientes ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando...
                          </span>
                        ) : (
                          "Todos os clientes"
                        )
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Contribuinte</label>
                {errorContribuintes ? (
                  <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-md bg-destructive/10">
                    {(errorContribuintes as Error).message}
                    <Button
                      variant="link"
                      className="text-destructive p-0 h-auto ml-2"
                      onClick={() => navigate("/equipe")}
                    >
                      Fazer login novamente
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedContribuinte}
                    onValueChange={(value) => {
                      setSelectedContribuinte(value);
                      setSearchTriggered(false);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue
                        placeholder={
                          loadingContribuintes ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando...
                            </span>
                          ) : (
                            "Selecione um contribuinte"
                          )
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {contribuintes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social} {c.cpf_cnpj ? `(${formatCNPJ(c.cpf_cnpj)})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="w-[110px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Tipo Doc.</label>
                <Select
                  value={tipoDocumento}
                  onValueChange={(value: "nfe" | "cte" | "todos") => {
                    setTipoDocumento(value);
                    setSearchTriggered(false);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfe">NFe</SelectItem>
                    <SelectItem value="cte">CTe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[130px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Tipo Mov.</label>
                <Select
                  value={tipoMov}
                  onValueChange={(value: "Entrada" | "Saida" | "todos") => {
                    setTipoMov(value === "todos" ? "" : value);
                    setSearchTriggered(false);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      <span className="text-muted-foreground">Todos</span>
                    </SelectItem>
                    <SelectItem value="Entrada">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                        Entrada
                      </span>
                    </SelectItem>
                    <SelectItem value="Saida">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                        Saída
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <div className="w-[140px]">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-9 px-3 text-left font-normal justify-start",
                          !dataInicio && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {dataInicio ? (
                          format(parse(dataInicio, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                        ) : (
                          <span>Selecione</span>
                        )}
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
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-[140px]">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-9 px-3 text-left font-normal justify-start",
                          !dataFim && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {dataFim ? (
                          format(parse(dataFim, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                        ) : (
                          <span>Selecione</span>
                        )}
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
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Filtros de Emitente e Destinatário */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">CPF/CNPJ Emitente</label>
                <Input
                  placeholder="Digite o CPF ou CNPJ"
                  value={emitente}
                  onChange={(e) => {
                    setEmitente(e.target.value);
                    setSearchTriggered(false);
                  }}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">CPF/CNPJ Destinatário</label>
                <Input
                  placeholder="Digite o CPF ou CNPJ"
                  value={destinatario}
                  onChange={(e) => {
                    setDestinatario(e.target.value);
                    setSearchTriggered(false);
                  }}
                  className="h-9"
                />
              </div>
            </div>

            {/* Barra de Ações */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Limpar Filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadXml}
                disabled={isLoading || isDownloadingXml || !selectedContribuinte}
              >
                {isDownloadingXml ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Baixar XMLs
              </Button>
              <ExportDialog
                data={tipoDocumento === "nfe" ? nfeRecords : []}
                cteData={tipoDocumento === "cte" ? cteRecords : []}
                tipoDocumento={tipoDocumento}
                totalRecords={totalRecords}
                dataInicio={dataInicio}
                dataFim={dataFim}
                contribuinteId={selectedContribuinte}
                tipoMov={tipoMov}
                emitente={emitente}
                destinatario={destinatario}
                disabled={
                  isLoading ||
                  !selectedContribuinte ||
                  (tipoDocumento === "nfe" ? nfeRecords.length === 0 : cteRecords.length === 0)
                }
              />
              <Button onClick={handleSearch} disabled={!selectedContribuinte || isLoading} size="sm">
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                )}
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos
              </CardTitle>
              <span className="text-sm text-muted-foreground">{totalRecords} registro(s) encontrado(s)</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!searchTriggered ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Search className="h-12 w-12 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium text-foreground">Pronto para buscar</p>
                    <p className="text-sm text-muted-foreground">
                      Selecione os filtros acima e clique em "Buscar" para visualizar os documentos fiscais
                    </p>
                  </div>
                </div>
              </div>
            ) : !selectedContribuinte ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium text-foreground">Contribuinte não selecionado</p>
                    <p className="text-sm text-muted-foreground">
                      Selecione um contribuinte para buscar os documentos fiscais
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <p className="text-destructive text-center max-w-md">{(error as Error).message}</p>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  {tipoDocumento === "nfe" ? (
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">CNPJ Emitente</TableHead>
                          <TableHead className="whitespace-nowrap">Razão Social</TableHead>
                          <TableHead className="whitespace-nowrap hidden xl:table-cell">IE</TableHead>
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">UF</TableHead>
                          <TableHead className="whitespace-nowrap hidden xl:table-cell">Nat. Operação</TableHead>
                          <TableHead className="whitespace-nowrap">Número</TableHead>
                          <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                          <TableHead className="whitespace-nowrap">Produtos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={`skeleton-nfe-${i}`}>
                              <TableCell>
                                <Skeleton className="h-5 w-28" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-full" />
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <Skeleton className="h-5 w-20" />
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Skeleton className="h-5 w-10" />
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : nfeRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <FileX2 className="h-12 w-12 text-amber-400" />
                                <div>
                                  <p className="font-medium text-foreground">Nenhum documento encontrado</p>
                                  <p className="text-sm text-muted-foreground">
                                    Tente ajustar o período ou selecionar outro contribuinte
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          nfeRecords.map((record) => (
                            <TableRow key={record.chave_nfe}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {formatCNPJ(record.emit.CNPJ)}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <span className="truncate block" title={record.emit.xNome}>
                                  {record.emit.xNome}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-sm hidden xl:table-cell">{record.emit.IE}</TableCell>
                              <TableCell className="hidden lg:table-cell">{record.emit.UF}</TableCell>
                              <TableCell className="max-w-[120px] hidden xl:table-cell">
                                <span className="truncate block" title={record.natOp}>
                                  {record.natOp}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono">{record.nNF}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatDate(record.dhEmi)}</TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(record.produtos.reduce((sum, p) => sum + p.vProd, 0))}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.produtos.length} item(s)</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">CNPJ Emitente</TableHead>
                          <TableHead className="whitespace-nowrap">Razão Social</TableHead>
                          <TableHead className="whitespace-nowrap hidden xl:table-cell">Origem</TableHead>
                          <TableHead className="whitespace-nowrap hidden xl:table-cell">Destino</TableHead>
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">CFOP</TableHead>
                          <TableHead className="whitespace-nowrap">Tipo</TableHead>
                          <TableHead className="whitespace-nowrap">Número</TableHead>
                          <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Valor Prestação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={`skeleton-cte-${i}`}>
                              <TableCell>
                                <Skeleton className="h-5 w-28" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-full" />
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-14" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : cteRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <FileX2 className="h-12 w-12 text-amber-400" />
                                <div>
                                  <p className="font-medium text-foreground">Nenhum documento encontrado</p>
                                  <p className="text-sm text-muted-foreground">
                                    Tente ajustar o período ou selecionar outro contribuinte
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          cteRecords.map((record) => (
                            <TableRow key={record.chave_cte}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {formatCNPJ(record.emit.CNPJ || "")}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <span className="truncate block" title={record.emit.xNome}>
                                  {record.emit.xNome}
                                </span>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <span className="truncate block" title={record.xMunIni}>
                                  {record.xMunIni}
                                </span>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                <span className="truncate block" title={record.xMunFim}>
                                  {record.xMunFim}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono hidden lg:table-cell">{record.cfop}</TableCell>
                              <TableCell>{getTipoBadge("CTe")}</TableCell>
                              <TableCell className="font-mono">{record.nCT}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatDate(record.dEmi)}</TableCell>
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(record.vTPrest)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <ChevronLeft className="h-4 w-4 mr-1" />
                        )}
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        Próximo
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
};

export default ConsultaXMLs;
