import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';

const dcompSchema = z.object({
  nr_documento: z.string().min(1, 'Número do documento é obrigatório'),
  nr_per_orig: z.string().min(1, 'PER de origem é obrigatório'),
  mes_ano_exercicio: z.string().min(1, 'Mês/Ano é obrigatório'),
  dt_envio: z.string().min(1, 'Data de envio é obrigatória'),
  imposto: z.string().min(1, 'Imposto é obrigatório'),
  tp_credito: z.string().min(1, 'Tipo de crédito é obrigatório'),
  vlr_compensado: z.coerce.number().min(0, 'Valor deve ser positivo'),
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
  const queryClient = useQueryClient();
  const isEditing = !!editData;

  const form = useForm<DcompFormData>({
    resolver: zodResolver(dcompSchema),
    defaultValues: {
      nr_documento: '',
      nr_per_orig: '',
      mes_ano_exercicio: '',
      dt_envio: new Date().toISOString().split('T')[0],
      imposto: '',
      tp_credito: '',
      vlr_compensado: 0,
    },
  });

  // Fetch PERs for selection (filtered by contribuinte if available)
  const { data: pers = [] } = useQuery({
    queryKey: ['pers-for-dcomp', contribuinteId],
    queryFn: async () => {
      let query = supabase
        .from('per')
        .select('numero_processo_per, id_contribuinte, exercicio, tri_exercicio')
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
        mes_ano_exercicio: editData.mes_ano_exercicio,
        dt_envio: editData.dt_envio,
        imposto: editData.imposto,
        tp_credito: editData.tp_credito,
        vlr_compensado: editData.vlr_compensado,
      });
    } else {
      form.reset({
        nr_documento: '',
        nr_per_orig: preSelectedPer || '',
        mes_ano_exercicio: '',
        dt_envio: new Date().toISOString().split('T')[0],
        imposto: '',
        tp_credito: '',
        vlr_compensado: 0,
      });
    }
  }, [editData, form, preSelectedPer]);

  const createMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const { error } = await supabase.from('dcomp').insert([{
        nr_documento: data.nr_documento,
        nr_per_orig: data.nr_per_orig,
        mes_ano_exercicio: data.mes_ano_exercicio,
        dt_envio: data.dt_envio,
        imposto: data.imposto,
        tp_credito: data.tp_credito,
        vlr_compensado: data.vlr_compensado,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      toast.success('DCOMP criado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar DCOMP: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DcompFormData) => {
      const { error } = await supabase
        .from('dcomp')
        .update({
          nr_per_orig: data.nr_per_orig,
          mes_ano_exercicio: data.mes_ano_exercicio,
          dt_envio: data.dt_envio,
          imposto: data.imposto,
          tp_credito: data.tp_credito,
          vlr_compensado: data.vlr_compensado,
        })
        .eq('nr_documento', editData?.nr_documento);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      toast.success('DCOMP atualizado com sucesso!');
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar DCOMP' : 'Novo DCOMP'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nr_documento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Documento</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEditing} />
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
                  <FormLabel>PER de Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o PER" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pers.map((per) => (
                        <SelectItem key={per.numero_processo_per} value={per.numero_processo_per}>
                          {per.numero_processo_per} ({per.exercicio}/{per.tri_exercicio}T)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mes_ano_exercicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês/Ano Exercício</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dt_envio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Envio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imposto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imposto</FormLabel>
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
                      <SelectItem value="IRPJ">IRPJ</SelectItem>
                      <SelectItem value="CSLL">CSLL</SelectItem>
                      <SelectItem value="INSS">INSS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tp_credito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Crédito</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Ressarcimento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vlr_compensado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Compensado (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
