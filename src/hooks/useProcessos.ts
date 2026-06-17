import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createEntityHooks } from './_createEntityHooks';
import { supabase } from '@/integrations/supabase/client';
import type { Processo } from '@/types';

const hooks = createEntityHooks<Processo>({
  resource: 'processes',
  defaultOrder: 'order_index',
  // MAPA-only: esconde os 28 processos do Digital Rotina (cluster_id NULL).
  listNotNull: ['cluster_id'],
});

export const useProcessos = hooks.useList;
export const useProcesso = hooks.useById;
export const useCreateProcesso = hooks.useCreate;
export const useUpdateProcesso = hooks.useUpdate;
export const useDeleteProcesso = hooks.useDelete;

/**
 * Reordena processos (arraste na lista) gravando `order_index` em lote.
 * Update otimista no cache `['processes']` ⇒ os códigos visuais (P1.01…)
 * recomputam na hora; rollback + toast se a persistência falhar (sem
 * fallback silencioso). A ordem é por-projeto, então os índices 0..N-1
 * de cada grupo são auto-consistentes com a numeração `Pn.NN`.
 */
export function useReorderProcessos() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; order_index: number }[], { prev?: Processo[] }>({
    mutationFn: async (ordered) => {
      for (const { id, order_index } of ordered) {
        const { error } = await supabase
          .from('processes')
          .update({ order_index } as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: ['processes'] });
      const prev = qc.getQueryData<Processo[]>(['processes']);
      if (prev) {
        const idx = new Map(ordered.map(o => [o.id, o.order_index]));
        qc.setQueryData<Processo[]>(['processes'], prev.map(p =>
          idx.has(p.id) ? { ...p, order_index: idx.get(p.id) as number } : p,
        ));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['processes'], ctx.prev);
      toast.error('Não foi possível salvar a nova ordem dos processos');
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['processes'] }); },
  });
}
