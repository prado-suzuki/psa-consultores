import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
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
import { Loader2, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';

// Normaliza o formato de mês/ano para o banco de dados (YYYY-MM -> YYYY-MM-01)
const normalizeMesAno = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
};

// Format DCOMP document number: XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX (26 digits)
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

// Format currency for display: R$ 1.234,56
const formatCurrencyDisplay = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Parse currency string to number (cents-based)
const parseCurrencyToNumber = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

const dcompSchema = z.object({
  nr_documento: z.string().min(1, 'Número do documento é obrigatório'),
  nr_per_orig: z.string().min(1, 'PER de origem é obrigatório'),
  mes_ano_exercicio: z.string().min(1, 'Mês/Ano é obrigatório'),
  dt_envio: z.string().min(1, 'Data de envio é obrigatória'),
  imposto: z.string().min(1, 'Imposto é obrigatório'),
  vlr_compensado: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_dcomp_ret: z.string().nullable().optional(),
  porcentagem_psa: z.coerce.number().max(100, 'Máximo 100%').nullable().optional(),
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

  const form = useForm<DcompFormData>({
    resolver: zodResolver(dcompSchema),
    defaultValues: {
      nr_documento: '',
      nr_per_orig: '',
      mes_ano_exercicio: '',
      dt_envio: new Date().toISOString().split('T')[0],
      imposto: '',
      vlr_compensado: 0,
      nr_dcomp_ret: null,
      porcentagem_psa: null,
    },
  });

  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore, clear } = useDraftPersistence('dcomp-form-draft', watchedValues, draftEnabled, user?.id);

  // Query para buscar DCOMPs existentes do mesmo PER (para retificação)
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

  // DCOMPs vigentes (não retificados) para seleção de "DCOMP a Retificar"
  const dcompsVigentesParaRetificar = (() => {
    const retificadosSet = new Set(
      dcompsExistentes
        .filter((d) => d.nr_dcomp_ret)
        .map((d) => d.nr_dcomp_ret)
    );
    return dcompsExistentes.filter((d) => !retificadosSet.has(d.nr_documento));
  })();

  // Fetch PERs for selection — cast to any until types regeneration for nr_per rename
  const { data: pers = [] } = useQuery({
    queryKey: ['pers-for-dcomp', contribuinteId],
    queryFn: async () => {
      let query = (supabase
        .from('per') as any)
        .select('nr_per, id_contribuinte, exercicio, tri_exercicio')
        .or('excluido.is.null,excluido.eq.')
        .order('exercicio', { ascending: false });
      
      if (contribuinteId) {
        query = query.eq('id_contribuinte', contribuinteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (editData) {
      form.reset({
        nr_documento: editData.nr_documento,
        nr_per_orig: editData.nr_per_orig,
        mes_ano_exercicio: editData.mes_ano_exercicio?.substring(0, 7) || '',
        dt_envio: editData.dt_envio,
        imposto: editData.imposto,
        vlr_compensado: editData.vlr_compensado,
        nr_dcomp_ret: editData.nr_dcomp_ret || null,
        porcentagem_psa: editData.porcentagem_psa ?? null,
      });
      setCurrencyDisplay(formatCurrencyDisplay(editData.vlr_compensado || 0));
    } else if (open) {
      const saved = restore();
      if (saved) {
        form.reset({ ...saved, nr_per_orig: preSelectedPer || saved.nr_per_orig });
        setCurrencyDisplay(formatCurrencyDisplay(saved.vlr_compensado || 0));
      } else {
        form.reset({
          nr_documento: '',
          nr_per_orig: preSelectedPer || '',
          mes_ano_exercicio: '',
          dt_envio: new Date().toISOString().split('T')[0],
          imposto: '',
          vlr_compensado: 0,
          nr_dcomp_ret: null,
          porcentagem_psa: null,
        });
        setCurrencyDisplay('R$ 0,00');
      }
    }
  }, [editData, form, preSelectedPer, open]);

  const createMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const record = {
        nr_documento: data.nr_documento,
        nr_per_orig: data.nr_per_orig,
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        imposto: data.imposto,
        tp_credito: data.imposto,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret || null,
        porcentagem_psa: data.porcentagem_psa ?? null,
      };
      const { error } = await supabase.from('dcomp').insert([record]);
      if (error) throw error;
      return record;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });
      queryClient.invalidateQueries({ queryKey: ['per-detail'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('DCOMP criado com sucesso!');
      clear();
      onOpenChange(false);

      syncPerdcompToDW({ dcomp: [record] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar DCOMP: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const record = {
        nr_per_orig: data.nr_per_orig,
        mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
        dt_envio: data.dt_envio,
        imposto: data.imposto,
        tp_credito: data.imposto,
        vlr_compensado: data.vlr_compensado,
        nr_dcomp_ret: data.nr_dcomp_ret || null,
        porcentagem_psa: data.porcentagem_psa ?? null,
      };
      const { error } = await supabase
        .from('dcomp')
        .update(record)
        .eq('nr_documento', editData?.nr_documento);
      if (error) throw error;
      return { ...record, nr_documento: editData?.nr_documento };
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });
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
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
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
                      onChange={(e) => {
                        const formatted = formatDcompNumber(e.target.value);
                        field.onChange(formatted);
                      }}
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

            {/* DCOMP a Retificar (optional) */}
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
                            {dcomp.nr_documento} ({dcomp.imposto} - {dcomp.mes_ano_exercicio})
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
                        // ISO YYYY-MM -> display MM/AAAA
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
                        // Convert complete MM/YYYY to ISO YYYY-MM
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
              name="imposto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imposto <RequiredMark /></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o imposto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PIS">PIS</SelectItem>
                      <SelectItem value="COFINS">COFINS</SelectItem>
                      <SelectItem value="IPI">IPI</SelectItem>
                      <SelectItem value="INSS">INSS</SelectItem>
                      <SelectItem value="IRRF">IRRF</SelectItem>
                      <SelectItem value="IRPJ">IRPJ</SelectItem>
                      <SelectItem value="CSLL">CSLL</SelectItem>
                      <SelectItem value="CSRF">CSRF</SelectItem>
                    </SelectContent>
                  </Select>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { clear(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
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
