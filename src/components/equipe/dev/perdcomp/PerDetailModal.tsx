import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  useClearPerReimbursement,
  useInsertPerSituationDetail,
  usePerDcompsDetail,
  usePerDetail,
  usePerDistribuicoesDetail,
  usePerSituacoesDetail,
  useRegisterPerReimbursement,
  useSyncPerdcompDetail,
} from '@/hooks/useDomainPerdcompDetail';
import { useSelicTaxaAt } from '@/hooks/useSelicTaxaAt';
import {
  aggregateTributesByDcomp,
  calculateCurrentSelic,
  calculateReimbursementValues,
  calculateRemainingBalance,
  findOriginalDcomp,
  getAvailableTributes,
  getCurrentDcomps,
  getDisplayedDcomps,
  parseCurrencyInput,
  type PerdcompDetailDcomp,
  type PerdcompDetailPer,
} from '@/lib/perdcompDetail';
import { normalizeCurrencyZero, normalizeProcessNumber } from '@/lib/perdcompUtils';
import { cn } from '@/lib/utils';
import { DcompFormModal } from './DcompFormModal';
import { SoftDeleteModal } from './SoftDeleteModal';
import {
  PerDetailDcompPanel,
  type PerDetailDcompRow,
} from '@/components/equipe/dev/perdcomp/per-detail/PerDetailDcompPanel';
import { PerDetailHeader } from '@/components/equipe/dev/perdcomp/per-detail/PerDetailHeader';
import { PerDetailRessarcimentoDialogs } from '@/components/equipe/dev/perdcomp/per-detail/PerDetailRessarcimentoDialogs';
import { PerDetailSituationSidebar } from '@/components/equipe/dev/perdcomp/per-detail/PerDetailSituationSidebar';

type PerData = Pick<
  PerdcompDetailPer,
  | 'nr_per'
  | 'id_contribuinte'
  | 'exercicio'
  | 'tri_exercicio'
  | 'dt_solicitada'
  | 'tp_credito'
  | 'vlr_credito'
  | 'vlr_ressarcido'
  | 'vlr_ressarcido_original'
  | 'nr_proc_ret'
> & { contribuinte?: { nome_razao_social: string } | null };

interface PerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  per: PerData | null;
  contribuinteId: string;
}

const SITUACAO_OPTIONS = [
  { value: 'Analise concluida', label: 'Análise concluída' },
  { value: 'Analise preliminar disponibilizada', label: 'Análise preliminar disponibilizada' },
  { value: 'Contribuinte intimado', label: 'Contribuinte intimado' },
  { value: 'Despacho decisorio emitido', label: 'Despacho decisório emitido' },
  { value: 'Em analise', label: 'Em análise' },
  { value: 'Em discussao administrativa - CARF', label: 'Em discussão administrativa - CARF' },
  { value: 'Em discussao administrativa - CSRF', label: 'Em discussão administrativa - CSRF' },
  { value: 'Em discussao administrativa - DRJ', label: 'Em discussão administrativa - DRJ' },
  { value: 'Homologado', label: 'Homologado' },
  { value: 'Nao admitido', label: 'Não admitido' },
  { value: 'PER deferido', label: 'PER deferido' },
  { value: 'Retificado', label: 'Retificado' },
];

const SITUACAO_COLORS: Record<string, string> = {
  'Analise concluida': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Analise preliminar disponibilizada':
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Contribuinte intimado':
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Despacho decisorio emitido':
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Em analise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Em discussao administrativa - CARF':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - CSRF':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - DRJ':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Homologado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Nao admitido': 'bg-status-neutro-soft text-status-neutro dark:bg-gray-900/30 dark:text-gray-400',
  'Pedido de cancelamento deferido':
    'bg-status-neutro-soft text-status-neutro dark:bg-slate-900/30 dark:text-slate-400',
  'PER deferido': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Retificado: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Deferido: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Analisado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Em análise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(normalizeCurrencyZero(value));

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export function PerDetailModal({ open, onOpenChange, per, contribuinteId }: PerDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [novaSituacao, setNovaSituacao] = useState('');
  const [dcompModalOpen, setDcompModalOpen] = useState(false);
  const [editDcompData, setEditDcompData] = useState<PerdcompDetailDcomp | null>(null);
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [softDeleteType, setSoftDeleteType] = useState<'per' | 'dcomp'>('per');
  const [softDeleteId, setSoftDeleteId] = useState('');
  const [ressarcimentoOpen, setRessarcimentoOpen] = useState(false);
  const [ressarcimentoValor, setRessarcimentoValor] = useState('');
  const [ressarcimentoData, setRessarcimentoData] = useState('');
  const [ressarcimentoCalOpen, setRessarcimentoCalOpen] = useState(false);
  const [deleteRessarcimentoOpen, setDeleteRessarcimentoOpen] = useState(false);
  const [tributoFiltro, setTributoFiltro] = useState('__todos__');

  const { data: perAtualizado } = usePerDetail(per?.nr_per, open);
  const perAtual = perAtualizado || per;
  const vlrRessarcido = perAtual?.vlr_ressarcido || 0;
  const perPago = vlrRessarcido > 0;
  const { data: dcomps = [], isLoading: loadingDcomps } = usePerDcompsDetail(per?.nr_per, open);
  const { data: situacoes = [], isLoading: loadingSituacoes } = usePerSituacoesDetail(
    per?.nr_per,
    open,
  );
  const situacaoAtual = situacoes.length > 0 ? situacoes[0].situacao : null;
  const sitComPagamento = situacoes.find((situacao) => situacao.dt_pagamento);
  const dcompsVigentes = useMemo(() => getCurrentDcomps(dcomps), [dcomps]);
  const dcompsVigentesNrDocs = useMemo(
    () => dcompsVigentes.map((dcomp) => dcomp.nr_documento),
    [dcompsVigentes],
  );
  const { data: distribuicoesPorDcomp = [] } = usePerDistribuicoesDetail(
    per?.nr_per,
    dcompsVigentesNrDocs,
    open,
  );
  const tributosDisponiveis = useMemo(
    () => getAvailableTributes(distribuicoesPorDcomp),
    [distribuicoesPorDcomp],
  );
  const valorPorDcompTributo = useMemo(
    () => aggregateTributesByDcomp(distribuicoesPorDcomp),
    [distribuicoesPorDcomp],
  );
  const saldoRestante = useMemo(
    () =>
      calculateRemainingBalance(
        perAtual,
        distribuicoesPorDcomp,
        dcompsVigentesNrDocs,
        vlrRessarcido,
      ),
    [perAtual, distribuicoesPorDcomp, dcompsVigentesNrDocs, vlrRessarcido],
  );
  const dcompsExibidos = useMemo(
    () => getDisplayedDcomps(dcompsVigentes, tributoFiltro, valorPorDcompTributo),
    [dcompsVigentes, tributoFiltro, valorPorDcompTributo],
  );
  const dcompRows: PerDetailDcompRow[] = dcompsExibidos.map((item) => ({
    ...item,
    originalDoc: findOriginalDcomp(item.dcomp.nr_documento, dcomps),
    isRetificacao: !!item.dcomp.nr_dcomp_ret,
    tooltipTodos: item.tributosTodos
      ?.map((tributo) => `${tributo.tributo}: ${formatCurrency(tributo.valor)}`)
      .join('\n'),
  }));

  const hojeStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const {
    data: selicResultAtual,
    error: selicAtualError,
    isLoading: selicAtualLoading,
  } = useSelicTaxaAt(perAtual?.dt_solicitada, hojeStr);
  const { emCarencia, value: vlrSelic } = calculateCurrentSelic(
    perAtual?.dt_solicitada,
    saldoRestante,
    selicResultAtual?.fator,
  );
  const selicAtualIndisponivel =
    !!perAtual?.dt_solicitada && !emCarencia && !selicAtualLoading && !selicResultAtual;
  const {
    data: selicResultRess,
    error: selicRessError,
    isLoading: selicRessLoading,
  } = useSelicTaxaAt(perAtual?.dt_solicitada, ressarcimentoData || null);
  const ressarcimentoValorNumerico = useMemo(
    () => parseCurrencyInput(ressarcimentoValor),
    [ressarcimentoValor],
  );
  const {
    emCarencia: emCarenciaRess,
    fator: fatorRessarcimento,
    valorOriginal: ressarcimentoValorOriginal,
  } = useMemo(
    () =>
      calculateReimbursementValues(
        perAtual?.dt_solicitada,
        ressarcimentoData,
        ressarcimentoValorNumerico,
        selicResultRess?.fator,
      ),
    [
      perAtual?.dt_solicitada,
      ressarcimentoData,
      ressarcimentoValorNumerico,
      selicResultRess?.fator,
    ],
  );
  const selicRessIndisponivel =
    !!perAtual?.dt_solicitada &&
    !!ressarcimentoData &&
    !emCarenciaRess &&
    !selicRessLoading &&
    !selicResultRess;

  const syncPerdcompDetail = useSyncPerdcompDetail();
  const updateSituacaoMutation = useInsertPerSituationDetail({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['per-situacoes', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('Situação atualizada com sucesso!');
      setNovaSituacao('');
      if (data) syncPerdcompDetail({ per_situacao: [data] });
    },
    onError: (error) => toast.error(`Erro ao atualizar situação: ${error.message}`),
  });
  const ressarcimentoMutation = useRegisterPerReimbursement({
    onSuccess: async ({ valor: savedValue, sitData }) => {
      await queryClient.refetchQueries({ queryKey: ['per-detail', per?.nr_per] });
      await queryClient.refetchQueries({ queryKey: ['per-situacoes', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      await queryClient.refetchQueries({ queryKey: ['per-dcomps', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('Ressarcimento registrado com sucesso!');
      setRessarcimentoOpen(false);
      setRessarcimentoValor('');
      setRessarcimentoData('');
      if (per)
        syncPerdcompDetail({
          per: [
            {
              nr_per: per.nr_per,
              id_contribuinte: per.id_contribuinte,
              exercicio: per.exercicio,
              tri_exercicio: per.tri_exercicio,
              dt_solicitada: per.dt_solicitada,
              tp_credito: per.tp_credito,
              vlr_credito: per.vlr_credito,
              vlr_ressarcido: savedValue,
              nr_proc_ret: per.nr_proc_ret,
            },
          ],
          per_situacao: sitData ? [sitData] : undefined,
        });
    },
    onError: (error) => toast.error(`Erro ao registrar ressarcimento: ${error.message}`),
  });
  const deleteRessarcimentoMutation = useClearPerReimbursement({
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['per-detail', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('Ressarcimento excluído com sucesso.');
      setDeleteRessarcimentoOpen(false);
    },
    onError: (error) => toast.error(`Erro ao excluir ressarcimento: ${error.message}`),
  });

  const handleUpdateSituacao = () => {
    if (!novaSituacao) return void toast.error('Selecione uma situação');
    updateSituacaoMutation.mutate({ nr_proc_per: per?.nr_per, situacao: novaSituacao });
  };
  const handleSaveRessarcimento = () => {
    if (ressarcimentoValorNumerico <= 0) return void toast.error('Informe um valor válido');
    if (!ressarcimentoData) return void toast.error('Informe a data do pagamento');
    ressarcimentoMutation.mutate({
      nrPer: per?.nr_per,
      valor: ressarcimentoValorNumerico,
      valorOriginal: ressarcimentoValorOriginal,
      dataPagamento: ressarcimentoData,
    });
  };
  const handleNewDcomp = () => {
    setEditDcompData(null);
    setDcompModalOpen(true);
  };
  const handleEditDcomp = (dcomp: PerdcompDetailDcomp) => {
    setEditDcompData(dcomp);
    setDcompModalOpen(true);
  };
  const handleDeleteDcomp = (dcomp: PerdcompDetailDcomp) => {
    setSoftDeleteType('dcomp');
    setSoftDeleteId(dcomp.nr_documento);
    setSoftDeleteOpen(true);
  };
  const handleDeletePer = () => {
    if (!per) return;
    setSoftDeleteType('per');
    setSoftDeleteId(per.nr_per);
    setSoftDeleteOpen(true);
  };

  if (!per) return null;
  const ressarcimentoDate = ressarcimentoData
    ? new Date(`${ressarcimentoData}T00:00:00`)
    : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0',
            'flex flex-col overflow-hidden',
            '[&>button]:hidden',
          )}
        >
          <DialogTitle className="sr-only">Detalhes do PER</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização detalhada do processo PER com DCOMPs e situações
          </DialogDescription>
          <PerDetailHeader
            nrPer={per.nr_per}
            tipoCredito={per.tp_credito}
            contribuinteNome={per.contribuinte?.nome_razao_social}
            exercicio={per.exercicio}
            trimestre={per.tri_exercicio}
            nrProcessoRetificado={per.nr_proc_ret}
            valorCredito={per.vlr_credito}
            saldoRestante={saldoRestante}
            emCarencia={emCarencia}
            valorSelic={vlrSelic?.valor ?? null}
            selicIndisponivel={selicAtualIndisponivel}
            selicError={selicAtualError?.message}
            formatCurrency={formatCurrency}
            formatProcessNumber={normalizeProcessNumber}
            onDelete={handleDeletePer}
            onClose={() => onOpenChange(false)}
          />
          <div className="flex-1 flex overflow-hidden">
            <PerDetailSituationSidebar
              situacaoAtual={situacaoAtual}
              situacaoColors={SITUACAO_COLORS}
              situacaoOptions={SITUACAO_OPTIONS}
              novaSituacao={novaSituacao}
              onNovaSituacaoChange={setNovaSituacao}
              onUpdateSituacao={handleUpdateSituacao}
              updatePending={updateSituacaoMutation.isPending}
              situacoes={situacoes}
              loadingSituacoes={loadingSituacoes}
              perPago={perPago}
              vlrRessarcido={vlrRessarcido}
              vlrRessarcidoOriginal={perAtual?.vlr_ressarcido_original}
              dataPagamento={sitComPagamento?.dt_pagamento}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              onDeleteRessarcimento={() => setDeleteRessarcimentoOpen(true)}
            />
            <PerDetailDcompPanel
              rows={dcompRows}
              loading={loadingDcomps}
              tributoFiltro={tributoFiltro}
              onTributoFiltroChange={setTributoFiltro}
              tributosDisponiveis={tributosDisponiveis}
              perPago={perPago}
              saldoRestante={saldoRestante}
              valorCredito={per.vlr_credito}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              formatProcessNumber={normalizeProcessNumber}
              onExport={() => toast.info('Exportação em desenvolvimento')}
              onNewRessarcimento={() => setRessarcimentoOpen(true)}
              onNewDcomp={handleNewDcomp}
              onEditDcomp={handleEditDcomp}
              onDeleteDcomp={handleDeleteDcomp}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DcompFormModal
        open={dcompModalOpen}
        onOpenChange={(modalOpen) => {
          setDcompModalOpen(modalOpen);
          if (!modalOpen) {
            queryClient.refetchQueries({ queryKey: ['per-dcomps', per?.nr_per] });
            queryClient.refetchQueries({ queryKey: ['per-detail', per?.nr_per] });
          }
        }}
        editData={editDcompData}
        contribuinteId={contribuinteId}
        preSelectedPer={per?.nr_per}
        saldoRestantePer={saldoRestante}
      />
      <PerDetailRessarcimentoDialogs
        nrPer={per.nr_per}
        formattedNrPer={normalizeProcessNumber(per.nr_per)}
        ressarcimentoOpen={ressarcimentoOpen}
        onRessarcimentoOpenChange={setRessarcimentoOpen}
        ressarcimentoValor={ressarcimentoValor}
        onRessarcimentoValorInput={(value) => {
          const parsed = parseCurrencyInput(value);
          setRessarcimentoValor(
            parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          );
        }}
        ressarcimentoData={ressarcimentoData}
        ressarcimentoDataDisplay={
          ressarcimentoDate ? format(ressarcimentoDate, 'dd/MM/yyyy', { locale: ptBR }) : ''
        }
        ressarcimentoDate={ressarcimentoDate}
        onRessarcimentoDateSelect={(date) => {
          setRessarcimentoData(date ? format(date, 'yyyy-MM-dd') : '');
          setRessarcimentoCalOpen(false);
        }}
        calendarOpen={ressarcimentoCalOpen}
        onCalendarOpenChange={setRessarcimentoCalOpen}
        valorNumerico={ressarcimentoValorNumerico}
        selicIndisponivel={selicRessIndisponivel}
        selicError={selicRessError?.message}
        fatorRessarcimento={fatorRessarcimento}
        valorOriginal={ressarcimentoValorOriginal}
        formatCurrency={formatCurrency}
        savePending={ressarcimentoMutation.isPending}
        onSave={handleSaveRessarcimento}
        deleteOpen={deleteRessarcimentoOpen}
        onDeleteOpenChange={setDeleteRessarcimentoOpen}
        vlrRessarcido={vlrRessarcido}
        deletePending={deleteRessarcimentoMutation.isPending}
        onDelete={() =>
          deleteRessarcimentoMutation.mutate({
            nrPer: per?.nr_per,
            userId: user?.id ?? null,
          })
        }
      />
      <SoftDeleteModal
        open={softDeleteOpen}
        onOpenChange={setSoftDeleteOpen}
        type={softDeleteType}
        identifier={softDeleteId}
      />
    </>
  );
}
