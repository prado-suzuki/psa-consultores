import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tool = Database['public']['Tables']['tools']['Row'];

export interface CriarNovaFerramentaInput {
  name: string;
  description: string;
  selectedAreas: string[];
  userId: string | undefined;
}

interface UseDomainNovaFerramentaOptions {
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function useDomainNovaFerramenta({
  onSuccess,
  onError,
}: UseDomainNovaFerramentaOptions) {
  const queryClient = useQueryClient();

  return useMutation<Tool, Error, CriarNovaFerramentaInput>({
    mutationFn: async ({ name, description, selectedAreas, userId }) => {
      const { data: tool, error: toolError } = await supabase
        .from('tools')
        .insert({
          name,
          description,
          status: 'development',
          created_by: userId,
        })
        .select()
        .single();

      if (toolError) throw toolError;

      if (selectedAreas.length > 0) {
        const accessEntries = selectedAreas.map((area) => ({
          tool_id: tool.id,
          area,
          granted_by: userId,
        }));

        const { error: accessError } = await supabase
          .from('tool_area_access')
          .insert(accessEntries);

        if (accessError) throw accessError;
      }

      return tool;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tools'] });
      onSuccess();
    },
    onError,
  });
}
