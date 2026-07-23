import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProcessStageUpdatePayload {
  name: string;
  description: string | null;
  responsible: string | null;
  time_current: string | null;
  time_target: string | null;
  frequency: string | null;
  volume: string | null;
  automation_level: string | null;
}

interface UpdateProcessStageInput {
  stageId: string;
  payload: ProcessStageUpdatePayload;
}

export function useUpdateProcessStage() {
  return useMutation({
    mutationFn: async ({ stageId, payload }: UpdateProcessStageInput) => {
      const { error } = await supabase
        .from('process_stages')
        .update(payload)
        .eq('id', stageId);

      if (error) throw error;
    },
  });
}

export function useDeleteProcessStage() {
  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('process_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;
    },
  });
}
