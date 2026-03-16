import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { DifalAuditModal } from "@/components/equipe/dev/DifalAuditModal";
import { useToast } from "@/hooks/use-toast";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL, isProductionEnvironment } from "@/config/api";
import { cn } from "@/lib/utils";
import { RequiredMark } from '@/components/ui/required-mark';
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DifalGroupedItem,
  DifalApiGroupedResponse,
  DifalApiGroupedItem,
  ClassificacoesBuscarResponse,
  SyncPayload,
  SyncDecisao,
  TipoDecisao,
} from "@/types/difal";
import {
  Search,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  CalendarIcon,
  Download,
  Save,
  Loader2,
  Filter,
  Eraser,
} from "lucide-react";

// Nomes dos clientes permitidos para esta ferramenta (Barralcool e Coprodia)
const CLIENTES_PERMITIDOS_NOMES = ["Barralcool", "COPRODIA"];

// Limite de itens por página
const ITEMS_PER_PAGE = 25;

// Datas padrão: primeiro e último dia do mês atual
const getDefaultDates = () => {
  const now = new Date();
  const firstDay = startOfMonth(now);
  const lastDay = endOfMonth(now);
  return {
    inicio: format(firstDay, "yyyy-MM-dd"),
    fim: format(lastDay, "yyyy-MM-dd"),
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

const AuditoriaFiscal = () => {
  const { toast } = useToast();
  const { fetchWithAuth } = useApiAuth();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Datas padrão do mês atual
  const defaultDates = getDefaultDates();

  // Estados de filtros (formato yyyy-MM-dd)
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>("");
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio);
  const [dataFim, setDataFim] = useState(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtro de status (Total, Validados, Pendentes)
  type StatusFilter = "all" | "validated" | "pending";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Estado do modal
  const [selectedGroup, setSelectedGroup] = useState<DifalGroupedItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para sessão e decisões pendentes
  const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Estado local para rastrear decisões feitas na sessão atual (atualização imediata do Status)
  const [localDecisions, setLocalDecisions] = useState<Set<string>>(new Set());

  // Estatísticas globais (não mudam com filtro de status)
  const [globalStats, setGlobalStats] = useState<{
    total: number;
    validados: number;
    pendentes: number;
  } | null>(null);

  // Determinar tabela baseado no ambiente
  const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
  const contribuinteTable = isProductionEnvironment ? "contribuinte" : "contribuinte_dev";

  // Query: Listar clientes (filtrado para Barralcool e Coprodia por nome)
  const { data: clientes, isLoading: isLoadingClientes } = useQuery({
    queryKey: ["difal-clientes", clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select("id, nome")
        .eq("ativo", true)
        .filter("nome", "in", `(${CLIENTES_PERMITIDOS_NOMES.join(",")})`)
        .order("nome");

      if (error) throw error;
      return (data || []) as ClienteRecord[];
    },
  });

  // Query: Listar contribuintes do cliente
  const { data: contribuintes, isLoading: isLoadingContribuintes } = useQuery({
    queryKey: ["difal-contribuintes", selectedCliente, contribuinteTable],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select("id, nome_razao_social, cpf_cnpj")
        .eq("cliente_id", selectedCliente)
        .eq("excluido", false)
        .order("nome_razao_social");

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

  // Carregar última sessão do usuário ao entrar na ferramenta
  useEffect(() => {
    const loadLastSession = async () => {
      if (!user?.id) {
        setIsLoadingSession(false);
        return;
      }

      try {
        // Buscar apenas sessões EM_ANDAMENTO (ignorar FINALIZADO e SINCRONIZADO)
        const { data: lastSession, error } = await supabase
          .from("difal_sessao")
          .select("*")
          .eq("usuario_id", user.id)
          .eq("status", "EM_ANDAMENTO")
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !lastSession) {
          setIsLoadingSession(false);
          return;
        }

        // Restaurar estado da sessão
        setActiveSessaoId(lastSession.id);
        setSelectedCliente(lastSession.cliente_id);

        // Parse do request_original para restaurar filtros
        const request = lastSession.request_original as {
          contribuinte_id?: string;
          data_inicio?: string;
          data_fim?: string;
        };

        if (request.data_inicio) {
          setDataInicio(request.data_inicio);
        }
        if (request.data_fim) {
          setDataFim(request.data_fim);
        }

        // Guardar contribuinte para setar depois que a lista carregar
        if (request.contribuinte_id) {
          // Precisamos esperar os contribuintes carregarem
          setTimeout(() => {
            setSelectedContribuinte(request.contribuinte_id!);
          }, 500);
        }

        // Carregar contagem de decisões pendentes
        const { count } = await supabase
          .from("difal_decisao")
          .select("*", { count: "exact", head: true })
          .eq("sessao_id", lastSession.id);

        setPendingDecisionsCount(count || 0);

        // Se sessão ainda está em andamento, disparar busca
        if (lastSession.status === "EM_ANDAMENTO") {
          setTimeout(() => {
            setSearchTriggered(true);
          }, 600);
        }

        toast({
          title: "Sessão restaurada",
          description: "Continuando de onde você parou.",
        });
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadLastSession();
  }, [user?.id]);

  // Query: Buscar itens agrupados do período (novo endpoint)
  const {
    data: apiGroupedData,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: ["difal-grouped-items", selectedContribuinte, dataInicio, dataFim, currentPage, statusFilter],
    queryFn: async () => {
      if (!selectedContribuinte) {
        throw new Error("Contribuinte não selecionado");
      }

      // Construir URL base
      let url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes/agrupado-item?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo_mov=Entrada&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`;

      // Adicionar filtro de validação se necessário
      if (statusFilter === "validated") {
        url += "&valid=true";
      } else if (statusFilter === "pending") {
        url += "&valid=false";
      }
      // statusFilter === 'all' não adiciona parâmetro (retorna todos)

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error("Erro ao buscar itens agrupados");
      }

      const data: DifalApiGroupedResponse = await response.json();
      return {
        items: data.items,
        total: data.total,
        hasMore: data.has_more,
        qtdValidados: data.qtd_validados,
        qtdPendentes: data.qtd_pendentes,
      };
    },
    enabled: searchTriggered && !!selectedContribuinte,
  });

  // Atualizar estatísticas globais sempre que a API retornar dados
  // A API retorna qtd_validados e qtd_pendentes como valores absolutos (globais)
  useEffect(() => {
    if (apiGroupedData && searchTriggered) {
      const totalCalculado = (apiGroupedData.qtdValidados || 0) + (apiGroupedData.qtdPendentes || 0);
      setGlobalStats({
        total: totalCalculado,
        validados: apiGroupedData.qtdValidados,
        pendentes: apiGroupedData.qtdPendentes,
      });
    }
  }, [apiGroupedData, searchTriggered]);

  // Converter itens da API para formato da UI
  const groupedItemsFromApi = useMemo(() => {
    if (!apiGroupedData?.items || !selectedContribuinte) return [];

    return apiGroupedData.items.map(
      (item: DifalApiGroupedItem): DifalGroupedItem => ({
        groupKey: `${item.xProd}|${item.cProd}|${item.NCM}`,
        xProd: item.xProd,
        cod_produto: item.cProd,
        cod_ncm: item.NCM,
        id_contribuinte: selectedContribuinte,
        cfop: item.CFOP,
        cst_icms: item.CST,
        aliq_icms: item.aliq_prod,
        pRedBC: item.pRedBC ?? null,
        count: item.tot_itens,
        totalValue: item.vlr_total,
        nfesCount: item.tot_nfes,
        status: "pendente",
        classificacao: null,
      }),
    );
  }, [apiGroupedData, selectedContribuinte]);

  // Query: Buscar classificações existentes
  const { data: classificacoes, isLoading: isLoadingClassificacoes } = useQuery({
    queryKey: ["difal-classificacoes", groupedItemsFromApi.map((i) => `${i.cod_produto}|${i.cod_ncm}`)],
    queryFn: async () => {
      if (groupedItemsFromApi.length === 0) return {};

      const payload = {
        itens: groupedItemsFromApi.map((item) => ({
          id_contribuinte: item.id_contribuinte,
          cod_produto: item.cod_produto,
          cod_ncm: item.cod_ncm,
        })),
      };

      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/classificacoes/buscar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar classificações");
      }

      return response.json() as Promise<ClassificacoesBuscarResponse>;
    },
    enabled: groupedItemsFromApi.length > 0,
  });

  // Itens agrupados com status (prioriza decisões locais)
  const groupedItems = useMemo(() => {
    return groupedItemsFromApi.map((group) => {
      const classifChave = `${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`;
      const classificacao = classificacoes?.[classifChave];

      // Verificar decisões locais
      const isLocallyDecided = localDecisions.has(classifChave);

      return {
        ...group,
        status: isLocallyDecided || classificacao ? ("validado" as const) : ("pendente" as const),
        classificacao,
      };
    });
  }, [groupedItemsFromApi, classificacoes, localDecisions]);

  // Handler para criar ou atualizar sessão e disparar busca
  const handleSearch = async () => {
    if (!selectedContribuinte) {
      toast({
        title: "Selecione um contribuinte",
        description: "É necessário selecionar um contribuinte para buscar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verificar se já existe uma sessão ativa para este usuário
      const { data: existingSession } = await supabase
        .from("difal_sessao")
        .select("id")
        .eq("usuario_id", user?.id || "unknown")
        .eq("status", "EM_ANDAMENTO")
        .maybeSingle();

      let sessionId: string;

      if (existingSession) {
        // Atualizar sessão existente com novos parâmetros
        const { error } = await supabase
          .from("difal_sessao")
          .update({
            cliente_id: selectedCliente,
            cliente_nome: clientes?.find((c) => c.id === selectedCliente)?.nome || "",
            periodo: `${dataInicio} a ${dataFim}`,
            uf: "MT",
            request_original: {
              contribuinte_id: selectedContribuinte,
              data_inicio: dataInicio,
              data_fim: dataFim,
            },
          })
          .eq("id", existingSession.id);

        if (error) throw error;
        sessionId = existingSession.id;
      } else {
        // Criar nova sessão
        const { data: session, error } = await supabase
          .from("difal_sessao")
          .insert({
            usuario_id: user?.id || "unknown",
            cliente_id: selectedCliente,
            cliente_nome: clientes?.find((c) => c.id === selectedCliente)?.nome || "",
            periodo: `${dataInicio} a ${dataFim}`,
            uf: "MT",
            request_original: {
              contribuinte_id: selectedContribuinte,
              data_inicio: dataInicio,
              data_fim: dataFim,
            },
            status: "EM_ANDAMENTO",
          })
          .select("id")
          .single();

        if (error) throw error;
        sessionId = session.id;
      }

      setActiveSessaoId(sessionId);

      // Buscar contagem de decisões existentes
      const { count } = await supabase
        .from("difal_decisao")
        .select("*", { count: "exact", head: true })
        .eq("sessao_id", sessionId);

      setPendingDecisionsCount(count || 0);
      setSearchTriggered(true);
      setStatusFilter("all"); // Buscar todos inicialmente, filtro fica nos cards

      toast({
        title: existingSession ? "Sessão atualizada" : "Sessão iniciada",
        description: "As decisões serão salvas automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerenciar sessão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedCliente("");
    setSelectedContribuinte("");
    setDataInicio(defaultDates.inicio);
    setDataFim(defaultDates.fim);
    setSearchTriggered(false);
    setActiveSessaoId(null);
    setPendingDecisionsCount(0);
    setStatusFilter("all");
    setGlobalStats(null);
  };

  // Handler para mudança de filtro de status
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1); // Resetar para primeira página ao mudar filtro
  };

  // Estado para exportação Excel com polling
  const [exportStatus, setExportStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isExporting = exportStatus === 'starting' || exportStatus === 'processing';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleExportExcel = async () => {
    if (!selectedContribuinte || !dataInicio || !dataFim) {
      toast({
        title: "Filtros incompletos",
        description: "Selecione contribuinte e período para exportar.",
        variant: "destructive",
      });
      return;
    }

    if (pendingDecisionsCount > 0) {
      toast({
        title: "Decisões não salvas",
        description: "Salve as alterações antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    // Cleanup any previous polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (abortRef.current) abortRef.current.abort();

    setExportStatus('starting');
    setExportMessage('Iniciando exportação...');

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/ncm/calculo-difal/exportar/${selectedContribuinte}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data_inicio: dataInicio,
            data_fim: dataFim,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Erro ao iniciar exportação");
      }

      const data = await response.json();

      // Cache hit — arquivo pronto imediatamente
      if (data.status === 'completed' && (data.url || data.download_url)) {
        const downloadUrl = data.download_url || data.url;
        const fileName = data.file_name || `DIFAL_export.xlsx`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportStatus('idle');
        toast({ title: "Exportação concluída", description: "O download iniciará automaticamente." });
        return;
      }

      // Job assíncrono — iniciar polling
      const jobId = data.job_id || data.id;
      if (!jobId) throw new Error("Resposta inesperada do servidor");

      setExportStatus('processing');
      setExportMessage('Processando arquivo...');

      const controller = new AbortController();
      abortRef.current = controller;

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetchWithAuth(
            `${API_BASE_URL}/api/v1/ncm/calculo-difal/exportar/status/${jobId}`,
            { signal: controller.signal },
          );

          if (!statusRes.ok) {
            const errData = await statusRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Erro ${statusRes.status}`);
          }

          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;

            const downloadUrl = statusData.download_url || statusData.url;
            if (downloadUrl) {
              window.location.href = downloadUrl;
              toast({ title: "Exportação concluída", description: "O download iniciará automaticamente." });
            } else {
              toast({ title: "Erro", description: "URL de download não disponível.", variant: "destructive" });
            }
            setExportStatus('idle');
          } else if (statusData.status === 'failed' || statusData.status === 'error') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setExportStatus('error');
            toast({
              title: "Erro na exportação",
              description: statusData.message || statusData.error || "Falha ao gerar o arquivo.",
              variant: "destructive",
            });
            setExportStatus('idle');
          }
          // else still processing, continue polling
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          console.error('[DIFAL Export] Polling error:', err);
        }
      }, 2000);
    } catch (error) {
      setExportStatus('idle');
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Erro ao exportar dados",
        variant: "destructive",
      });
    }
  };

  // Handler para sincronizar decisões com o banco principal
  const handleSaveChanges = async () => {
    if (!activeSessaoId || pendingDecisionsCount === 0) return;

    setIsSaving(true);

    try {
      // 1. Buscar decisões da sessão atual
      const { data: decisoes, error: fetchError } = await supabase
        .from("difal_decisao")
        .select("*")
        .eq("sessao_id", activeSessaoId);

      if (fetchError) throw fetchError;

      // 2. Montar payload para API de sync
      // Para cada decisão de NCM, encontrar todos os produtos com esse NCM
      // e criar uma entrada para cada combinação única de contribuinte + produto + ncm
      const decisoesPayload: SyncDecisao[] = [];

      (decisoes || []).forEach((d) => {
        // Encontrar todos os itens que correspondem a este NCM
        const matchingItems = groupedItems.filter((item) => item.cod_ncm === d.cod_ncm);

        // Criar set de chaves únicas para evitar duplicatas
        const processedKeys = new Set<string>();

        matchingItems.forEach((item) => {
          const key = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            decisoesPayload.push({
              id_contribuinte: item.id_contribuinte,
              cod_produto: item.cod_produto,
              cod_ncm: d.cod_ncm,
              decisao: d.decisao as TipoDecisao,
              id_icms_st: d.id_icms_st_bq,
            });
          }
        });
      });

      const payload: SyncPayload = {
        sessao_id: activeSessaoId,
        decisoes: decisoesPayload,
      };

      // 3. Enviar para endpoint de sync
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/classificacoes/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao sincronizar classificações");
      }

      // 4. Finalizar sessão (marcar como FINALIZADO, não apenas SINCRONIZADO)
      await supabase
        .from("difal_sessao")
        .update({
          status: "FINALIZADO",
          sincronizado_em: new Date().toISOString(),
        })
        .eq("id", activeSessaoId);

      // 5. Deletar decisões locais da sessão finalizada
      await supabase.from("difal_decisao").delete().eq("sessao_id", activeSessaoId);

      // 6. Limpar estado de sessão (mas MANTER filtros)
      setActiveSessaoId(null);
      setPendingDecisionsCount(0);
      setLocalDecisions(new Set());

      // 7. Re-buscar dados com classificações atualizadas
      queryClient.invalidateQueries({ queryKey: ["difal-classificacoes"] });
      queryClient.invalidateQueries({ queryKey: ["difal-grouped-items"] });

      toast({
        title: "Alterações salvas",
        description: `${decisoes?.length || 0} decisão(ões) sincronizada(s). Os dados foram recarregados.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao sincronizar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGroupClick = (group: DifalGroupedItem) => {
    // Permitir abrir para correção mesmo em itens validados
    setSelectedGroup(group);
    setModalOpen(true);
  };

  const handleDecisionSaved = (group: DifalGroupedItem) => {
    setPendingDecisionsCount((prev) => prev + 1);
    // Adicionar o grupo ao set de decisões locais
    setLocalDecisions((prev) => {
      const newSet = new Set(prev);
      newSet.add(`${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`);
      return newSet;
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Usar estatísticas globais para os cards (não mudam com filtro)
  const totalItems = globalStats?.total ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasMore = apiGroupedData?.hasMore ?? false;
  const qtdValidados = globalStats?.validados ?? 0;
  const qtdPendentes = globalStats?.pendentes ?? 0;

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const isLoading = isLoadingItems || isLoadingClassificacoes;

  return (
    <DevLayout title="DIFAL Inteligente" subtitle="Auditoria e classificação fiscal de produtos" sopUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/">
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
                  setSelectedContribuinte("");
                  setSearchTriggered(false);
                  setActiveSessaoId(null);
                  setPendingDecisionsCount(0);
                }}
                disabled={isLoadingClientes}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Contribuinte
              </label>
              <Select
                value={selectedContribuinte}
                onValueChange={(value) => {
                  setSelectedContribuinte(value);
                  setSearchTriggered(false);
                  setActiveSessaoId(null);
                  setPendingDecisionsCount(0);
                }}
                disabled={!selectedCliente || isLoadingContribuintes}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data Início
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-11 px-3 text-left font-normal justify-start bg-white dark:bg-slate-800",
                      !dataInicio && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataInicio ? format(parse(dataInicio, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Selecione"}
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

            {/* Data Fim - Calendar + Popover */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Data Fim
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-11 px-3 text-left font-normal justify-start bg-white dark:bg-slate-800",
                      !dataFim && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dataFim ? format(parse(dataFim, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Selecione"}
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

          {/* Botões de Ação */}
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
              disabled={!selectedContribuinte || isLoading}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar produtos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas - Cards clicáveis para filtrar */}
      {searchTriggered && (totalItems > 0 || qtdValidados > 0 || qtdPendentes > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Card Pendentes - Primeiro (mais importante) */}
          <Card
            className={cn(
              "border-amber-200 bg-amber-50/50 cursor-pointer transition-all hover:shadow-md",
              statusFilter === "pending" && "ring-2 ring-amber-500 ring-offset-2",
            )}
            onClick={() => handleStatusFilterChange("pending")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{qtdPendentes}</p>
                <p className="text-xs text-amber-600">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          {/* Card Validados - Segundo */}
          <Card
            className={cn(
              "border-green-200 bg-green-50/50 cursor-pointer transition-all hover:shadow-md",
              statusFilter === "validated" && "ring-2 ring-green-500 ring-offset-2",
            )}
            onClick={() => handleStatusFilterChange("validated")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{qtdValidados}</p>
                <p className="text-xs text-green-600">Validados</p>
              </div>
            </CardContent>
          </Card>
          {/* Card Total de Itens - Terceiro */}
          <Card
            className={cn(
              "border-slate-200 cursor-pointer transition-all hover:shadow-md",
              statusFilter === "all" && "ring-2 ring-primary ring-offset-2",
            )}
            onClick={() => handleStatusFilterChange("all")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
                <p className="text-xs text-slate-500">Total de produtos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botões de Ação: Salvar alterações + Exportar */}
      {searchTriggered && groupedItems.length > 0 && (
        <div className="flex justify-end gap-2 mb-4">
          {/* Indicador de decisões pendentes */}
          {pendingDecisionsCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 h-9 px-3">
              <AlertCircle className="h-4 w-4" />
              {pendingDecisionsCount} decisão(ões) não sincronizada(s)
            </Badge>
          )}

          {/* Botão Salvar alterações */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveChanges}
            disabled={pendingDecisionsCount === 0 || isSaving}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>

          {/* Botão Exportar Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || pendingDecisionsCount > 0}
            className="gap-2"
            title={
              pendingDecisionsCount > 0 ? "Salve as alterações antes de exportar" : "Exportar classificações para Excel"
            }
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportStatus === 'starting' ? "Iniciando..." : exportStatus === 'processing' ? "Processando..." : "Exportar Excel"}
          </Button>
        </div>
      )}

      {/* Grid de Itens */}
      {searchTriggered && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              Produtos para classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : itemsError ? (
              <div className="p-6 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Erro ao carregar produtos</p>
              </div>
            ) : groupedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado para o período selecionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-[100px]">NCM</TableHead>
                      <TableHead className="w-[80px]">CFOP</TableHead>
                      <TableHead className="w-[150px]">Tributação</TableHead>
                      <TableHead className="w-[120px]">MVA/ST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedItems.map((group) => (
                      <TableRow
                        key={group.groupKey}
                        className={`
                          ${group.status === "pendente" ? "cursor-pointer hover:bg-amber-50" : "hover:bg-slate-50"}
                        `}
                        onClick={() => handleGroupClick(group)}
                      >
                        <TableCell>
                          {group.status === "validado" ? (
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
                            <span className="text-slate-600">CST:</span>{" "}
                            <span className="font-mono">{group.cst_icms || "—"}</span>
                            {group.aliq_icms && (
                              <>
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="font-mono">{group.aliq_icms}%</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.classificacao ? (
                            <div className="text-sm">
                              <span className="font-mono">{group.classificacao.aliquota_st}%</span>
                              {group.classificacao.percentual_reducao && (
                                <span className="text-slate-500 text-xs ml-1">
                                  (Red. {group.classificacao.percentual_reducao}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginação */}
                {totalItems > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Página {currentPage} de {totalPages} ({totalItems} produtos)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange("prev")}
                        disabled={currentPage === 1}
                      >
                        ← Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange("next")} disabled={!hasMore}>
                        Próxima →
                      </Button>
                    </div>
                  </div>
                )}
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
            <h3 className="text-lg font-medium text-slate-700 mb-2">DIFAL Inteligente</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Selecione um contribuinte e período para carregar os produtos de notas fiscais e iniciar a auditoria de
              classificação fiscal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Auditoria */}
      <DifalAuditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        group={selectedGroup}
        ufDestino="MT"
        sessaoId={activeSessaoId}
        onDecisionSaved={handleDecisionSaved}
      />
    </DevLayout>
  );
};

export default AuditoriaFiscal;
