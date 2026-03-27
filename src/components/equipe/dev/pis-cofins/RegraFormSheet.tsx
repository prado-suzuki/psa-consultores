import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Pencil, ChevronsUpDown, Check } from 'lucide-react';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { SetorCliente } from '@/hooks/useSetorCliente';

/* ── CST Options ── */
const CST_OPTIONS = [
  { code: '01', description: 'Operação Tributável com Alíquota Básica' },
  { code: '02', description: 'Operação Tributável com Alíquota Diferenciada' },
  { code: '03', description: 'Operação Tributável com Alíquota por Unidade de Medida de Produto' },
  { code: '04', description: 'Operação Tributável Monofásica - Revenda a Alíquota Zero' },
  { code: '05', description: 'Operação Tributável por Substituição Tributária' },
  { code: '06', description: 'Operação Tributável a Alíquota Zero' },
  { code: '07', description: 'Operação Isenta da Contribuição' },
  { code: '08', description: 'Operação sem Incidência da Contribuição' },
  { code: '09', description: 'Operação com Suspensão da Contribuição' },
  { code: '49', description: 'Outras Operações de Saída' },
  { code: '50', description: 'Direito a Crédito - Vinculada a Receita Tributada no Mercado Interno' },
  { code: '51', description: 'Direito a Crédito - Vinculada a Receita Não Tributada no Mercado Interno' },
  { code: '52', description: 'Direito a Crédito - Vinculada a Receita de Exportação' },
  { code: '53', description: 'Direito a Crédito - Vinculada a Receitas Tributadas e Não Tributadas no Mercado Interno' },
  { code: '54', description: 'Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { code: '55', description: 'Direito a Crédito - Vinculada a Receitas Não Tributadas no Mercado Interno e de Exportação' },
  { code: '56', description: 'Direito a Crédito - Vinculada a Receitas Tributadas e Não Tributadas no Mercado Interno e de Exportação' },
  { code: '60', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receita Tributada no Mercado Interno' },
  { code: '61', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receita Não Tributada no Mercado Interno' },
  { code: '62', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receita de Exportação' },
  { code: '63', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não Tributadas no Mercado Interno' },
  { code: '64', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { code: '65', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não Tributadas no Mercado Interno e de Exportação' },
  { code: '66', description: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não Tributadas no Mercado Interno e de Exportação' },
  { code: '67', description: 'Crédito Presumido - Outras Operações' },
  { code: '70', description: 'Operação de Aquisição sem Direito a Crédito' },
  { code: '71', description: 'Operação de Aquisição com Isenção' },
  { code: '72', description: 'Operação de Aquisição com Suspensão' },
  { code: '73', description: 'Operação de Aquisição a Alíquota Zero' },
  { code: '74', description: 'Operação de Aquisição sem Incidência' },
  { code: '75', description: 'Operação de Aquisição por Substituição Tributária' },
  { code: '98', description: 'Outras Operações de Entrada' },
  { code: '99', description: 'Outras Operações' },
] as const;

/* ── Helpers ── */
const yyyymmToMonthYear = (val: number | null | undefined) => {
  if (!val) return null;
  const y = Math.floor(val / 100);
  const m = (val % 100) - 1;
  return { month: m, year: y };
};

const monthYearToYYYYMM = (val: { month: number; year: number } | null) => {
  if (!val) return null;
  return val.year * 100 + (val.month + 1);
};

const formatYYYYMM = (val: number | null | undefined) => {
  if (!val) return null;
  const y = Math.floor(val / 100);
  const m = val % 100;
  return `${String(m).padStart(2, '0')}/${y}`;
};

type RegraNCMRow = Database['public']['Tables']['pis_cofins_regra']['Row'];

const schema = z.object({
  cod_ncm: z.string().min(1, 'NCM obrigatório').max(8, 'NCM deve ter no máximo 8 dígitos'),
  id_segmento: z.string().min(1, 'Setor/Segmento obrigatório'),
  cst_pis: z.string().min(1, 'CST PIS/COFINS obrigatório'),
  cst_cofins: z.string().optional(),
  desc_cst: z.string().optional(),
  base_legal: z.string().optional(),
  permite_credito: z.string().optional(),
  tipo_credito: z.string().optional(),
  observacoes: z.string().optional(),
  data_vigencia_inicio: z.coerce.number().optional().nullable(),
  data_vigencia_fim: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;
type ModalMode = 'view' | 'edit' | 'create';

interface RegraDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regra?: RegraNCMRow | null;
  mode: ModalMode;
  onModeChange: (mode: ModalMode) => void;
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
  setores: SetorCliente[];
  setorMap: Record<string, SetorCliente>;
}

const DetailField = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <p className="text-sm text-foreground mt-0.5">{value || '—'}</p>
  </div>
);

/* ── Combobox CST ── */
interface CstComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSyncDesc?: (desc: string) => void;
  onSyncCode?: (code: string) => void;
  mode: 'code' | 'description';
  placeholder?: string;
}

const CstCombobox = ({ value, onChange, onSyncDesc, onSyncCode, mode, placeholder }: CstComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = CST_OPTIONS.filter(opt => {
    if (!search) return true;
    const q = search.toLowerCase();
    return opt.code.includes(q) || opt.description.toLowerCase().includes(q);
  });

  const handleSelect = (opt: typeof CST_OPTIONS[number]) => {
    if (mode === 'code') {
      onChange(opt.code);
      onSyncDesc?.(opt.description);
    } else {
      onChange(opt.description);
      onSyncCode?.(opt.code);
    }
    setOpen(false);
    setSearch('');
  };

  const selectedOpt = CST_OPTIONS.find(o => mode === 'code' ? o.code === value : o.description === value);
  const displayValue = selectedOpt ? `${selectedOpt.code} — ${selectedOpt.description}` : value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10 text-sm"
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
            {displayValue || placeholder || 'Selecione...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onWheelCapture={(e) => e.stopPropagation()}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar CST..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum CST encontrado</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map(opt => {
                const isSelected = mode === 'code'
                  ? value === opt.code
                  : value === opt.description;
                return (
                  <CommandItem
                    key={opt.code}
                    value={opt.code}
                    onSelect={() => handleSelect(opt)}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono mr-2 text-muted-foreground">{opt.code}</span>
                    <span className="truncate">{opt.description}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/* ── Modal principal ── */
export const RegraFormSheet = ({ open, onOpenChange, regra, mode, onModeChange, onSubmit, isSubmitting, setores, setorMap }: RegraDetailModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cod_ncm: '', id_segmento: '', cst_pis: '', cst_cofins: '', desc_cst: '',
      base_legal: '', permite_credito: '', tipo_credito: '', observacoes: '',
      data_vigencia_inicio: null, data_vigencia_fim: null,
    },
  });

  useEffect(() => {
    if (regra && mode !== 'create') {
      form.reset({
        cod_ncm: regra.cod_ncm ?? '',
        id_segmento: regra.id_segmento ?? '',
        cst_pis: regra.cst_pis ?? '',
        cst_cofins: regra.cst_cofins ?? '',
        desc_cst: regra.desc_cst ?? '',
        base_legal: regra.base_legal ?? '',
        permite_credito: regra.permite_credito ?? '',
        tipo_credito: regra.tipo_credito ?? '',
        observacoes: regra.observacoes ?? '',
        data_vigencia_inicio: regra.data_vigencia_inicio ?? null,
        data_vigencia_fim: regra.data_vigencia_fim ?? null,
      });
    } else if (mode === 'create') {
      form.reset({
        cod_ncm: '', id_segmento: '', cst_pis: '', cst_cofins: '', desc_cst: '',
        base_legal: '', permite_credito: '', tipo_credito: '', observacoes: '',
        data_vigencia_inicio: null, data_vigencia_fim: null,
      });
    }
  }, [regra, mode, open, form]);

  const isViewMode = mode === 'view';

  const handleClose = () => onOpenChange(false);

  const handleCancel = () => {
    if (mode === 'edit' && regra) {
      onModeChange('view');
    } else {
      handleClose();
    }
  };

  const handleFormSubmit = (values: FormValues) => {
    const cstOpt = CST_OPTIONS.find(o => o.code === values.cst_pis);
    onSubmit({ ...values, cst_cofins: values.cst_pis, desc_cst: cstOpt?.description ?? '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Regra NCM' : mode === 'edit' ? 'Editar Regra' : 'Detalhes da Regra'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Preencha os dados para criar uma nova regra.'
              : mode === 'edit'
                ? 'Edite os campos da regra fiscal.'
                : 'Visualize os detalhes da regra fiscal NCM.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {isViewMode && regra ? (
            <div key="view-content" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Código NCM" value={regra.cod_ncm} />
                <DetailField label="Setor/Segmento" value={setorMap[regra.id_segmento ?? '']?.nome ?? regra.id_segmento} />
                <DetailField label="CST PIS/COFINS" value={regra.cst_pis} />
                <DetailField label="Descrição CST" value={regra.desc_cst} />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Permite Crédito</span>
                  <div className="mt-1">
                    {regra.permite_credito === 'S' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">Não</Badge>
                    )}
                  </div>
                </div>
              </div>
              <DetailField label="Base Legal" value={regra.base_legal} />
              <DetailField label="Tipo de Crédito" value={regra.tipo_credito} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Vigência Início" value={formatYYYYMM(regra.data_vigencia_inicio)} />
                <DetailField label="Vigência Fim" value={formatYYYYMM(regra.data_vigencia_fim)} />
              </div>
              <DetailField label="Observações" value={regra.observacoes} />
              {((regra as any).updated_at || (regra as any).updated_by) && (
                <div className="border-t pt-3 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField
                      label="Última atualização"
                      value={(regra as any).updated_at ? format(new Date((regra as any).updated_at), 'dd/MM/yyyy HH:mm') : null}
                    />
                    <DetailField label="Atualizado por" value={(regra as any).updated_by} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form key="edit-content" id="regra-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cod_ncm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código NCM</FormLabel>
                      <FormControl><Input placeholder="00000000" maxLength={8} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="id_segmento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor/Segmento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {setores.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.sigla} — {s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="permite_credito" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permite Crédito</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="S">Sim</SelectItem>
                          <SelectItem value="N">Não</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tipo_credito" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Crédito</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="cst_pis" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CST PIS/COFINS</FormLabel>
                    <FormControl>
                      <CstCombobox
                        value={field.value}
                        onChange={field.onChange}
                        onSyncDesc={(desc) => form.setValue('desc_cst', desc)}
                        mode="code"
                        placeholder="Selecione o CST..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="base_legal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Legal</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="data_vigencia_inicio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vigência Início</FormLabel>
                      <FormControl>
                        <MonthYearPicker
                          value={yyyymmToMonthYear(field.value)}
                          onChange={(v) => field.onChange(monthYearToYYYYMM(v))}
                          placeholder="Selecione o mês"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data_vigencia_fim" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vigência Fim</FormLabel>
                      <FormControl>
                        <MonthYearPicker
                          value={yyyymmToMonthYear(field.value)}
                          onChange={(v) => field.onChange(monthYearToYYYYMM(v))}
                          placeholder="Selecione o mês"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="observacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          )}
        </div>

        <DialogFooter className="pt-4">
          {isViewMode ? (
            <div key="view-footer" className="flex gap-2 justify-end w-full">
              <Button type="button" variant="outline" onClick={handleClose}>Fechar</Button>
              <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onModeChange('edit')}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            </div>
          ) : (
            <div key="edit-footer" className="flex gap-2 justify-end w-full">
              <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
              <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isSubmitting} onClick={form.handleSubmit(handleFormSubmit)}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Criar Regra' : 'Salvar'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
