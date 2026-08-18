import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { ControlePerdcompFilters } from '@/components/equipe/dev/perdcomp/controle/ControlePerdcompFilters';
import { ControlePerdcompResults } from '@/components/equipe/dev/perdcomp/controle/ControlePerdcompResults';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';
import { PerDetailModal } from '@/components/equipe/dev/perdcomp/PerDetailModal';
import { PerFormModal } from '@/components/equipe/dev/perdcomp/PerFormModal';
import { SoftDeleteModal } from '@/components/equipe/dev/perdcomp/SoftDeleteModal';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useBuscarProcessoGlobalPerdcomp,
  useClientesControlePerdcomp,
  useContribuintesControlePerdcomp,
  useDcompsControlePerdcomp,
  useDistribuicoesControlePerdcomp,
  usePersControlePerdcomp,
  useSituacoesControlePerdcomp,
  useSituacoesDistintasControlePerdcomp,
} from '@/hooks/useDomainPerdcomp';
import { useSelicDataPerPer } from '@/hooks/useSelicDataPerPer';
import {
  buildControlePagination,
  buildSelicPerInputs,
  calculateControleTotals,
  calculateSelicCorrections,
  filterControlePers,
  getCurrentDcompDocumentNumbers,
  getRectifiedDcompNumbers,
  mergeControleSituacoes,
  sortControlePers,
  sumCompensatedByPer,
  sumOriginalDistributedByPer,
  type ControlePer,
} from '@/lib/controlePerdcomp';

const ITEMS_PER_PAGE = 10;

export default function ControlePerdcomp() {
  // Planilha de 16 colunas (min-w-[1400px]) com rodapé fixo: pede a largura toda.
  useTelaDeTrabalhoLargo();

  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [exercicioFilter, setExercicioFilter] = useState('');
  const [processoFilter, setProcessoFilter] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editData, setEditData] = useState<ControlePer | null>(null);
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [softDeleteType, setSoftDeleteType] = useState<'per' | 'dcomp'>('per');
  const [softDeleteId, setSoftDeleteId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPer, setSelectedPer] = useState<ControlePer | null>(null);

  const { data: clientes = [] } = useClientesControlePerdcomp();
  const { data: contribuintes = [] } = useContribuintesControlePerdcomp(clienteId);

  useEffect(() => {
    if (clienteId && contribuintes.length === 1 && !contribuinteId)
      setContribuinteId(contribuintes[0].id);
  }, [clienteId, contribuintes, contribuinteId]);

  const {
    data: perData = [],
    isLoading: perLoading,
    isError: perError,
  } = usePersControlePerdcomp(contribuinteId, searched);
  const { data: perSituacoesMap = {} } = useSituacoesControlePerdcomp(contribuinteId, searched);
  const { data: dcompData = [], isLoading: dcompLoading } = useDcompsControlePerdcomp(
    contribuinteId,
    searched,
  );
  const globalProcessLookup = useBuscarProcessoGlobalPerdcomp();

  const handleSearch = async () => {
    if (processoFilter) {
      const result = await globalProcessLookup.mutateAsync(processoFilter);
      if (result.status === 'invalid') return void toast.error('Número de processo inválido');
      if (result.status === 'not-found')
        return void toast.error('Nenhum PER ou DCOMP encontrado com esse número');
      if (result.status === 'unlinked')
        return void toast.error('Contribuinte sem cliente vinculado');
      setClienteId(result.clienteId);
      setContribuinteId(result.contribuinteId);
      setSearched(true);
      return;
    }

    const missing: string[] = [];
    if (!clienteId) missing.push('Cliente');
    if (!contribuinteId) missing.push('Contribuinte');
    if (missing.length > 0) {
      toast.error('Preenchimento obrigatório', {
        description: `Por favor, preencha ${missing.join(', ')} para realizar a busca.`,
      });
      return;
    }
    setSearched(true);
  };

  const handleClear = () => {
    setClienteId('');
    setContribuinteId('');
    setExercicioFilter('');
    setProcessoFilter('');
    setSituacaoFilter([]);
    setSearched(false);
    setCurrentPage(1);
    setSortColumn(null);
  };

  const dcompsRetificadosSet = useMemo(() => getRectifiedDcompNumbers(dcompData), [dcompData]);
  const dcompTotalMap = useMemo(
    () => sumCompensatedByPer(dcompData, dcompsRetificadosSet),
    [dcompData, dcompsRetificadosSet],
  );
  const dcompsVigentesNrDocs = useMemo(
    () => getCurrentDcompDocumentNumbers(dcompData, dcompsRetificadosSet),
    [dcompData, dcompsRetificadosSet],
  );
  const { data: distribuicoesData = [] } = useDistribuicoesControlePerdcomp(
    contribuinteId,
    dcompsVigentesNrDocs,
    searched,
  );
  const dcompOriginalMap = useMemo(
    () => sumOriginalDistributedByPer(distribuicoesData, dcompData, dcompsRetificadosSet),
    [distribuicoesData, dcompData, dcompsRetificadosSet],
  );
  const filteredPerData = useMemo(
    () =>
      filterControlePers(perData, dcompData, perSituacoesMap, {
        exercicio: exercicioFilter,
        processo: processoFilter,
        situacoes: situacaoFilter,
      }),
    [perData, dcompData, perSituacoesMap, exercicioFilter, processoFilter, situacaoFilter],
  );
  const { data: dbSituacoes = [] } = useSituacoesDistintasControlePerdcomp();
  const allSituacoes = useMemo(() => mergeControleSituacoes(dbSituacoes), [dbSituacoes]);
  const {
    data: selicPerMap = {},
    isLoading: selicLoading,
    error: selicError,
  } = useSelicDataPerPer(buildSelicPerInputs(filteredPerData));

  useEffect(() => {
    if (selicError) toast.error(`SELIC indisponível: ${(selicError as Error).message}`);
  }, [selicError]);

  const selicCorrectionMap = useMemo(
    () => calculateSelicCorrections(filteredPerData, selicPerMap, dcompTotalMap, dcompOriginalMap),
    [selicPerMap, filteredPerData, dcompTotalMap, dcompOriginalMap],
  );
  const totals = useMemo(
    () =>
      calculateControleTotals(filteredPerData, dcompTotalMap, dcompOriginalMap, selicCorrectionMap),
    [filteredPerData, dcompTotalMap, dcompOriginalMap, selicCorrectionMap],
  );
  const sortedData = useMemo(
    () =>
      sortControlePers(
        filteredPerData,
        sortColumn,
        sortDirection,
        perSituacoesMap,
        dcompTotalMap,
        dcompOriginalMap,
        selicCorrectionMap,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Preserve the legacy stale-sort dependency behavior.
    [
      filteredPerData,
      sortColumn,
      sortDirection,
      perSituacoesMap,
      dcompTotalMap,
      selicCorrectionMap,
    ],
  );
  const pagination = buildControlePagination(sortedData, currentPage, ITEMS_PER_PAGE);

  const handleSort = (column: string) => {
    if (sortColumn === column)
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSituacoesChange = (situacoes: string[]) => {
    setSituacaoFilter(situacoes);
    setCurrentPage(1);
  };

  const handleNew = () => {
    setEditData(null);
    setFormModalOpen(true);
  };

  const handleEdit = (item: ControlePer) => {
    setEditData(item);
    setFormModalOpen(true);
  };

  const handlePerClick = (item: ControlePer) => {
    setSelectedPer(item);
    setDetailModalOpen(true);
  };

  const handleSoftDeletePer = (item: ControlePer) => {
    setSoftDeleteType('per');
    setSoftDeleteId(item.nr_per);
    setSoftDeleteOpen(true);
  };

  const isLoading = perLoading || dcompLoading;

  return (
    <DevLayout
      title="Controle PERDCOMP"
      subtitle="Gerenciamento de PER e DCOMP"
      sopUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp/"
    >
      <TooltipProvider delayDuration={300}>
        <DevPageHeader
          description="A ferramenta **Controle PERDCOMP** centraliza a busca e o gerenciamento dos Processos de Ressarcimento e Compensação da base de dados. Utilize os filtros abaixo para consultar processos específicos ou analisar exercícios inteiros, permitindo a visualização detalhada e atualização de status em tela, o cadastro de novas DCOMPs vinculadas e o registro de pagamentos efetivos de ressarcimentos."
          manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp/"
        />
        <ControlePerdcompFilters
          clienteId={clienteId}
          contribuinteId={contribuinteId}
          exercicio={exercicioFilter}
          processo={processoFilter}
          situacoes={situacaoFilter}
          clientes={clientes}
          contribuintes={contribuintes}
          allSituacoes={allSituacoes}
          isSearching={isLoading || globalProcessLookup.isPending}
          onClienteChange={(value) => {
            setClienteId(value);
            setContribuinteId('');
          }}
          onContribuinteChange={setContribuinteId}
          onExercicioChange={setExercicioFilter}
          onProcessoChange={setProcessoFilter}
          onSituacoesChange={handleSituacoesChange}
          onSearch={handleSearch}
          onClear={handleClear}
        />
        <ControlePerdcompResults
          searched={searched}
          contribuinteId={contribuinteId}
          isLoading={isLoading}
          isError={perError}
          paginatedData={pagination.items}
          sortedCount={sortedData.length}
          filteredCount={filteredPerData.length}
          pagination={pagination}
          currentPage={currentPage}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          perSituacoesMap={perSituacoesMap}
          dcompTotalMap={dcompTotalMap}
          dcompOriginalMap={dcompOriginalMap}
          selicCorrectionMap={selicCorrectionMap}
          selicLoading={selicLoading}
          selicError={selicError as Error | null}
          totals={totals}
          onNew={handleNew}
          onSort={handleSort}
          onPageChange={setCurrentPage}
          onRowClick={handlePerClick}
          onEdit={handleEdit}
          onDelete={handleSoftDeletePer}
        />
        <PerFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          editData={editData}
          clienteId={clienteId}
          contribuinteId={contribuinteId}
        />
        <SoftDeleteModal
          open={softDeleteOpen}
          onOpenChange={setSoftDeleteOpen}
          type={softDeleteType}
          identifier={softDeleteId}
        />
        <PerDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          per={selectedPer}
          contribuinteId={contribuinteId}
        />
      </TooltipProvider>
    </DevLayout>
  );
}
