import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewStageFormValues {
  name: string;
  description: string;
  responsible: string;
  time_current: string;
  time_target: string;
  frequency: string;
  volume: string;
  automation_level: string;
}

export interface CreateProcessStageInput {
  processId: string;
  nextOrder: number;
  form: NewStageFormValues;
}

export function useCreateProcessStage(): UseMutationResult<void, Error, CreateProcessStageInput> {
  return useMutation({
    mutationFn: async ({ processId, nextOrder, form }) => {
      const { error } = await supabase
        .from('process_stages')
        .insert({
          process_id: processId,
          stage_order: nextOrder,
          name: form.name.trim(),
          description: form.description.trim() || null,
          responsible: form.responsible.trim() || null,
          time_current: form.time_current.trim() || null,
          time_target: form.time_target.trim() || null,
          frequency: form.frequency.trim() || null,
          volume: form.volume.trim() || null,
          automation_level: form.automation_level === 'none' ? null : form.automation_level,
          inputs: [],
          outputs: [],
          systems: [],
        });

      if (error) throw error;
    },
  });
}
