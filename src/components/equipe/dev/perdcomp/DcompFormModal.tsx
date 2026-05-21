import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
import { stripToDigits, normalizeProcessNumber } from '@/lib/perdcompUtils';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';

const normalizeMesAno = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
};

const formatDcompNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 24);
  const parts = [
    digits.slice(0, 5),
    digits.slice(5, 10),
    digits.slice(10, 16),
    digits.slice(16, 17),
    digits.slice(17, 18),
    digits.slice(18, 20),
  ];
  const lastPart = digits.slice(20, 24);
  let formatted = parts[0];
  if (digits.length > 5) formatted += '.' + parts[1];
  if (digits.length > 10) formatted += '.' + parts[2];
  if (digits.length > 16) formatted += '.' + parts[3];
  if (digits.length > 17) formatted += '.' + parts[4];
  if (digits.length > 18) formatted += '.' + parts[5];
  if (digits.length > 20) formatted += '-' + lastPart;
  return formatted;
};

const formatCurrencyDisplay = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseCurrencyToNumber = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

const toCents = (n: number) => Math.round(n * 100);

interface DistribuicaoLinha {
  id?: string;
  /** FK → grupo_tributo.id (catálogo RFB). Substitui o antigo campo `tributo` (sigla flat). */
  grupo_tributo_id: string | null;
  /** FK → codigo_receita.id (catálogo RFB). Sub-campo dependente do grupo. */
  codigo_receita_id: string | null;
  valor_tributo: number;
  /** Competência no formato 'yyyy-MM' (UI) ou 'yyyy-MM-dd' (DB). */
  competencia: string;
  /** Valor original (sem SELIC) congelado no banco. NULL = legado. */
  valor_original?: number | null;
}

/** Converte 'yyyy-MM' ou 'yyyy-MM-dd' para 'MM/AAAA' para exibição. */
const formatCompetenciaDisplay = (value: string): string => {
  if (!value) return '';
  const m = value.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[2]}/${m[1]}`;
  return value;
};

/** Aplica máscara MM/AAAA enquanto o usuário digita; retorna 'yyyy-MM' quando completo. */
const parseCompetenciaInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length === 6) {
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    return `${yyyy}-${mm}`;
  }
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
};

const isCompetenciaValida = (value: string): boolean =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) || /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value);

const dcompSchema = z.object({
  nr_documento: z.string().min(1, 'Número do documento é obrigatório'),
  nr_per_orig: z.string().min(1, 'PER de origem é obrigatório'),
  mes_ano_exercicio: z.string().optional().default(''),
  dt_envio: z.string().min(1, 'Data de envio é obrigatória'),
  vlr_compensado: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_dcomp_ret: z.string().nullable().optional(),
});

type DcompFormData = z.infer<typeof dcompSchema>;

interface DcompFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
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
  const canWriteDcomp = isEditing ? (isAdmin || isLider || isSublider) : true;
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
  const codigosPorGrupo = useMemo(() => {
    const map: Record<string, typeof codigos> = {};
    for (const c of codigos) {
      if (!map[c.grupo_tributo_id]) map[c.grupo_tributo_id] = [];
      map[c.grupo_tributo_id].push(c);
    }
    return map;
  }, [codigos]);

  const vlrCompensado = form.watch('vlr_compensado') || 0;
  const totalRateado = useMemo(
    () => distribuicoes.reduce((acc, l) => acc + (l.valor_tributo || 0), 0),
    [distribuicoes],
  );
  const somaIgual = toCents(totalRateado) === toCents(vlrCompensado);
  const temDistribuicao = distribuicoes.length > 0;
  const temGrupoNaoSelecionado = distribuicoes.some((l) => !l.grupo_tributo_id);
  const temCodigoNaoSelecionado = distribuicoes.some((l) => !l.codigo_receita_id);
  const temValorZero = distribuicoes.some((l) => toCents(l.valor_tributo || 0) === 0);
  const temCompetenciaInvalida = distribuicoes.some((l) => !isCompetenciaValida(l.competencia || ''));
  const distribuicoesValidas =
    temDistribuicao &&
    !temGrupoNaoSelecionado &&
    !temCodigoNaoSelecionado &&
    !temValorZero &&
    !temCompetenciaInvalida &&
    somaIgual;

  // Carrega distribuições existentes em modo edição.
  // Mantém o campo legado `tributo` no retorno raw para fazer best-effort de mapeamento
  // (legacy → grupo_tributo_id) no useEffect de hidratação abaixo, quando o catálogo já carregou.
  const { data: distribuicoesExistentes = [] } = useQuery({
    queryKey: ['dcomp-distribuicoes', editData?.nr_documento],
    queryFn: async () => {
      if (!editData?.nr_documento) return [];
      const { data, error } = await (supabase
        .from('distribuicao_dcomp') as any)
        .select('id, tributo, grupo_tributo_id, codigo_receita_id, valor_tributo, competencia, valor_original')
        .eq('nr_documento', editData.nr_documento);
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        id: r.id,
        // legacy sigla (pode vir nulo nos registros novos)
        _legacyTributo: r.tributo as string | null,
        grupo_tributo_id: (r.grupo_tributo_id as string | null) ?? null,
        codigo_receita_id: (r.codigo_receita_id as string | null) ?? null,
        valor_tributo: Number(r.valor_tributo) || 0,
        competencia: r.competencia ? String(r.competencia).substring(0, 7) : '',
        valor_original: r.valor_original != null ? Number(r.valor_original) : null,
      }));
    },
    enabled: !!editData?.nr_documento && open,
  });

  const { data: dcompsExistentes = [] } = useQuery({
    queryKey: ['dcomps-existentes', preSelectedPer],
    queryFn: async () => {
      if (!preSelectedPer) return [];
      const { data, error } = await (supabase
        .from('dcomp') as any)
        .select('nr_documento, mes_ano_exercicio, nr_dcomp_ret')
        .eq('nr_per_orig', preSelectedPer)
        .or('excluido.is.null,excluido.eq.')
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!preSelectedPer,
  });

  const dcompsVigentesParaRetificar = (() => {
    const retificadosSet = new Set(
      dcompsExistentes.filter((d) => d.nr_dcomp_ret).map((d) => d.nr_dcomp_ret),
    );
    return dcompsExistentes.filter((d) => !retificadosSet.has(d.nr_documento));
  })();

  const { data: pers = [] } = useQuery({
    queryKey: ['pers-for-dcomp', contribuinteId],
    queryFn: async () => {
      let query = (supabase
        .from('per') as any)
        .select('nr_per, id_contribuinte, exercicio, tri_exercicio, dt_solicitada, tp_credito, porcentagem_psa')
        .or('excluido.is.null,excluido.eq.')
        .order('exercicio', { ascending: false });
      if (contribuinteId) query = query.eq('id_contribuinte', contribuinteId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

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
      const saved = restore() as any;
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
        distribuicoesExistentes.map((r: any) => ({
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
  const perSelecionado = pers.find((p: any) => p.nr_per === nrPerOrig);
  const dtSolicitadaPer = perSelecionado?.dt_solicitada || null;
  const tpCreditoPer = (perSelecionado as any)?.tp_credito || '';
  const triExercicioPer = (perSelecionado as any)?.tri_exercicio ?? null;
  const exercicioPer = (perSelecionado as any)?.exercicio ?? null;
  const porcentagemPsaPer = Number((perSelecionado as any)?.porcentagem_psa ?? 0);

  const emCarenciaNaDtEnvio =
    !!dtSolicitadaPer && !!dtEnvio && isWithinGracePeriodAt(dtSolicitadaPer, dtEnvio);

  const { data: selicTaxa } = useSelicTaxaAt(
    emCarenciaNaDtEnvio ? null : dtSolicitadaPer,
    emCarenciaNaDtEnvio ? null : dtEnvio,
  );

  const fatorSelic = useMemo(() => {
    if (emCarenciaNaDtEnvio || !selicTaxa) return 0;
    return selicTaxa.vlr_acumulado_dec + 0.01;
  }, [emCarenciaNaDtEnvio, selicTaxa]);

  const proporcaoOriginal = fatorSelic > 0 ? 1 / (1 + fatorSelic) : 1;

  // Limite máximo do vlr_compensado: saldo restante (principal) do PER × (1 + fator SELIC na dt_envio).
  // Em modo edição, somamos de volta o valor_original do DCOMP atual (que já foi descontado do saldo do parent),
  // pois os novos valores informados substituem os antigos.
  const valorOriginalDcompAtual = useMemo(() => {
    if (!isEditing || distribuicoesExistentes.length === 0) return 0;
    return distribuicoesExistentes.reduce(
      (s, l) => s + Number(l.valor_original ?? l.valor_tributo ?? 0),
      0,
    );
  }, [isEditing, distribuicoesExistentes]);

  const valorAtualizadoSelicMax = useMemo(() => {
    // Só aplica quando o PER selecionado bate com o do contexto (saldoRestantePer não vale para outro PER).
    if (saldoRestantePer == null || nrPerOrig !== preSelectedPer) return null;
    const principalDisponivel = saldoRestantePer + valorOriginalDcompAtual;
    return principalDisponivel * (1 + fatorSelic);
  }, [saldoRestantePer, nrPerOrig, preSelectedPer, valorOriginalDcompAtual, fatorSelic]);

  const vlrCompensadoExcedeMax =
    valorAtualizadoSelicMax != null &&
    toCents(vlrCompensado) > toCents(valorAtualizadoSelicMax);

  const round2 = (v: number) => Math.round(v * 100) / 100;

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
      prev.map((l, i) =>
        i === idx ? { ...l, grupo_tributo_id, codigo_receita_id: null } : l,
      ),
    );
  };

  const updateLinhaCodigo = (idx: number, codigo_receita_id: string) => {
    setDistribuicoes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, codigo_receita_id } : l)),
    );
  };

  const updateLinhaValor = (idx: number, raw: string) => {
    const num = parseCurrencyToNumber(raw);
    setDistribuicoes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, valor_tributo: num } : l)),
    );
  };

  const updateLinhaCompetencia = (idx: number, raw: string) => {
    const parsed = parseCompetenciaInput(raw);
    setDistribuicoes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, competencia: parsed } : l)),
    );
  };

  const removerLinha = (idx: number) => {
    setDistribuicoes((prev) => prev.filter((_, i) => i !== idx));
  };


  const persistirDistribuicoes = async (nrDocumento: string) => {
    // Substitui totalmente: tabela sem soft-delete e rateio é overwrite.
    const { error: delErr } = await (supabase.from('distribuicao_dcomp') as any)
      .delete()
      .eq('nr_documento', nrDocumento);
    if (delErr) throw delErr;
    const rows = distribuicoes.map((l) => {
      const linhaOriginal = isEditing && l.id
        ? distribuicoesExistentes.find((o: any) => o.id === l.id)
        : undefined;
      const valorTributoMudou = linhaOriginal
        ? toCents(linhaOriginal.valor_tributo) !== toCents(l.valor_tributo)
        : true; // linha nova → recalcular
      const preservar =
        isEditing &&
        !dtEnvioMudou &&
        !valorTributoMudou &&
        l.valor_original != null;
      const valor_original_final = preservar
        ? (l.valor_original as number)
        : round2(l.valor_tributo * proporcaoOriginal);
      // snapshot da sigla do grupo no campo legado `tributo` para compat com PerDetailModal/filtros.
      const grupo = grupos.find((g) => g.id === l.grupo_tributo_id);
      return {
        nr_documento: nrDocumento,
        tributo: grupo?.sigla ?? '',
        grupo_tributo_id: l.grupo_tributo_id,
        codigo_receita_id: l.codigo_receita_id,
        valor_tributo: l.valor_tributo,
        valor_original: valor_original_final,
        competencia: normalizeMesAno(l.competencia),
      };
    });
    if (rows.length > 0) {
      const { error: insErr } = await (supabase.from('distribuicao_dcomp') as any).insert(rows);
      if (insErr) throw insErr;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const record = {
        nr_documento: stripToDigits(data.nr_documento),
        nr_per_orig: stripToDigits(data.nr_per_orig),
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret ? stripToDigits(data.nr_dcomp_ret) : null,
      };

      const { data: existing, error: checkError } = await (supabase
        .from('dcomp') as any)
        .select('nr_documento, excluido')
        .eq('nr_documento', record.nr_documento)
        .maybeSingle();
      if (checkError) throw checkError;

      let reactivated = false;
      if (existing) {
        const isSoftDeleted = existing.excluido !== null && existing.excluido !== '';
        if (!isSoftDeleted) {
          throw new Error('Já existe um DCOMP ativo com este número. Edite-o em vez de criar um novo.');
        }
        const { error: updateError } = await (supabase.from('dcomp') as any)
          .update({
            nr_per_orig: record.nr_per_orig,
            mes_ano_exercicio: record.mes_ano_exercicio,
            dt_envio: record.dt_envio,
            vlr_compensado: record.vlr_compensado,
            nr_dcomp_ret: record.nr_dcomp_ret,
            excluido: null,
            nr_cancelamento: null,
          })
          .eq('nr_documento', record.nr_documento);
        if (updateError) throw updateError;
        reactivated = true;
      } else {
        const { error } = await (supabase.from('dcomp') as any).insert([record]);
        if (error) throw error;
      }

      await persistirDistribuicoes(record.nr_documento);
      return { ...record, __reactivated: reactivated };
    },
    onSuccess: (record: any) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });
      queryClient.invalidateQueries({ queryKey: ['dcomp-distribuicoes'] });
      queryClient.invalidateQueries({ queryKey: ['per-detail'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success(record?.__reactivated ? 'DCOMP reativado com os novos dados.' : 'DCOMP criado com sucesso!');
      clear();
      onOpenChange(false);
      const { __reactivated, ...clean } = record;
      syncPerdcompToDW({ dcomp: [clean] });
    },
    onError: (error: any) => {
      const msg = error?.code === '23505'
        ? 'Já existe um DCOMP com este número. Verifique e tente novamente.'
        : (error?.message || 'Erro desconhecido');
      toast.error(`Erro ao criar DCOMP: ${msg}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const record = {
        nr_per_orig: stripToDigits(data.nr_per_orig),
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret ? stripToDigits(data.nr_dcomp_ret) : null,
      };
      const { error } = await (supabase
        .from('dcomp') as any)
        .update(record)
        .eq('nr_documento', editData?.nr_documento);
      if (error) throw error;
      await persistirDistribuicoes(editData?.nr_documento);
      return { ...record, nr_documento: editData?.nr_documento };
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });
      queryClient.invalidateQueries({ queryKey: ['dcomp-distribuicoes'] });
      queryClient.invalidateQueries({ queryKey: ['per-detail'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('DCOMP atualizado com sucesso!');
      clear();
      onOpenChange(false);
      syncPerdcompToDW({ dcomp: [record] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar DCOMP: ${error.message}`);
    },
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
    if (isEditing) updateMutation.mutate(derived);
    else createMutation.mutate(derived);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const readOnlyMode = isEditing && !canWriteDcomp;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
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
                  {triExercicioPer != null && exercicioPer != null ? `${triExercicioPer}T/${exercicioPer}` : ''}
                </span>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">Formulário de DCOMP</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={readOnlyMode} className="space-y-4 disabled:opacity-100">
            <FormField
              control={form.control}
              name="nr_documento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Documento <RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isEditing}
                      placeholder="00000.00000.000000.0.0.00-0000"
                      onChange={(e) => field.onChange(formatDcompNumber(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && dcompsVigentesParaRetificar.length > 0 && (
              <FormField
                control={form.control}
                name="nr_dcomp_ret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DCOMP a Retificar (opcional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum (original)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum (original)</SelectItem>
                        {dcompsVigentesParaRetificar.map((dcomp) => (
                          <SelectItem key={dcomp.nr_documento} value={dcomp.nr_documento}>
                            {normalizeProcessNumber(dcomp.nr_documento)} ({dcomp.mes_ano_exercicio})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="dt_envio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Envio <RequiredMark /></FormLabel>
                  <Popover open={dtEnvioPopoverOpen} onOpenChange={setDtEnvioPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(new Date(field.value + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : <span>Selecione...</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar selected={field.value ? new Date(field.value + 'T00:00:00') : undefined} onSelect={(d) => { field.onChange(d ? format(d, 'yyyy-MM-dd') : ''); setDtEnvioPopoverOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vlr_compensado"
              render={() => (
                <FormItem>
                  <FormLabel>Valor Compensado (R$) <RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={currencyDisplay}
                      onChange={(e) => {
                        const numericValue = parseCurrencyToNumber(e.target.value);
                        form.setValue('vlr_compensado', numericValue);
                        setCurrencyDisplay(formatCurrencyDisplay(numericValue));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {porcentagemPsaPer > 0 && vlrCompensado > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Valor PSA ({porcentagemPsaPer.toFixed(2).replace('.', ',')}%):{' '}
                      <strong className="font-mono text-foreground">
                        {formatCurrencyDisplay(vlrCompensado * porcentagemPsaPer / 100)}
                      </strong>
                    </p>
                  )}
                  {vlrCompensadoExcedeMax && valorAtualizadoSelicMax != null && (
                    <p className="text-sm text-destructive">
                      O valor compensado ({formatCurrencyDisplay(vlrCompensado)}) ultrapassa o Valor Atualizado SELIC do PER ({formatCurrencyDisplay(valorAtualizadoSelicMax)}).
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Rateio de tributos */}
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={addLinha}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tributo
                </Button>
              </div>

              <div className="grid grid-cols-[150px_180px_1fr_1fr_110px_36px] items-center gap-2">
                <FormLabel className="m-0">Grupo de Tributo <RequiredMark /></FormLabel>
                <FormLabel className="m-0">Código de Receita <RequiredMark /></FormLabel>
                <FormLabel className="m-0">Valor Utilizado nesta DCOMP</FormLabel>
                <FormLabel className="m-0">Valor Original</FormLabel>
                <FormLabel className="m-0">Competência <RequiredMark /></FormLabel>
                <div />
              </div>

              {distribuicoes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum tributo adicionado.</p>
              )}

              <div className="space-y-2">
                {distribuicoes.map((linha, idx) => {
                  const k = linha.id || `local-${idx}`;
                  const valorZero = toCents(linha.valor_tributo || 0) === 0;
                  const competenciaInvalida = !isCompetenciaValida(linha.competencia || '');
                  const linhaOriginalUI = isEditing && linha.id
                    ? distribuicoesExistentes.find((o: any) => o.id === linha.id)
                    : undefined;
                  const valorTributoMudouUI = linhaOriginalUI
                    ? toCents(linhaOriginalUI.valor_tributo) !== toCents(linha.valor_tributo || 0)
                    : true;
                  const preservadoUI =
                    isEditing &&
                    linha.valor_original != null &&
                    !dtEnvioMudou &&
                    !valorTributoMudouUI;
                  const valorOriginalLinha = preservadoUI
                    ? (linha.valor_original as number)
                    : round2((linha.valor_tributo || 0) * proporcaoOriginal);
                  const exibirValorOriginal =
                    isEditing && linha.valor_original == null && !valorTributoMudouUI && !dtEnvioMudou;
                  const codigosDisponiveis = linha.grupo_tributo_id
                    ? codigosPorGrupo[linha.grupo_tributo_id] || []
                    : [];
                  const codigoSelecionado = codigosDisponiveis.find((c) => c.id === linha.codigo_receita_id);
                  return (
                    <div key={k} className="grid grid-cols-[150px_180px_1fr_1fr_110px_36px] items-center gap-2">
                      <Select
                        value={linha.grupo_tributo_id || undefined}
                        onValueChange={(v) => updateLinhaGrupo(idx, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {grupos.map((g) => (
                            <SelectItem key={g.id} value={g.id} title={g.denominacao}>
                              {g.sigla}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={linha.codigo_receita_id || undefined}
                        onValueChange={(v) => updateLinhaCodigo(idx, v)}
                        disabled={!linha.grupo_tributo_id}
                      >
                        <SelectTrigger
                          className="h-9"
                          title={codigoSelecionado?.denominacao_receita}
                        >
                          <SelectValue placeholder={linha.grupo_tributo_id ? 'Selecione' : '—'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {codigosDisponiveis.map((c) => (
                            <SelectItem key={c.id} value={c.id} title={c.denominacao_receita}>
                              {c.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className={cn("h-9", valorZero && "border-destructive")}
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyDisplay(linha.valor_tributo || 0)}
                        onChange={(e) => updateLinhaValor(idx, e.target.value)}
                      />
                      <Input
                        className="h-9 bg-muted/40"
                        readOnly
                        tabIndex={-1}
                        value={exibirValorOriginal ? '—' : formatCurrencyDisplay(valorOriginalLinha)}
                      />

                      <Input
                        className={cn("h-9", competenciaInvalida && "border-destructive")}
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/AAAA"
                        maxLength={7}
                        value={formatCompetenciaDisplay(linha.competencia || '')}
                        onChange={(e) => updateLinhaCompetencia(idx, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removerLinha(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {valorZero && (
                        <p className="col-span-6 -mt-1 text-xs text-destructive">O valor do tributo não pode ser zero</p>
                      )}
                      {codigoSelecionado && (
                        <p className="col-span-6 -mt-1 text-xs text-muted-foreground truncate" title={codigoSelecionado.denominacao_receita}>
                          {codigoSelecionado.denominacao_receita}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-muted-foreground">
                  Total rateado: <strong className={cn(somaIgual ? 'text-emerald-600' : 'text-destructive')}>
                    {formatCurrencyDisplay(totalRateado)}
                  </strong>
                  {' / '}Compensado: <strong>{formatCurrencyDisplay(vlrCompensado)}</strong>
                </span>
                <span className="text-muted-foreground">
                  {fatorSelic > 0 ? (
                    <>
                      Total Original: <strong>{formatCurrencyDisplay(round2(totalRateado * proporcaoOriginal))}</strong>
                      {' · '}Fator SELIC: <strong>{fatorSelic.toFixed(6)}</strong>
                    </>
                  ) : emCarenciaNaDtEnvio ? (
                    <>Em carência — sem parcela SELIC</>
                  ) : (
                    <>Fator SELIC indisponível</>
                  )}
                </span>
              </div>
            </div>

            {!distribuicoesValidas && (
              <p className="text-sm text-destructive">
                {!temDistribuicao
                  ? 'Adicione ao menos um tributo rateado.'
                  : temGrupoNaoSelecionado
                  ? 'Há linhas sem Grupo de Tributo selecionado'
                  : temCodigoNaoSelecionado
                  ? 'Há linhas sem Código de Receita selecionado'
                  : temValorZero
                  ? 'Há tributos com valor zero'
                  : temCompetenciaInvalida
                  ? 'Há tributos com competência inválida (use MM/AAAA).'
                  : `A soma dos tributos (${formatCurrencyDisplay(totalRateado)}) deve ser igual ao valor total compensado (${formatCurrencyDisplay(vlrCompensado)}).`}
              </p>
            )}

            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { clear(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !distribuicoesValidas || !canWriteDcomp || vlrCompensadoExcedeMax}
                title={!canWriteDcomp ? 'Você não tem permissão para editar este DCOMP' : undefined}
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
