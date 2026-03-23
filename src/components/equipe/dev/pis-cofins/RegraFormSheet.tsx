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
import { Loader2, Pencil } from 'lucide-react';
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

type ModalMode = 'view' | 'edit' | 'create';

interface RegraDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regra?: RegraNCMRow | null;
  mode: ModalMode;
  onModeChange: (mode: ModalMode) => void;
  onSubmit: (values: FormValues) => void;
  isSubmitting: boolean;
}

const DetailField = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <p className="text-sm text-foreground mt-0.5">{value || '—'}</p>
  </div>
);

export const RegraFormSheet = ({ open, onOpenChange, regra, mode, onModeChange, onSubmit, isSubmitting }: RegraDetailModalProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cod_ncm: '', cst_pis: '', cst_cofins: '', desc_cst: '',
      base_legal: '', permite_credito: '', tipo_credito: '', observacoes: '',
      data_vigencia_inicio: null, data_vigencia_fim: null,
    },
  });

  useEffect(() => {
    if (regra && mode !== 'create') {
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
    } else if (mode === 'create') {
      form.reset({
        cod_ncm: '', cst_pis: '', cst_cofins: '', desc_cst: '',
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
                <DetailField label="CST PIS" value={regra.cst_pis} />
                <DetailField label="CST COFINS" value={regra.cst_cofins} />
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
              <DetailField label="Descrição CST" value={regra.desc_cst} />
              <DetailField label="Base Legal" value={regra.base_legal} />
              <DetailField label="Tipo de Crédito" value={regra.tipo_credito} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Vigência Início (YYYYMM)" value={regra.data_vigencia_inicio} />
                <DetailField label="Vigência Fim (YYYYMM)" value={regra.data_vigencia_fim} />
              </div>
              <DetailField label="Observações" value={regra.observacoes} />
              {/* Metadados de auditoria */}
              {((regra as any).updated_at || (regra as any).updated_by) && (
                <div className="border-t pt-3 mt-4 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Metadados</span>
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
              <form key="edit-content" id="regra-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
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
