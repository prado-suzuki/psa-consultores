import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { DifalAuditModal } from '@/components/equipe/dev/DifalAuditModal';
import { useToast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL, isProductionEnvironment } from '@/config/api';
import { cn } from '@/lib/utils';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DifalItem,
  DifalGroupedItem,
  ClassificacoesBuscarResponse,
  NFeRecord,
  NFeProduto,
  SyncPayload,
  TipoDecisao,
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
  Save,
  Loader2,
} from 'lucide-react';

// IDs dos clientes permitidos para esta ferramenta (Barracol e Cropodia)
const CLIENTES_PERMITIDOS_IDS = [
  '678b5a42-6e88-41ed-87f7-4d4e841b45ee',
  'e1c0df8e-5206-45e1-af4b-de3e5aacc48c',
];

// Limite de itens por página
const ITEMS_PER_PAGE = 25;

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Datas padrão do mês atual
  const defaultDates = getDefaultDates();

  // Estados de filtros (formato yyyy-MM-dd)
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>('');
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio);
  const [dataFim, setDataFim] = useState(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Estado do modal
  const [selectedGroup, setSelectedGroup] = useState<DifalGroupedItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para sessão e decisões pendentes
  const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Estado local para rastrear decisões feitas na sessão atual (atualização imediata do Status)
  const [localDecisions, setLocalDecisions] = useState<Set<string>>(new Set());

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
        .in('id', CLIENTES_PERMITIDOS_IDS)
        .order('nome');

      if (error) throw error;
      return (data || []) as ClienteRecord[];
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

  // Carregar última sessão do usuário ao entrar na ferramenta
  useEffect(() => {
    const loadLastSession = async () => {
      if (!user?.id) {
        setIsLoadingSession(false);
        return;
      }

      try {
        const { data: lastSession, error } = await supabase
          .from('difal_sessao')
          .select('*')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })
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
          .from('difal_decisao')
          .select('*', { count: 'exact', head: true })
          .eq('sessao_id', lastSession.id);

        setPendingDecisionsCount(count || 0);

        // Se sessão ainda está em andamento, disparar busca
        if (lastSession.status === 'EM_ANDAMENTO') {
          setTimeout(() => {
            setSearchTriggered(true);
          }, 600);
        }

        toast({
          title: 'Sessão restaurada',
          description: 'Continuando de onde você parou.',
        });
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadLastSession();
  }, [user?.id]);

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
        chave_nfe: nfe.chave_nfe,
        nItem: prod.nItem,
      }))
    );
  };

  // Itens achatados - usando UUID do contribuinte
  const flatItems = useMemo(() => {
    if (!nfesData?.items || !selectedContribuinte) return [];
    
    // Usar UUID do contribuinte como id_contribuinte
    return flattenNFeItems(nfesData.items, selectedContribuinte);
  }, [nfesData, selectedContribuinte]);

  // Função para agrupar itens por nome + código + NCM
  const groupItems = (items: DifalItem[]): DifalGroupedItem[] => {
    const groups = new Map<string, DifalItem[]>();
    
    items.forEach(item => {
      const key = `${item.xProd}|${item.cod_produto}|${item.cod_ncm}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    
    return Array.from(groups.entries()).map(([key, groupItems]) => {
      const first = groupItems[0];
      const uniqueNFes = new Set(groupItems.map(i => i.chave_nfe));
      
      return {
        groupKey: key,
        xProd: first.xProd,
        cod_produto: first.cod_produto,
        cod_ncm: first.cod_ncm,
        id_contribuinte: first.id_contribuinte,
        uf_emit: first.uf_emit,
        uf_dest: first.uf_dest,
        cst_icms: first.cst_icms,
        aliq_icms: first.aliq_icms,
        count: groupItems.length,
        totalValue: groupItems.reduce((sum, i) => sum + i.vProd, 0),
        nfesCount: uniqueNFes.size,
        items: groupItems,
        status: 'pendente' as const,
        classificacao: null,
      };
    });
  };

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

  // Itens agrupados com status (prioriza decisões locais)
  const groupedItems = useMemo(() => {
    const grouped = groupItems(flatItems);
    
    return grouped.map((group) => {
      const classifChave = `${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`;
      const classificacao = classificacoes?.[classifChave];
      
      // Verificar decisões locais em qualquer item do grupo
      const isLocallyDecided = group.items.some(item => {
        const chave = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
        return localDecisions.has(chave);
      });
      
      return {
        ...group,
        status: (isLocallyDecided || classificacao) ? 'validado' as const : 'pendente' as const,
        classificacao,
      };
    });
  }, [flatItems, classificacoes, localDecisions]);

  // Handler para criar ou atualizar sessão e disparar busca
  const handleSearch = async () => {
    if (!selectedContribuinte) {
      toast({
        title: 'Selecione um contribuinte',
        description: 'É necessário selecionar um contribuinte para buscar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Verificar se já existe uma sessão ativa para este usuário
      const { data: existingSession } = await supabase
        .from('difal_sessao')
        .select('id')
        .eq('usuario_id', user?.id || 'unknown')
        .eq('status', 'EM_ANDAMENTO')
        .maybeSingle();

      let sessionId: string;

      if (existingSession) {
        // Atualizar sessão existente com novos parâmetros
        const { error } = await supabase
          .from('difal_sessao')
          .update({
            cliente_id: selectedCliente,
            cliente_nome: clientes?.find(c => c.id === selectedCliente)?.nome || '',
            periodo: `${dataInicio} a ${dataFim}`,
            uf: 'MT',
            request_original: {
              contribuinte_id: selectedContribuinte,
              data_inicio: dataInicio,
              data_fim: dataFim,
            },
          })
          .eq('id', existingSession.id);

        if (error) throw error;
        sessionId = existingSession.id;
      } else {
        // Criar nova sessão
        const { data: session, error } = await supabase
          .from('difal_sessao')
          .insert({
            usuario_id: user?.id || 'unknown',
            cliente_id: selectedCliente,
            cliente_nome: clientes?.find(c => c.id === selectedCliente)?.nome || '',
            periodo: `${dataInicio} a ${dataFim}`,
            uf: 'MT',
            request_original: {
              contribuinte_id: selectedContribuinte,
              data_inicio: dataInicio,
              data_fim: dataFim,
            },
            status: 'EM_ANDAMENTO',
          })
          .select('id')
          .single();

        if (error) throw error;
        sessionId = session.id;
      }

      setActiveSessaoId(sessionId);

      // Buscar contagem de decisões existentes
      const { count } = await supabase
        .from('difal_decisao')
        .select('*', { count: 'exact', head: true })
        .eq('sessao_id', sessionId);

      setPendingDecisionsCount(count || 0);
      setSearchTriggered(true);

      toast({
        title: existingSession ? 'Sessão atualizada' : 'Sessão iniciada',
        description: 'As decisões serão salvas automaticamente.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerenciar sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedCliente('');
    setSelectedContribuinte('');
    setDataInicio(defaultDates.inicio);
    setDataFim(defaultDates.fim);
    setSearchTriggered(false);
    setActiveSessaoId(null);
    setPendingDecisionsCount(0);
  };

  const handleExportExcel = () => {
    toast({
      title: 'Exportação Teste Concluída',
      description: 'O endpoint de exportação será implementado em breve.',
    });
  };

  // Handler para sincronizar decisões com o banco principal
  const handleSaveChanges = async () => {
    if (!activeSessaoId || pendingDecisionsCount === 0) return;

    setIsSaving(true);

    try {
      // 1. Buscar decisões da sessão atual
      const { data: decisoes, error: fetchError } = await supabase
        .from('difal_decisao')
        .select('*')
        .eq('sessao_id', activeSessaoId);

      if (fetchError) throw fetchError;

      // 2. Montar payload para API de sync
      const payload: SyncPayload = {
        sessao_id: activeSessaoId,
        decisoes: (decisoes || []).map(d => ({
          id_contribuinte: flatItems[0]?.id_contribuinte || '',
          cod_produto: '', // Será mapeado pela API baseado no NCM
          cod_ncm: d.cod_ncm,
          decisao: d.decisao as TipoDecisao,
          id_icms_st: d.id_icms_st_bq,
        })),
      };

      // 3. Enviar para endpoint de sync
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/classificacoes/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao sincronizar classificações');
      }

      // 4. Atualizar status da sessão
      await supabase
        .from('difal_sessao')
        .update({
          status: 'SINCRONIZADO',
          sincronizado_em: new Date().toISOString(),
        })
        .eq('id', activeSessaoId);

      // 5. Limpar estado e invalidar cache
      setPendingDecisionsCount(0);
      setLocalDecisions(new Set()); // Limpar decisões locais após sincronização
      queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });

      toast({
        title: 'Alterações salvas',
        description: `${decisoes?.length || 0} decisão(ões) sincronizada(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao sincronizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
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
    setPendingDecisionsCount(prev => prev + 1);
    // Adicionar todos os itens do grupo ao set de decisões locais
    setLocalDecisions(prev => {
      const newSet = new Set(prev);
      group.items.forEach(item => {
        newSet.add(`${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`);
      });
      return newSet;
    });
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
    const validados = groupedItems.filter((g) => g.status === 'validado').length;
    const pendentes = groupedItems.filter((g) => g.status === 'pendente').length;
    const total = groupedItems.length;
    return { validados, pendentes, total };
  }, [groupedItems]);

  // Paginação
  const totalPages = Math.ceil(groupedItems.length / ITEMS_PER_PAGE);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return groupedItems.slice(startIndex, endIndex);
  }, [groupedItems, currentPage]);

  // Reset página ao mudar dados
  useEffect(() => {
    setCurrentPage(1);
  }, [flatItems]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const isLoading = isLoadingNFes || isLoadingClassificacoes;

  // UF destino para o modal
  const ufDestino = useMemo(() => {
    if (groupedItems.length > 0) {
      return groupedItems[0].uf_dest;
    }
    return 'MT'; // Default
  }, [groupedItems]);

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
                  setActiveSessaoId(null);
                  setPendingDecisionsCount(0);
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
                  setActiveSessaoId(null);
                  setPendingDecisionsCount(0);
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

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 pt-4 border-t border-slate-100">
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
      {searchTriggered && groupedItems.length > 0 && (
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

      {/* Botões de Ação: Salvar Alterações + Exportar */}
      {searchTriggered && groupedItems.length > 0 && (
        <div className="flex justify-end gap-2 mb-4">
          {/* Indicador de decisões pendentes */}
          {pendingDecisionsCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 h-9 px-3">
              <AlertCircle className="h-4 w-4" />
              {pendingDecisionsCount} decisão(ões) não sincronizada(s)
            </Badge>
          )}
          
          {/* Botão Salvar Alterações */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveChanges}
            disabled={pendingDecisionsCount === 0 || isSaving}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
          
          {/* Botão Exportar Excel */}
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
            ) : groupedItems.length === 0 ? (
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
                      <TableHead className="w-[100px]">NCM</TableHead>
                      <TableHead className="w-[80px]">Origem</TableHead>
                      <TableHead className="w-[150px]">Tributação</TableHead>
                      <TableHead className="w-[120px]">MVA/ST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((group) => (
                      <TableRow
                        key={group.groupKey}
                        className={`
                          ${group.status === 'pendente' ? 'cursor-pointer hover:bg-amber-50' : 'hover:bg-slate-50'}
                        `}
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
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-900 line-clamp-1">
                              {group.xProd}
                            </p>
                            <p className="text-xs text-slate-500">
                              Cód: {group.cod_produto}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{group.cod_ncm}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{group.uf_emit}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-slate-600">CST:</span>{' '}
                            <span className="font-mono">{group.cst_icms || '—'}</span>
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
                              <span className="font-mono">
                                {group.classificacao.aliquota_st}%
                              </span>
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
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Exibindo {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, groupedItems.length)} de {groupedItems.length} itens
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers().map((page, idx) => (
                          <PaginationItem key={idx}>
                            {page === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
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
        group={selectedGroup}
        ufDestino={ufDestino}
        sessaoId={activeSessaoId}
        onDecisionSaved={handleDecisionSaved}
      />

    </DevLayout>
  );
};

export default AuditoriaFiscal;
