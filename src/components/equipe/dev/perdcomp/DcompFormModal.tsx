import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { isWithinGracePeriodAt } from '@/lib/selicCalculator';
import { useSelicTaxaAt } from '@/hooks/useSelicTaxaAt';
import {
  useGruposTributo,
  useCodigosReceita,
  findGrupoIdPorSiglaLegado,
} from '@/hooks/useCatalogoTributos';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  dcompSchema,
  formatCurrencyDisplay,
  getDcompsVigentes,
  getProporcaoOriginal,
  getValorAtualizadoSelicMax,
  groupCodigosByGrupo,
  parseCompetenciaInput,
  parseCurrencyToNumber,
  toCents,
  validateDistribuicoes,
  type DcompDraft,
  type DcompEditData,
  type DcompFormData,
  type DistribuicaoLinha,
} from '@/lib/dcompForm';
import {
  useCreateDcompForm,
  useDcompsExistentesForm,
  useDistribuicoesDcompForm,
  usePersDcompForm,
  useSyncDcompForm,
  useUpdateDcompForm,
} from '@/hooks/useDcompFormPersistence';
import { DcompFields } from '@/components/equipe/dev/perdcomp/dcomp/DcompFields';
import { DcompDistributionSection } from '@/components/equipe/dev/perdcomp/dcomp/DcompDistributionSection';

interface DcompFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: DcompEditData | null;
  contribuinteId?: string;
  preSelectedPer?: string;
  /** Saldo restante (principal) do PER de contexto, já descontadas todas as DCOMPs vigentes (incluindo a editada). */
  saldoRestantePer?: number;
}

export function DcompFormModal({
  open,
  onOpenChange,
  editData,
  contribuinteId,
  preSelectedPer,
  saldoRestantePer,
}: DcompFormModalProps) {
  const { user, isAdmin, isLider, isSublider } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editData;
  // Criação liberada para qualquer membro interno (RLS exige team_member+).
  // Edição/exclusão restritas a sublíder, líder e admin.
  const canWriteDcomp = isEditing ? isAdmin || isLider || isSublider : true;
  const [currencyDisplay, setCurrencyDisplay] = useState('R$ 0,00');
  const [dtEnvioPopoverOpen, setDtEnvioPopoverOpen] = useState(false);
  const [distribuicoes, setDistribuicoes] = useState<DistribuicaoLinha[]>([]);

  const form = useForm<DcompFormData>({
    resolver: zodResolver(dcompSchema),
    defaultValues: {
      nr_documento: '',
      nr_per_orig: preSelectedPer || '',
      mes_ano_exercicio: '',
      dt_envio: new Date().toISOString().split('T')[0],
      vlr_compensado: 0,
      nr_dcomp_ret: null,
    },
  });

  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore, clear } = useDraftPersistence(
    'dcomp-form-draft',
    { ...watchedValues, distribuicoes },
    draftEnabled,
    user?.id,
  );

  // Catálogo RFB: grupos de tributo e códigos de receita.
  const { data: grupos = [] } = useGruposTributo();
  const { data: codigos = [] } = useCodigosReceita();

  // Índice códigos por grupo, para popular o select dependente em O(1).
  const codigosPorGrupo = useMemo(() => groupCodigosByGrupo(codigos), [codigos]);

  const vlrCompensado = form.watch('vlr_compensado') || 0;
  const distribuicaoValidation = useMemo(
    () => validateDistribuicoes(distribuicoes, vlrCompensado),
    [distribuicoes, vlrCompensado],
  );
  const {
    totalRateado,
    somaIgual,
    temDistribuicao,
    temGrupoNaoSelecionado,
    temValorZero,
    temCompetenciaInvalida,
    validas: distribuicoesValidas,
  } = distribuicaoValidation;

  // Carrega distribuições existentes em modo edição.
  // Mantém o campo legado `tributo` no retorno raw para fazer best-effort de mapeamento
  // (legacy → grupo_tributo_id) no useEffect de hidratação abaixo, quando o catálogo já carregou.
  const { data: distribuicoesExistentes = [] } = useDistribuicoesDcompForm(
    editData?.nr_documento,
    open,
  );
  const { data: dcompsExistentes = [] } = useDcompsExistentesForm(preSelectedPer);
  const dcompsVigentesParaRetificar = getDcompsVigentes(dcompsExistentes);
  const { data: pers = [] } = usePersDcompForm(contribuinteId);

  // hidrata form/distribuições
  useEffect(() => {
    if (editData) {
      form.reset({
        nr_documento: editData.nr_documento,
        nr_per_orig: editData.nr_per_orig,
        mes_ano_exercicio: editData.mes_ano_exercicio?.substring(0, 7) || '',
        dt_envio: editData.dt_envio,
        vlr_compensado: editData.vlr_compensado,
        nr_dcomp_ret: editData.nr_dcomp_ret || null,
      });
      setCurrencyDisplay(formatCurrencyDisplay(editData.vlr_compensado || 0));
    } else if (open) {
      const saved = restore() as DcompDraft | null;
      if (saved) {
        form.reset({
          nr_documento: saved.nr_documento || '',
          nr_per_orig: preSelectedPer || saved.nr_per_orig || '',
          mes_ano_exercicio: saved.mes_ano_exercicio || '',
          dt_envio: saved.dt_envio || new Date().toISOString().split('T')[0],
          vlr_compensado: saved.vlr_compensado || 0,
          nr_dcomp_ret: saved.nr_dcomp_ret ?? null,
        });
        setCurrencyDisplay(formatCurrencyDisplay(saved.vlr_compensado || 0));
        if (Array.isArray(saved.distribuicoes)) setDistribuicoes(saved.distribuicoes);
      } else {
        form.reset({
          nr_documento: '',
          nr_per_orig: preSelectedPer || '',
          mes_ano_exercicio: '',
          dt_envio: new Date().toISOString().split('T')[0],
          vlr_compensado: 0,
          nr_dcomp_ret: null,
        });
        setCurrencyDisplay('R$ 0,00');
        setDistribuicoes([]);
      }
    }
  }, [editData, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Após carregar do banco, popula distribuicoes em edição.
  // Para registros legados (sem grupo_tributo_id), tenta inferir o grupo a partir da sigla antiga
  // (campo `tributo`). O usuário precisa selecionar o código de receita manualmente.
  // Fallback: se DCOMP antigo (sem rateio), cria 1 linha com imposto+vlr_compensado.
  useEffect(() => {
    if (!isEditing) return;
    if (distribuicoesExistentes.length > 0) {
      setDistribuicoes(
        distribuicoesExistentes.map((r) => ({
          id: r.id,
          grupo_tributo_id:
            r.grupo_tributo_id ?? findGrupoIdPorSiglaLegado(r._legacyTributo, grupos),
          codigo_receita_id: r.codigo_receita_id ?? null,
          valor_tributo: r.valor_tributo,
          competencia: r.competencia,
          valor_original: r.valor_original,
        })),
      );
    } else if (editData?.imposto) {
      setDistribuicoes([
        {
          grupo_tributo_id: findGrupoIdPorSiglaLegado(editData.imposto, grupos),
          codigo_receita_id: null,
          valor_tributo: Number(editData.vlr_compensado) || 0,
          competencia: editData.mes_ano_exercicio
            ? String(editData.mes_ano_exercicio).substring(0, 7)
            : '',
        },
      ]);
    }
  }, [distribuicoesExistentes, isEditing, editData, grupos]);

  const dtEnvio = form.watch('dt_envio');
  const nrPerOrig = form.watch('nr_per_orig');
  const mesAnoFromForm = dtEnvio ? dtEnvio.substring(0, 7) : '';

  // Snapshot do dt_envio originalmente gravado, para detectar mudança em modo edição.
  const dtEnvioOriginal = editData?.dt_envio ?? null;
  const dtEnvioMudou = isEditing && !!dtEnvioOriginal && dtEnvio !== dtEnvioOriginal;

  // Rateio Atualizado/Original — depende da dt_envio (carência) e do fator SELIC vigente nessa data
  const perSelecionado = pers.find((p) => p.nr_per === nrPerOrig);
  const dtSolicitadaPer = perSelecionado?.dt_solicitada || null;
  const tpCreditoPer = perSelecionado?.tp_credito || '';
  const triExercicioPer = perSelecionado?.tri_exercicio ?? null;
  const exercicioPer = perSelecionado?.exercicio ?? null;
  const porcentagemPsaPer = Number(perSelecionado?.porcentagem_psa ?? 0);

  const emCarenciaNaDtEnvio =
    !!dtSolicitadaPer && !!dtEnvio && isWithinGracePeriodAt(dtSolicitadaPer, dtEnvio);

  // Fator SELIC na dt_envio do DCOMP — usado para decompor Valor Utilizado em
  // Valor Original (que sai do saldo do PER) + Atualização SELIC desta DCOMP.
  const {
    data: selicResult,
    error: selicError,
    isLoading: selicLoading,
  } = useSelicTaxaAt(
    emCarenciaNaDtEnvio ? null : dtSolicitadaPer,
    emCarenciaNaDtEnvio ? null : dtEnvio,
  );

  const fatorSelicRaw = useMemo(() => {
    if (emCarenciaNaDtEnvio) return 0;
    if (!selicResult) return null;
    return Math.max(0, selicResult.fator);
  }, [emCarenciaNaDtEnvio, selicResult]);

  const fatorSelic = fatorSelicRaw ?? 0;

  const selicIndisponivel =
    !!dtSolicitadaPer &&
    !!dtEnvio &&
    !emCarenciaNaDtEnvio &&
    !selicLoading &&
    fatorSelicRaw === null;

  const proporcaoOriginal = getProporcaoOriginal(fatorSelic);

  // Fator SELIC vigente HOJE — usado para o teto do Valor Compensado, que deve
  // bater com o "Valor Atualizado SELIC" do PER exibido no header e na tabela
  // principal (saldo restante × (1 + fator de hoje)).
  const hojeStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const emCarenciaHoje = !!dtSolicitadaPer && isWithinGracePeriodAt(dtSolicitadaPer, hojeStr);
  const { data: selicResultHoje } = useSelicTaxaAt(
    emCarenciaHoje ? null : dtSolicitadaPer,
    emCarenciaHoje ? null : hojeStr,
  );
  const fatorSelicHoje = emCarenciaHoje ? 0 : Math.max(0, selicResultHoje?.fator ?? 0);

  const valorAtualizadoSelicMax = useMemo(() => {
    return getValorAtualizadoSelicMax(saldoRestantePer, nrPerOrig, preSelectedPer, fatorSelicHoje);
  }, [saldoRestantePer, nrPerOrig, preSelectedPer, fatorSelicHoje]);

  const vlrCompensadoExcedeMax =
    valorAtualizadoSelicMax != null && toCents(vlrCompensado) > toCents(valorAtualizadoSelicMax);

  const addLinha = () => {
    setDistribuicoes((prev) => [
      ...prev,
      {
        grupo_tributo_id: null,
        codigo_receita_id: null,
        valor_tributo: 0,
        competencia: mesAnoFromForm || '',
      },
    ]);
  };

  const updateLinhaGrupo = (idx: number, grupo_tributo_id: string) => {
    // Trocar de grupo invalida o código atual (pode não pertencer ao novo grupo).
    setDistribuicoes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, grupo_tributo_id, codigo_receita_id: null } : l)),
    );
  };

  const updateLinhaCodigo = (idx: number, codigo_receita_id: string) => {
    setDistribuicoes((prev) => prev.map((l, i) => (i === idx ? { ...l, codigo_receita_id } : l)));
  };

  const updateLinhaValor = (idx: number, raw: string) => {
    const num = parseCurrencyToNumber(raw);
    setDistribuicoes((prev) => prev.map((l, i) => (i === idx ? { ...l, valor_tributo: num } : l)));
  };

  const updateLinhaCompetencia = (idx: number, raw: string) => {
    const parsed = parseCompetenciaInput(raw);
    setDistribuicoes((prev) => prev.map((l, i) => (i === idx ? { ...l, competencia: parsed } : l)));
  };

  const removerLinha = (idx: number) => {
    setDistribuicoes((prev) => prev.filter((_, i) => i !== idx));
  };

  const syncDcomp = useSyncDcompForm();

  const invalidateAndFinish = (successMessage: string, record: Parameters<typeof syncDcomp>[0]) => {
    queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
    queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
    queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });
    queryClient.invalidateQueries({ queryKey: ['dcomp-distribuicoes'] });
    queryClient.invalidateQueries({ queryKey: ['per-detail'] });
    queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
    toast.success(successMessage);
    clear();
    onOpenChange(false);
    syncDcomp(record);
  };

  const createMutation = useCreateDcompForm({
    onSuccess: (record) => invalidateAndFinish('DCOMP criado com sucesso!', record),
    onError: (error) => {
      const code = 'code' in error ? String(error.code) : '';
      const message =
        code === '23505'
          ? 'Já existe um DCOMP com este número. Verifique e tente novamente.'
          : error.message || 'Erro desconhecido';
      toast.error(`Erro ao criar DCOMP: ${message}`);
    },
  });
  const updateMutation = useUpdateDcompForm({
    onSuccess: (record) => invalidateAndFinish('DCOMP atualizado com sucesso!', record),
    onError: (error) => toast.error(`Erro ao atualizar DCOMP: ${error.message}`),
  });

  const onSubmit = (data: DcompFormData) => {
    if (!canWriteDcomp) {
      toast.error('Você não tem permissão para editar/excluir este DCOMP');
      return;
    }
    if (!distribuicoesValidas) return;
    if (vlrCompensadoExcedeMax) return;
    const derived = {
      ...data,
      mes_ano_exercicio: data.dt_envio ? data.dt_envio.substring(0, 7) : '',
    };
    const context = {
      data: derived,
      distribuicoes,
      existentes: distribuicoesExistentes,
      grupos,
      isEditing,
      dtEnvioMudou,
      proporcaoOriginal,
    };
    if (isEditing && editData) {
      updateMutation.mutate({ ...context, originalNrDocumento: editData.nr_documento });
    } else {
      createMutation.mutate(context);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const readOnlyMode = isEditing && !canWriteDcomp;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) clear();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-10">
            <DialogTitle>{isEditing ? 'Editar DCOMP' : 'Novo DCOMP'}</DialogTitle>
            <div className="flex items-center gap-2">
              {readOnlyMode && (
                <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                  Você não tem permissão para editar este DCOMP
                </span>
              )}
              {perSelecionado && (tpCreditoPer || triExercicioPer != null) && (
                <span className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {tpCreditoPer}
                  {tpCreditoPer && triExercicioPer != null && exercicioPer != null ? ' · ' : ''}
                  {triExercicioPer != null && exercicioPer != null
                    ? `${triExercicioPer}T/${exercicioPer}`
                    : ''}
                </span>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">Formulário de DCOMP</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={readOnlyMode} className="space-y-4 disabled:opacity-100">
              <DcompFields
                form={form}
                isEditing={isEditing}
                dcompsVigentesParaRetificar={dcompsVigentesParaRetificar}
                dtEnvioPopoverOpen={dtEnvioPopoverOpen}
                onDtEnvioPopoverOpenChange={setDtEnvioPopoverOpen}
                currencyDisplay={currencyDisplay}
                onCurrencyDisplayChange={setCurrencyDisplay}
                porcentagemPsaPer={porcentagemPsaPer}
                vlrCompensado={vlrCompensado}
                vlrCompensadoExcedeMax={vlrCompensadoExcedeMax}
                valorAtualizadoSelicMax={valorAtualizadoSelicMax}
                dtSolicitadaPer={dtSolicitadaPer}
                dtEnvio={dtEnvio}
                proporcaoOriginal={proporcaoOriginal}
                emCarenciaNaDtEnvio={emCarenciaNaDtEnvio}
                selicLoading={selicLoading}
                selicIndisponivel={selicIndisponivel}
                selicErrorMessage={selicError?.message}
                fatorSelic={fatorSelic}
              />

              <DcompDistributionSection
                distribuicoes={distribuicoes}
                distribuicoesExistentes={distribuicoesExistentes}
                grupos={grupos}
                codigosPorGrupo={codigosPorGrupo}
                isEditing={isEditing}
                dtEnvioMudou={dtEnvioMudou}
                proporcaoOriginal={proporcaoOriginal}
                totalRateado={totalRateado}
                somaIgual={somaIgual}
                vlrCompensado={vlrCompensado}
                emCarenciaNaDtEnvio={emCarenciaNaDtEnvio}
                fatorSelic={fatorSelic}
                distribuicoesValidas={distribuicoesValidas}
                temDistribuicao={temDistribuicao}
                temGrupoNaoSelecionado={temGrupoNaoSelecionado}
                temValorZero={temValorZero}
                temCompetenciaInvalida={temCompetenciaInvalida}
                onAddLinha={addLinha}
                onUpdateLinhaGrupo={updateLinhaGrupo}
                onUpdateLinhaCodigo={updateLinhaCodigo}
                onUpdateLinhaValor={updateLinhaValor}
                onUpdateLinhaCompetencia={updateLinhaCompetencia}
                onRemoverLinha={removerLinha}
              />
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clear();
                  onOpenChange(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !distribuicoesValidas ||
                  !canWriteDcomp ||
                  vlrCompensadoExcedeMax ||
                  selicIndisponivel
                }
                title={
                  !canWriteDcomp
                    ? 'Você não tem permissão para editar este DCOMP'
                    : selicIndisponivel
                      ? 'Fator SELIC indisponível — não é possível calcular o rateio Atualizado/Original'
                      : undefined
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
