import { useMutation } from '@tanstack/react-query';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import {
  buildDeliverableStatusPayload,
  type EquipeKanbanDeliverableUpdate,
} from '@/lib/equipeKanban';

interface UpdateStatusInput {
  deliverableId: string;
  status: string;
}

interface SaveDeliverableInput {
  deliverableId: string;
  payload: EquipeKanbanDeliverableUpdate;
}

const mutationOptions = { retry: false, networkMode: 'always', onError: () => undefined } as const;

export function useEquipeKanbanDeliverableMutations() {
  const updateStatus = useMutation({
    mutationKey: ['domain-equipe-kanban', 'update-status'],
    mutationFn: async ({ deliverableId, status }: UpdateStatusInput) => {
      await supabase
        .from('sprint_deliverables')
        .update(buildDeliverableStatusPayload(status))
        .eq('id', deliverableId);
    },
    ...mutationOptions,
  });

  const saveDeliverable = useMutation({
    mutationKey: ['domain-equipe-kanban', 'save-deliverable'],
    mutationFn: async ({ deliverableId, payload }: SaveDeliverableInput) => {
      const { error } = await supabase
        .from('sprint_deliverables')
        .update(payload)
        .eq('id', deliverableId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const deleteDeliverable = useMutation({
    mutationKey: ['domain-equipe-kanban', 'delete-deliverable'],
    mutationFn: async (deliverableId: string) => {
      const { data: attachments } = await supabase
        .from('deliverable_attachments')
        .select('id, file_path')
        .eq('deliverable_id', deliverableId);
      if (attachments && attachments.length > 0) {
        await assertCanPerform('deliverable_attachments', 'delete', attachments[0].id);
        await supabase.storage
          .from('deliverable-attachments')
          .remove(attachments.map((item) => item.file_path));
        await supabase.from('deliverable_attachments').delete().eq('deliverable_id', deliverableId);
      }
      const { error } = await supabase.from('sprint_deliverables').delete().eq('id', deliverableId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  return { updateStatus, saveDeliverable, deleteDeliverable };
}
