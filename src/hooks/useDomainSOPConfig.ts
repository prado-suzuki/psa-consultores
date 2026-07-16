import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface UpdateDomainSOPConfigInput {
  processId: string;
  updates: {
    sop_before_link: string | null;
    sop_before_document_path: string | null;
    sop_before_content: string | null;
    sop_link: string | null;
    sop_document_path: string | null;
    formatted_content: string | null;
  };
}

const UPDATE_DOMAIN_SOP_CONFIG_KEY = ['domain-sop-config', 'update'] as const;

export function useUpdateDomainSOPConfig() {
  return useMutation({
    mutationKey: UPDATE_DOMAIN_SOP_CONFIG_KEY,
    mutationFn: async ({ processId, updates }: UpdateDomainSOPConfigInput) => {
      await assertCanPerform('processes', 'update', processId);
      const { error } = await supabase.from('processes').update(updates).eq('id', processId);

      if (error) throw error;
    },
  });
}
