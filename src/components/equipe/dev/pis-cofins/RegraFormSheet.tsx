import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type RegraNCMRow = Database['public']['Tables']['pis_cofins_regra']['Row'];

const schema = z.object({
  cod_ncm: z.string().min(1, 'NCM obrigatório'),
  cst_pis: z.string().min(1, 'CST PIS obrigatório'),
  cst_cofins: z.string().min(1, 'CST COFINS obrigatório'),
  desc_cst: z.string().min(1, 'Descrição CST obrigatória'),
  base_legal: z.string().optional(),
  permite_credito: z.string().optional(),
  tipo_credito: z.string().optional(),
  observacoes: z.string().optional(),
  data_vigencia_inicio: z.coerce.number().optional().nullable(),
  data_vigencia_fim: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface RegraFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regra?: RegraNCMRow | null;
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
}

export const RegraFormSheet = ({ open, onOpenChange, regra, onSubmit, isSubmitting }: RegraFormSheetProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cod_ncm: '', cst_pis: '', cst_cofins: '', desc_cst: '',
      base_legal: '', permite_credito: '', tipo_credito: '', observacoes: '',
      data_vigencia_inicio: null, data_vigencia_fim: null,
    },
  });

  useEffect(() => {
    if (regra) {
      form.reset({
        cod_ncm: regra.cod_ncm ?? '',
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
    } else {
      form.reset({
        cod_ncm: '', cst_pis: '', cst_cofins: '', desc_cst: '',
        base_legal: '', permite_credito: '', tipo_credito: '', observacoes: '',
        data_vigencia_inicio: null, data_vigencia_fim: null,
      });
    }
  }, [regra, open, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{regra ? 'Editar Regra' : 'Nova Regra NCM'}</SheetTitle>
          <SheetDescription>
            {regra ? 'Edite os campos da regra fiscal.' : 'Preencha os dados para criar uma nova regra.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cod_ncm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código NCM</FormLabel>
                  <FormControl><Input placeholder="0000.00.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cst_pis" render={({ field }) => (
                <FormItem>
                  <FormLabel>CST PIS</FormLabel>
                  <FormControl><Input placeholder="01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cst_cofins" render={({ field }) => (
                <FormItem>
                  <FormLabel>CST COFINS</FormLabel>
                  <FormControl><Input placeholder="01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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
            </div>

            <FormField control={form.control} name="desc_cst" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição CST</FormLabel>
                <FormControl><Input {...field} /></FormControl>
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

            <FormField control={form.control} name="tipo_credito" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Crédito</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_vigencia_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Início (YYYYMM)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="202501" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_vigencia_fim" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Fim (YYYYMM)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="202512" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
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

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {regra ? 'Salvar' : 'Criar Regra'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
