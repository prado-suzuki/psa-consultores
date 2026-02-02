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

const perSchema = z.object({
  numero_processo_per: z.string().min(1, 'Número do processo é obrigatório'),
  id_contribuinte: z.string().min(1, 'Contribuinte é obrigatório'),
  exercicio: z.coerce.number().min(2000).max(2100),
  tri_exercicio: z.coerce.number().min(1).max(4),
  dt_solicitada: z.string().min(1, 'Data é obrigatória'),
  tp_credito: z.string().min(1, 'Tipo de crédito é obrigatório'),
  vlr_credito: z.coerce.number().min(0, 'Valor deve ser positivo'),
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
  const queryClient = useQueryClient();
  const isEditing = !!editData;

  const form = useForm<PerFormData>({
    resolver: zodResolver(perSchema),
    defaultValues: {
      numero_processo_per: '',
      id_contribuinte: contribuinteId || '',
      exercicio: new Date().getFullYear(),
      tri_exercicio: 1,
      dt_solicitada: new Date().toISOString().split('T')[0],
      tp_credito: '',
      vlr_credito: 0,
    },
  });

  // Fetch contribuintes based on clienteId
  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('cliente_id', clienteId)
        .order('nome_razao_social');
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });

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
      });
    } else {
      form.reset({
        numero_processo_per: '',
        id_contribuinte: contribuinteId || '',
        exercicio: new Date().getFullYear(),
        tri_exercicio: 1,
        dt_solicitada: new Date().toISOString().split('T')[0],
        tp_credito: '',
        vlr_credito: 0,
      });
    }
  }, [editData, contribuinteId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PerFormData) => {
      const { error } = await supabase.from('per').insert([{
        numero_processo_per: data.numero_processo_per,
        id_contribuinte: data.id_contribuinte,
        exercicio: data.exercicio,
        tri_exercicio: data.tri_exercicio,
        dt_solicitada: data.dt_solicitada,
        tp_credito: data.tp_credito,
        vlr_credito: data.vlr_credito,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('PER criado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar PER: ${error.message}`);
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
        })
        .eq('numero_processo_per', editData?.numero_processo_per);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('PER atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar PER: ${error.message}`);
    },
  });

  const onSubmit = (data: PerFormData) => {
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
          <DialogTitle>{isEditing ? 'Editar PER' : 'Novo PER'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero_processo_per"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Processo</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_contribuinte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribuinte</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o contribuinte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contribuintes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <FormLabel>Exercício</FormLabel>
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
                    <FormLabel>Trimestre</FormLabel>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Solicitada</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                    <Input {...field} placeholder="Ex: PIS/COFINS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vlr_credito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Crédito (R$)</FormLabel>
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
