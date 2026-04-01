import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { currentAmbiente } from '@/config/api';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, Search } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Format process number: XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX
const formatProcessNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 26);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 5 || i === 10 || i === 16 || i === 17 || i === 18 || i === 20) {
      formatted += '.';
    }
    if (i === 22) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  return formatted;
};

// Format currency for display: R$ 1.234,56
const formatCurrencyDisplay = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Parse currency string to number
const parseCurrencyToNumber = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

const perSchema = z.object({
  nr_per: z.string().min(1, 'Número do processo é obrigatório'),
  id_contribuinte: z.string().min(1, 'Contribuinte é obrigatório'),
  exercicio: z.coerce.number().min(2000).max(2100),
  tri_exercicio: z.coerce.number().min(1).max(4),
  dt_solicitada: z.string().min(1, 'Data é obrigatória'),
  tp_credito: z.string().min(1, 'Tipo de crédito é obrigatório'),
  vlr_credito: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_proc_ret: z.string().nullable().optional(),
  porcentagem_psa: z.coerce.number().nullable().optional(),
});

type PerFormData = z.infer<typeof perSchema>;

interface PerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
  clienteId?: string;
  contribuinteId?: string;
}

export function PerFormModal({
  open,
  onOpenChange,
  editData,
  clienteId,
  contribuinteId,
}: PerFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editData;
  
  // Local state for formatted values
  const [currencyDisplay, setCurrencyDisplay] = useState('R$ 0,00');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // State for client selection within the modal (defaults to prop)
  const [selectedClienteId, setSelectedClienteId] = useState(clienteId || '');
  
  // State for declaration type (Original or Retificadora)
  const [tipoDeclaracao, setTipoDeclaracao] = useState<'original' | 'retificadora'>('original');
  const [perRetificadoOpen, setPerRetificadoOpen] = useState(false);
  const [selectedPerRetificado, setSelectedPerRetificado] = useState<string | null>(null);
  const [perSearchQuery, setPerSearchQuery] = useState('');

  const form = useForm<PerFormData>({
    resolver: zodResolver(perSchema),
    defaultValues: {
      nr_per: '',
      id_contribuinte: contribuinteId || '',
      exercicio: new Date().getFullYear(),
      tri_exercicio: 1,
      dt_solicitada: new Date().toISOString().split('T')[0],
      tp_credito: '',
      vlr_credito: 0,
      nr_proc_ret: null,
      porcentagem_psa: null,
    },
  });

  const watchedValues = form.watch();
  const draftEnabled = open && !isEditing;
  const { restore, clear } = useDraftPersistence('per-form-draft', watchedValues, draftEnabled, user?.id);

  // Sync selectedClienteId when prop changes
  useEffect(() => {
    if (clienteId) setSelectedClienteId(clienteId);
  }, [clienteId]);

  // Fetch all clients for the client selector
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-dev-per-modal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contribuintes for the selected client in the modal
  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes', selectedClienteId],
    queryFn: async () => {
      if (!selectedClienteId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', selectedClienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClienteId,
  });

  // Fetch existing PERs for the contribuinte (for rectification selection) — exclude soft-deleted
  const { data: persExistentes = [] } = useQuery({
    queryKey: ['pers-existentes', contribuinteId],
    queryFn: async () => {
      if (!contribuinteId) return [];
      const { data, error } = await (supabase
        .from('per') as any)
        .select('nr_per, exercicio, tri_exercicio, tp_credito')
        .eq('id_contribuinte', contribuinteId)
        .or('excluido.is.null,excluido.eq.')
        .order('exercicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contribuinteId && !isEditing,
  });

  // Filter PERs based on search query
  const filteredPersExistentes = persExistentes.filter(per => 
    per.numero_processo_per.toLowerCase().includes(perSearchQuery.toLowerCase())
  );

  useEffect(() => {
    if (editData) {
      form.reset({
        numero_processo_per: editData.numero_processo_per,
        id_contribuinte: editData.id_contribuinte,
        exercicio: editData.exercicio,
        tri_exercicio: editData.tri_exercicio,
        dt_solicitada: editData.dt_solicitada,
        tp_credito: editData.tp_credito,
        vlr_credito: editData.vlr_credito,
        nr_proc_ret: editData.nr_proc_ret || null,
        porcentagem_psa: editData.porcentagem_psa ?? null,
      });
      setCurrencyDisplay(formatCurrencyDisplay(editData.vlr_credito || 0));
      if (editData.nr_proc_ret) {
        setTipoDeclaracao('retificadora');
        setSelectedPerRetificado(editData.nr_proc_ret);
      } else {
        setTipoDeclaracao('original');
        setSelectedPerRetificado(null);
      }
    } else if (open) {
      const saved = restore();
      if (saved) {
        form.reset({ ...saved, id_contribuinte: saved.id_contribuinte || contribuinteId || '' });
        setCurrencyDisplay(formatCurrencyDisplay(saved.vlr_credito || 0));
      } else {
        form.reset({
          numero_processo_per: '',
          id_contribuinte: contribuinteId || '',
          exercicio: new Date().getFullYear(),
          tri_exercicio: 1,
          dt_solicitada: new Date().toISOString().split('T')[0],
          tp_credito: '',
          vlr_credito: 0,
          nr_proc_ret: null,
          porcentagem_psa: null,
        });
        setCurrencyDisplay('R$ 0,00');
      }
      setTipoDeclaracao('original');
      setSelectedPerRetificado(null);
    }
  }, [editData, contribuinteId, form, open]);

  // Reset retificado selection when tipo changes
  useEffect(() => {
    if (tipoDeclaracao === 'original') {
      setSelectedPerRetificado(null);
      form.setValue('nr_proc_ret', null);
    }
  }, [tipoDeclaracao, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PerFormData) => {
      // Verificar se já existe PER com este número
      const { data: existing } = await supabase
        .from('per')
        .select('numero_processo_per')
        .eq('numero_processo_per', data.numero_processo_per)
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um PER cadastrado com este número de processo.');
      }

      // Insert PER with nr_proc_ret if retificadora
      const { error: perError } = await supabase.from('per').insert([{
        numero_processo_per: data.numero_processo_per,
        id_contribuinte: data.id_contribuinte,
        exercicio: data.exercicio,
        tri_exercicio: data.tri_exercicio,
        dt_solicitada: data.dt_solicitada,
        tp_credito: data.tp_credito,
        vlr_credito: data.vlr_credito,
        nr_proc_ret: data.nr_proc_ret || null,
        porcentagem_psa: data.porcentagem_psa ?? null,
      }]);
      if (perError) throw perError;

      // Automatically create initial situação as "Analisado"
      const { data: sitData, error: situacaoError } = await supabase.from('per_situacao').insert({
        nr_proc_per: data.numero_processo_per,
        situacao: 'Analisado',
      }).select().single();
      if (situacaoError) {
        console.error('Erro ao criar situação inicial:', situacaoError);
      }

      // If retificadora, update the original PER's situação to "Retificado"
      if (data.nr_proc_ret) {
        const { error: retError } = await supabase.from('per_situacao').insert({
          nr_proc_per: data.nr_proc_ret,
          situacao: 'Retificado',
        });
        if (retError) {
          console.error('Erro ao atualizar situação do PER retificado:', retError);
        }
      }

      return { perData: data, sitData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('PER criado com sucesso!');
      clear();
      onOpenChange(false);

      // Sync fire-and-forget
      const perRecord = {
        numero_processo_per: result.perData.numero_processo_per,
        id_contribuinte: result.perData.id_contribuinte,
        exercicio: result.perData.exercicio,
        tri_exercicio: result.perData.tri_exercicio,
        dt_solicitada: result.perData.dt_solicitada,
        tp_credito: result.perData.tp_credito,
        vlr_credito: result.perData.vlr_credito,
        nr_proc_ret: result.perData.nr_proc_ret,
      };
      const syncPayload: any = { per: [perRecord] };
      if (result.sitData) {
        syncPayload.per_situacao = [result.sitData];
      }
      syncPerdcompToDW(syncPayload);
    },
    onError: (error: any) => {
      const msg = error.message?.includes('per_pkey') || error.message?.includes('duplicate key')
        ? 'Já existe um PER cadastrado com este número de processo.'
        : error.message?.includes('per_id_contribuinte_fkey')
        ? 'Contribuinte inválido. Selecione um contribuinte válido.'
        : error.message;
      toast.error(`Erro ao criar PER: ${msg}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PerFormData) => {
      const { error } = await supabase
        .from('per')
        .update({
          id_contribuinte: data.id_contribuinte,
          exercicio: data.exercicio,
          tri_exercicio: data.tri_exercicio,
          dt_solicitada: data.dt_solicitada,
          tp_credito: data.tp_credito,
          vlr_credito: data.vlr_credito,
          nr_proc_ret: data.nr_proc_ret || null,
          porcentagem_psa: data.porcentagem_psa ?? null,
        })
        .eq('numero_processo_per', editData?.numero_processo_per);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('PER atualizado com sucesso!');
      clear();
      onOpenChange(false);

      syncPerdcompToDW({
        per: [{
          numero_processo_per: editData?.numero_processo_per,
          id_contribuinte: data.id_contribuinte,
          exercicio: data.exercicio,
          tri_exercicio: data.tri_exercicio,
          dt_solicitada: data.dt_solicitada,
          tp_credito: data.tp_credito,
          vlr_credito: data.vlr_credito,
          nr_proc_ret: data.nr_proc_ret,
        }],
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar PER: ${error.message}`);
    },
  });

  const onSubmit = (data: PerFormData) => {
    if (!data.id_contribuinte) {
      toast.error('Selecione um contribuinte antes de cadastrar o PER.');
      return;
    }
    // Set nr_proc_ret based on tipo declaração
    const submissionData = {
      ...data,
      nr_proc_ret: tipoDeclaracao === 'retificadora' ? selectedPerRetificado : null,
    };
    
    if (isEditing) {
      updateMutation.mutate(submissionData);
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseCurrencyToNumber(rawValue);
    form.setValue('vlr_credito', numericValue);
    setCurrencyDisplay(formatCurrencyDisplay(numericValue));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar PER' : 'Novo PER'}</DialogTitle>
          <DialogDescription className="sr-only">Formulário de processo PER</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <FormLabel>Cliente</FormLabel>
              <Select
                value={selectedClienteId}
                onValueChange={(v) => {
                  setSelectedClienteId(v);
                  // Reset contribuinte when client changes
                  form.setValue('id_contribuinte', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <FormField
              control={form.control}
              name="id_contribuinte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribuinte <RequiredMark /></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o contribuinte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contribuintes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Declaração - Only show when creating */}
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel>Tipo de Declaração</FormLabel>
                <Select 
                  value={tipoDeclaracao} 
                  onValueChange={(v) => setTipoDeclaracao(v as 'original' | 'retificadora')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="retificadora">Retificadora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PER Retificado - Only show when Retificadora is selected and not editing */}
            {!isEditing && tipoDeclaracao === 'retificadora' && (
              <div className="space-y-2">
                <FormLabel>PER a ser Retificado</FormLabel>
                <Popover open={perRetificadoOpen} onOpenChange={setPerRetificadoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={perRetificadoOpen}
                      className={cn(
                        "w-full justify-between font-normal",
                        !selectedPerRetificado && "text-muted-foreground"
                      )}
                    >
                      {selectedPerRetificado || "Selecione o processo..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar número do processo..." 
                        value={perSearchQuery}
                        onValueChange={setPerSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-y-auto">
                          {filteredPersExistentes.map((per) => (
                            <CommandItem
                              key={per.numero_processo_per}
                              value={per.numero_processo_per}
                              onSelect={() => {
                                setSelectedPerRetificado(per.numero_processo_per);
                                form.setValue('nr_proc_ret', per.numero_processo_per);
                                setPerRetificadoOpen(false);
                                setPerSearchQuery('');
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-mono text-sm">{per.numero_processo_per}</span>
                                <span className="text-xs text-muted-foreground">
                                  {per.exercicio}/{per.tri_exercicio}T • {per.tp_credito}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {tipoDeclaracao === 'retificadora' && !selectedPerRetificado && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Selecione o processo que será retificado
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="numero_processo_per"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Processo <RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isEditing}
                      placeholder="00000.00000.000000.0.0.00-0000"
                      onChange={(e) => {
                        const formatted = formatProcessNumber(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />




            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exercicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercício <RequiredMark /></FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tri_exercicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trimestre <RequiredMark /></FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1º Trimestre</SelectItem>
                        <SelectItem value="2">2º Trimestre</SelectItem>
                        <SelectItem value="3">3º Trimestre</SelectItem>
                        <SelectItem value="4">4º Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dt_solicitada"
              render={({ field }) => {
                const selectedDate = field.value 
                  ? parse(field.value, 'yyyy-MM-dd', new Date())
                  : undefined;
                
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Solicitada <RequiredMark /></FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(parse(field.value, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, 'yyyy-MM-dd'));
                            }
                            setCalendarOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="tp_credito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Crédito <RequiredMark /></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PIS">PIS</SelectItem>
                      <SelectItem value="COFINS">COFINS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vlr_credito"
              render={() => (
                <FormItem>
                  <FormLabel>Valor do Crédito <RequiredMark /></FormLabel>
                  <FormControl>
                    <Input
                      value={currencyDisplay}
                      onChange={handleCurrencyChange}
                      placeholder="R$ 0,00"
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
              <Button 
                type="submit" 
                disabled={isLoading || (tipoDeclaracao === 'retificadora' && !selectedPerRetificado && !isEditing)}
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
