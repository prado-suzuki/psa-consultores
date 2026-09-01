import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calculator } from 'lucide-react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { DifalAuditModal } from '@/components/equipe/dev/DifalAuditModal';
import { DifalFiltersCard } from '@/components/equipe/dev/processo-difal/DifalFiltersCard';
import { DifalProductsCard } from '@/components/equipe/dev/processo-difal/DifalProductsCard';
import {
  DifalSummaryActions,
  type DifalStatusFilter,
} from '@/components/equipe/dev/processo-difal/DifalSummaryActions';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useProcessoDifalClientesQuery,
  useProcessoDifalContribuintesQuery,
  useProcessoDifalGroupedItemsQuery,
  useProcessoDifalClassificacoesQuery,
} from '@/hooks/useDomainProcessoDifalQueries';
import { useDomainProcessoDifalSession } from '@/hooks/useDomainProcessoDifalSession';
import { useProcessoDifalExport } from '@/hooks/useProcessoDifalExport';
import {
  applyDifalClassifications,
  buildProcessoDifalStats,
  mapDifalApiItems,
  PROCESSO_DIFAL_ITEMS_PER_PAGE,
  type ProcessoDifalStats,
} from '@/lib/processoDifal';
import type { DifalGroupedItem } from '@/types/difal';

const getDefaultDates = () => {
  const now = new Date();
  const firstDay = startOfMonth(now);
  const lastDay = endOfMonth(now);
  return { inicio: format(firstDay, 'yyyy-MM-dd'), fim: format(lastDay, 'yyyy-MM-dd') };
};

const ProcessoDifal = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const defaultDates = getDefaultDates();
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>('');
  const [start_date, setDataInicio] = useState(defaultDates.inicio);
  const [end_date, setDataFim] = useState(defaultDates.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [, setIsLoadingSession] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DifalStatusFilter>('all');
  const [selectedGroup, setSelectedGroup] = useState<DifalGroupedItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [localDecisions, setLocalDecisions] = useState<Set<string>>(new Set());
  const [globalStats, setGlobalStats] = useState<ProcessoDifalStats | null>(null);
  const { restoreSessionMutation, searchSessionMutation, syncSessionMutation } =
    useDomainProcessoDifalSession();
  const { exportExcel, exportStatus, isExporting } = useProcessoDifalExport();
  const { data: clientes, isLoading: isLoadingClientes } = useProcessoDifalClientesQuery();
  const { data: contribuintes, isLoading: isLoadingContribuintes } =
    useProcessoDifalContribuintesQuery(selectedCliente);
  const {
    data: apiGroupedData,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useProcessoDifalGroupedItemsQuery({
    selectedContribuinte,
    startDate: start_date,
    endDate: end_date,
    currentPage,
    statusFilter,
    searchTriggered,
  });
  const groupedItemsFromApi = useMemo(
    () =>
      apiGroupedData?.items && selectedContribuinte
        ? mapDifalApiItems(apiGroupedData.items, selectedContribuinte)
        : [],
    [apiGroupedData, selectedContribuinte],
  );
  const { data: classificacoes, isLoading: isLoadingClassificacoes } =
    useProcessoDifalClassificacoesQuery(groupedItemsFromApi);
  const groupedItems = useMemo(
    () => applyDifalClassifications(groupedItemsFromApi, classificacoes, localDecisions),
    [groupedItemsFromApi, classificacoes, localDecisions],
  );

  useEffect(() => {
    if (contribuintes?.length === 1 && !selectedContribuinte)
      setSelectedContribuinte(contribuintes[0].id);
  }, [contribuintes, selectedContribuinte]);

  useEffect(() => {
    const loadLastSession = async () => {
      if (!user?.id) {
        setIsLoadingSession(false);
        return;
      }
      try {
        const session = await restoreSessionMutation.mutateAsync(user.id);
        if (!session) return;
        setActiveSessaoId(session.id);
        setSelectedCliente(session.clienteId);
        if (session.request.data_inicio) setDataInicio(session.request.data_inicio);
        if (session.request.data_fim) setDataFim(session.request.data_fim);
        if (session.request.contribuinte_id) {
          const contribuinteId = session.request.contribuinte_id;
          setTimeout(() => setSelectedContribuinte(contribuinteId), 500);
        }
        setPendingDecisionsCount(session.decisionsCount);
        if (session.status === 'EM_ANDAMENTO') setTimeout(() => setSearchTriggered(true), 600);
        toast({ title: 'Sessão restaurada', description: 'Continuando de onde você parou.' });
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };
    loadLastSession();
    // A restauração continua vinculada somente à troca de usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (apiGroupedData && searchTriggered && statusFilter === 'all') {
      setGlobalStats(
        buildProcessoDifalStats(apiGroupedData.qtdValidados, apiGroupedData.qtdPendentes),
      );
    }
  }, [apiGroupedData, searchTriggered, statusFilter]);

  const handleSearch = async () => {
    const missing: string[] = [];
    if (!selectedCliente) missing.push('Cliente');
    if (!selectedContribuinte) missing.push('Contribuinte');
    if (!start_date) missing.push('Data Início');
    if (!end_date) missing.push('Data Fim');
    if (missing.length > 0) {
      toast({
        title: 'Preenchimento obrigatório',
        description: `Por favor, preencha ${missing.join(', ')} para realizar a busca.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await searchSessionMutation.mutateAsync({
        userId: user?.id || 'unknown',
        clienteId: selectedCliente,
        clienteNome: clientes?.find((cliente) => cliente.id === selectedCliente)?.nome || '',
        contribuinteId: selectedContribuinte,
        startDate: start_date,
        endDate: end_date,
      });
      setActiveSessaoId(result.sessionId);
      setPendingDecisionsCount(result.decisionsCount);
      setSearchTriggered(true);
      setStatusFilter('all');
      toast({
        title: result.existingSession ? 'Sessão atualizada' : 'Sessão iniciada',
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

  const handleClienteChange = (value: string) => {
    setSelectedCliente(value);
    setSelectedContribuinte('');
    setSearchTriggered(false);
    setActiveSessaoId(null);
    setPendingDecisionsCount(0);
  };

  const handleContribuinteChange = (value: string) => {
    setSelectedContribuinte(value);
    setSearchTriggered(false);
    setActiveSessaoId(null);
    setPendingDecisionsCount(0);
  };

  const handleStartDateChange = (value: string) => {
    setDataInicio(value);
    setSearchTriggered(false);
  };

  const handleEndDateChange = (value: string) => {
    setDataFim(value);
    setSearchTriggered(false);
  };

  const handleClearFilters = () => {
    setSelectedCliente('');
    setSelectedContribuinte('');
    setDataInicio(defaultDates.inicio);
    setDataFim(defaultDates.fim);
    setSearchTriggered(false);
    setActiveSessaoId(null);
    setPendingDecisionsCount(0);
    setStatusFilter('all');
    setGlobalStats(null);
  };

  const handleStatusFilterChange = (filter: DifalStatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleExportExcel = () =>
    exportExcel({
      contribuinteId: selectedContribuinte,
      startDate: start_date,
      endDate: end_date,
      pendingDecisionsCount,
    });

  const handleSaveChanges = async () => {
    if (!activeSessaoId || pendingDecisionsCount === 0) return;
    setIsSaving(true);
    try {
      const decisionCount = await syncSessionMutation.mutateAsync({
        sessionId: activeSessaoId,
        groupedItems,
      });
      setActiveSessaoId(null);
      setPendingDecisionsCount(0);
      setLocalDecisions(new Set());
      queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['difal-grouped-items'] });
      toast({
        title: 'Alterações salvas',
        description: `${decisionCount} decisão(ões) sincronizada(s). Os dados foram recarregados.`,
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
    setSelectedGroup(group);
    setModalOpen(true);
  };

  const handleDecisionSaved = (group: DifalGroupedItem) => {
    setPendingDecisionsCount((prev) => prev + 1);
    setLocalDecisions((prev) => {
      const newSet = new Set(prev);
      newSet.add(`${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`);
      return newSet;
    });
  };

  const totalItems = globalStats?.total ?? 0;
  const totalPages = Math.ceil(totalItems / PROCESSO_DIFAL_ITEMS_PER_PAGE);
  const hasMore = apiGroupedData?.hasMore ?? false;
  const qtdValidados = globalStats?.validados ?? 0;
  const qtdPendentes = globalStats?.pendentes ?? 0;
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) setCurrentPage(currentPage - 1);
    else if (direction === 'next' && hasMore) setCurrentPage(currentPage + 1);
  };
  const isLoading = isLoadingItems || isLoadingClassificacoes;

  return (
    <DevLayout
      title="DIFAL Inteligente"
      subtitle="Auditoria e classificação fiscal de produtos"
      sopUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/"
    >
      <TooltipProvider delayDuration={300}>
        <DevPageHeader
          description="A ferramenta **DIFAL Inteligente** centraliza a busca e a classificação tributária das operações de Diferencial de Alíquota da base de dados. Utilize os filtros abaixo para buscar os itens das notas fiscais por período, permitindo identificar pendências de NCM, definir regras tributárias individuais em tela, sincronizar os dados validados com o servidor e exportar os resultados consolidados em formato Excel (.xlsx)."
          manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/"
        />
        <DifalFiltersCard
          selectedCliente={selectedCliente}
          selectedContribuinte={selectedContribuinte}
          startDate={start_date}
          endDate={end_date}
          clientes={clientes}
          contribuintes={contribuintes}
          isLoadingClientes={isLoadingClientes}
          isLoadingContribuintes={isLoadingContribuintes}
          isLoading={isLoading}
          onClienteChange={handleClienteChange}
          onContribuinteChange={handleContribuinteChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onClear={handleClearFilters}
          onSearch={handleSearch}
        />
        <DifalSummaryActions
          searchTriggered={searchTriggered}
          hasItems={groupedItems.length > 0}
          totalItems={totalItems}
          qtdValidados={qtdValidados}
          qtdPendentes={qtdPendentes}
          statusFilter={statusFilter}
          pendingDecisionsCount={pendingDecisionsCount}
          isSaving={isSaving}
          isExporting={isExporting}
          exportStatus={exportStatus}
          onStatusFilterChange={handleStatusFilterChange}
          onSaveChanges={handleSaveChanges}
          onExportExcel={handleExportExcel}
        />
        {searchTriggered && (
          <DifalProductsCard
            groupedItems={groupedItems}
            isLoading={isLoading}
            itemsError={itemsError}
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            hasMore={hasMore}
            onGroupClick={handleGroupClick}
            onPageChange={handlePageChange}
          />
        )}
        {!searchTriggered && (
          <Card className="border-border border-dashed">
            <CardContent className="p-12 text-center">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">DIFAL Inteligente</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Selecione um contribuinte e período para carregar os produtos de notas fiscais e
                iniciar a auditoria de classificação fiscal.
              </p>
            </CardContent>
          </Card>
        )}
        <DifalAuditModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          group={selectedGroup}
          ufDestino="MT"
          sessaoId={activeSessaoId}
          onDecisionSaved={handleDecisionSaved}
        />
      </TooltipProvider>
    </DevLayout>
  );
};

export default ProcessoDifal;
