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

const TRIBUTOS = ['PIS', 'COFINS', 'IPI', 'INSS', 'IRRF', 'IRPJ', 'CSLL', 'CSRF'] as const;

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
  tributo: string;
  valor_tributo: number;
}

const dcompSchema = z.object({
  nr_documento: z.string().min(1, 'Número do documento é obrigatório'),
  nr_per_orig: z.string().min(1, 'PER de origem é obrigatório'),
  mes_ano_exercicio: z.string().min(1, 'Mês/Ano é obrigatório'),
  dt_envio: z.string().min(1, 'Data de envio é obrigatória'),
  vlr_compensado: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_dcomp_ret: z.string().nullable().optional(),
  porcentagem_psa: z.coerce.number().min(0).max(100).nullable().optional(),
});

type DcompFormData = z.infer<typeof dcompSchema>;

interface DcompFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
  contribuinteId?: string;
  preSelectedPer?: string;
}

export function DcompFormModal({
  open,
  onOpenChange,
  editData,
  contribuinteId,
  preSelectedPer,
}: DcompFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editData;
  const [currencyDisplay, setCurrencyDisplay] = useState('R$ 0,00');
  const [dtEnvioPopoverOpen, setDtEnvioPopoverOpen] = useState(false);
  const [distribuicoes, setDistribuicoes] = useState<DistribuicaoLinha[]>([]);
  const [linhaDisplay, setLinhaDisplay] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);

  const form = useForm<DcompFormData>({
    resolver: zodResolver(dcompSchema),
    defaultValues: {
      nr_documento: '',
      nr_per_orig: '',
      mes_ano_exercicio: '',
      dt_envio: new Date().toISOString().split('T')[0],
      vlr_compensado: 0,
      nr_dcomp_ret: null,
      porcentagem_psa: null,
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

  const vlrCompensado = form.watch('vlr_compensado') || 0;
  const totalRateado = useMemo(
    () => distribuicoes.reduce((acc, l) => acc + (l.valor_tributo || 0), 0),
    [distribuicoes],
  );
  const somaIgual = toCents(totalRateado) === toCents(vlrCompensado);
  const temDistribuicao = distribuicoes.length > 0;
  const distribuicoesValidas =
    temDistribuicao &&
    somaIgual &&
    distribuicoes.every((l) => l.tributo && l.valor_tributo >= 0);

  // Carrega distribuições existentes em modo edição
  const { data: distribuicoesExistentes = [] } = useQuery({
    queryKey: ['dcomp-distribuicoes', editData?.nr_documento],
    queryFn: async () => {
      if (!editData?.nr_documento) return [];
      const { data, error } = await (supabase
        .from('distribuicao_dcomp') as any)
        .select('id, tributo, valor_tributo')
        .eq('nr_documento', editData.nr_documento);
      if (error) throw error;
      return (data || []) as DistribuicaoLinha[];
    },
    enabled: !!editData?.nr_documento && open,
  });

  const { data: dcompsExistentes = [] } = useQuery({
    queryKey: ['dcomps-existentes', preSelectedPer],
    queryFn: async () => {
      if (!preSelectedPer) return [];
      const { data, error } = await (supabase
        .from('dcomp') as any)
        .select('nr_documento, mes_ano_exercicio, imposto, nr_dcomp_ret')
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
        .select('nr_per, id_contribuinte, exercicio, tri_exercicio')
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
        porcentagem_psa: editData.porcentagem_psa ?? null,
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
          porcentagem_psa: saved.porcentagem_psa ?? null,
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
          porcentagem_psa: null,
        });
        setCurrencyDisplay('R$ 0,00');
        setDistribuicoes([]);
      }
    }
  }, [editData, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Após carregar do banco, popula distribuicoes em edição.
  // Fallback: se DCOMP antigo (sem rateio), cria 1 linha com imposto+vlr_compensado.
  useEffect(() => {
    if (!isEditing) return;
    if (distribuicoesExistentes.length > 0) {
      setDistribuicoes(distribuicoesExistentes);
    } else if (editData?.imposto) {
      setDistribuicoes([
        {
          tributo: editData.imposto,
          valor_tributo: Number(editData.vlr_compensado) || 0,
        },
      ]);
    }
  }, [distribuicoesExistentes, isEditing, editData]);

  // Sincroniza display monetário das linhas
  useEffect(() => {
    const next: Record<string, string> = {};
    distribuicoes.forEach((l, i) => {
      const k = l.id || `local-${i}`;
      next[k] = formatCurrencyDisplay(l.valor_tributo || 0);
    });
    setLinhaDisplay(next);
  }, [distribuicoes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLinha = (tributo: string) => {
    setDistribuicoes((prev) => [...prev, { tributo, valor_tributo: 0 }]);
    setAddOpen(false);
  };

  const updateLinhaTributo = (idx: number, tributo: string) => {
    setDistribuicoes((prev) => prev.map((l, i) => (i === idx ? { ...l, tributo } : l)));
  };

  const updateLinhaValor = (idx: number, raw: string) => {
    const num = parseCurrencyToNumber(raw);
    setDistribuicoes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, valor_tributo: num } : l)),
    );
    const k = distribuicoes[idx]?.id || `local-${idx}`;
    setLinhaDisplay((prev) => ({ ...prev, [k]: formatCurrencyDisplay(num) }));
  };

  const removerLinha = (idx: number) => {
    setDistribuicoes((prev) => prev.filter((_, i) => i !== idx));
  };

  const tributoDominante = useMemo(() => {
    if (distribuicoes.length === 0) return '';
    return distribuicoes.reduce((max, l) =>
      l.valor_tributo > max.valor_tributo ? l : max,
    ).tributo;
  }, [distribuicoes]);

  const persistirDistribuicoes = async (nrDocumento: string) => {
    // Substitui totalmente: tabela sem soft-delete e rateio é overwrite.
    const { error: delErr } = await (supabase.from('distribuicao_dcomp') as any)
      .delete()
      .eq('nr_documento', nrDocumento);
    if (delErr) throw delErr;
    const rows = distribuicoes.map((l) => ({
      nr_documento: nrDocumento,
      tributo: l.tributo,
      valor_tributo: l.valor_tributo,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await (supabase.from('distribuicao_dcomp') as any).insert(rows);
      if (insErr) throw insErr;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const imposto = tributoDominante;
      const record = {
        nr_documento: stripToDigits(data.nr_documento),
        nr_per_orig: stripToDigits(data.nr_per_orig),
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        imposto,
        tp_credito: imposto,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret ? stripToDigits(data.nr_dcomp_ret) : null,
        porcentagem_psa: data.porcentagem_psa ?? null,
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
            imposto: record.imposto,
            tp_credito: record.tp_credito,
            vlr_compensado: record.vlr_compensado,
            nr_dcomp_ret: record.nr_dcomp_ret,
            porcentagem_psa: record.porcentagem_psa,
            excluido: null,
            nr_cancelamento: null,
          })
          .eq('nr_documento', record.nr_documento);
        if (updateError) throw updateError;
        reactivated = true;
      } else {
        const { error } = await supabase.from('dcomp').insert([record]);
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
      const imposto = tributoDominante;
      const record = {
        nr_per_orig: stripToDigits(data.nr_per_orig),
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        imposto,
        tp_credito: imposto,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret ? stripToDigits(data.nr_dcomp_ret) : null,
        porcentagem_psa: data.porcentagem_psa ?? null,
      };
      const { error } = await supabase
        .from('dcomp')
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
    if (!distribuicoesValidas) return;
    if (isEditing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const tributosDisponiveis = TRIBUTOS;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar DCOMP' : 'Novo DCOMP'}</DialogTitle>
          <DialogDescription className="sr-only">Formulário de DCOMP</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="nr_per_orig"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PER de Origem <RequiredMark /></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o PER" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pers.map((per: any) => (
                        <SelectItem key={per.nr_per} value={per.nr_per}>
                          {per.nr_per} ({per.exercicio}/{per.tri_exercicio}T)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                            {normalizeProcessNumber(dcomp.nr_documento)} ({dcomp.imposto} - {dcomp.mes_ano_exercicio})
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
              name="mes_ano_exercicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês/Ano Exercício <RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/AAAA"
                      maxLength={7}
                      value={field.value ? (() => {
                        if (/^\d{4}-\d{2}$/.test(field.value)) {
                          const [y, m] = field.value.split('-');
                          return `${m}/${y}`;
                        }
                        return field.value;
                      })() : ''}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        let masked = digits;
                        if (digits.length > 2) masked = digits.slice(0, 2) + '/' + digits.slice(2);
                        if (digits.length === 6) {
                          const mm = digits.slice(0, 2);
                          const yyyy = digits.slice(2, 6);
                          field.onChange(`${yyyy}-${mm}`);
                        } else {
                          field.onChange(masked);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                </FormItem>
              )}
            />

            {/* Rateio de tributos */}
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="m-0">Tributos rateados <RequiredMark /></FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => addLinha('')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tributo
                </Button>
              </div>

              {distribuicoes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum tributo adicionado.</p>
              )}

              <div className="space-y-2">
                {distribuicoes.map((linha, idx) => {
                  const k = linha.id || `local-${idx}`;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <Select value={linha.tributo} onValueChange={(v) => updateLinhaTributo(idx, v)}>
                        <SelectTrigger className="h-9 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tributosDisponiveis.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-9 flex-1"
                        type="text"
                        inputMode="numeric"
                        value={linhaDisplay[k] ?? formatCurrencyDisplay(linha.valor_tributo || 0)}
                        onChange={(e) => updateLinhaValor(idx, e.target.value)}
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
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-muted-foreground">
                  Total rateado: <strong className={cn(somaIgual ? 'text-emerald-600' : 'text-destructive')}>
                    {formatCurrencyDisplay(totalRateado)}
                  </strong>
                  {' / '}Compensado: <strong>{formatCurrencyDisplay(vlrCompensado)}</strong>
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="porcentagem_psa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual Aplicado (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="Ex: 15.00"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Math.min(Number(e.target.value), 100) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!distribuicoesValidas && (
              <p className="text-sm text-destructive">
                {!temDistribuicao
                  ? 'Adicione ao menos um tributo rateado.'
                  : `A soma dos tributos (${formatCurrencyDisplay(totalRateado)}) deve ser igual ao valor total compensado (${formatCurrencyDisplay(vlrCompensado)}).`}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { clear(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !distribuicoesValidas}>
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
