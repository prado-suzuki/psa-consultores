import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const situacaoSchema = z.object({
  nr_proc_per: z.string().min(1, 'PER é obrigatório'),
  situacao: z.string().min(1, 'Situação é obrigatória'),
  dt_pagamento: z.string().optional(),
});

type SituacaoFormData = z.infer<typeof situacaoSchema>;

interface SituacaoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
  contribuinteId?: string;
}

const SITUACOES = [
  'Pendente de Análise',
  'Em Análise',
  'Deferido',
  'Deferido Parcialmente',
  'Indeferido',
  'Pago',
  'Cancelado',
  'Aguardando Documentação',
];

export function SituacaoFormModal({
  open,
  onOpenChange,
  editData,
  contribuinteId,
}: SituacaoFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editData;

  const form = useForm<SituacaoFormData>({
    resolver: zodResolver(situacaoSchema),
    defaultValues: {
      nr_proc_per: '',
      situacao: '',
      dt_pagamento: '',
    },
  });

  // Fetch PERs for selection
  const { data: pers = [] } = useQuery({
    queryKey: ['pers-for-situacao', contribuinteId],
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
        nr_proc_per: editData.nr_proc_per,
        situacao: editData.situacao,
        dt_pagamento: editData.dt_pagamento || '',
      });
    } else {
      form.reset({
        nr_proc_per: '',
        situacao: '',
        dt_pagamento: '',
      });
    }
  }, [editData, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SituacaoFormData) => {
      const insertData: any = {
        nr_proc_per: data.nr_proc_per,
        situacao: data.situacao,
      };
      if (data.dt_pagamento) {
        insertData.dt_pagamento = data.dt_pagamento;
      }
      const { data: result, error } = await supabase.from('per_situacao').insert(insertData).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-situacao'] });
      toast.success('Situação registrada com sucesso!');
      onOpenChange(false);

      if (result) {
        syncPerdcompToDW({ per_situacao: [result] });
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar situação: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SituacaoFormData) => {
      const updateData: any = {
        nr_proc_per: data.nr_proc_per,
        situacao: data.situacao,
      };
      if (data.dt_pagamento) {
        updateData.dt_pagamento = data.dt_pagamento;
      } else {
        updateData.dt_pagamento = null;
      }
      const { data: result, error } = await supabase
        .from('per_situacao')
        .update(updateData)
        .eq('id', editData?.id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-situacao'] });
      toast.success('Situação atualizada com sucesso!');
      onOpenChange(false);

      if (result) {
        syncPerdcompToDW({ per_situacao: [result] });
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar situação: ${error.message}`);
    },
  });

  const onSubmit = (data: SituacaoFormData) => {
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
          <DialogTitle>{isEditing ? 'Editar Situação' : 'Nova Situação'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nr_proc_per"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PER</FormLabel>
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
              name="situacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a situação" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SITUACOES.map((sit) => (
                        <SelectItem key={sit} value={sit}>
                          {sit}
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
              name="dt_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Pagamento (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
