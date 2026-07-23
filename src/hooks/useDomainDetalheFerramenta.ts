import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

interface UpdateToolInput {
  name: string;
  description: string;
  status: string;
  selectedAreas: string[];
  userId: string | undefined;
}

interface UseDomainDetalheFerramentaOptions {
  id: string | undefined;
  onUpdateSuccess: () => void;
  onUpdateError: (error: Error) => void;
  onDeleteSuccess: () => void;
  onDeleteError: (error: Error) => void;
}

export function useDomainDetalheFerramenta({
  id,
  onUpdateSuccess,
  onUpdateError,
  onDeleteSuccess,
  onDeleteError,
}: UseDomainDetalheFerramentaOptions) {
  const queryClient = useQueryClient();

  const toolQuery = useQuery({
    queryKey: ['tool', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const toolAccessQuery = useQuery({
    queryKey: ['tool-access', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tool_area_access')
        .select('*')
        .eq('tool_id', id);

      if (error) throw error;
      return data;
    },
  });

  const updateTool = useMutation({
    mutationFn: async ({
      name,
      description,
      status,
      selectedAreas,
      userId,
    }: UpdateToolInput) => {
      await assertCanPerform('tools', 'update', id as string);

      const { error: toolError } = await supabase
        .from('tools')
        .update({
          name,
          description,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (toolError) throw toolError;

      // Update area access - delete existing and insert new
      // Precheck do delete em lote — amostra um id antes pra rodar can_perform.
      const { data: sampleAccess } = await supabase
        .from('tool_area_access')
        .select('id')
        .eq('tool_id', id)
        .limit(1)
        .maybeSingle();
      if (sampleAccess?.id) {
        await assertCanPerform('tool_area_access', 'delete', sampleAccess.id);
      }
      await supabase.from('tool_area_access').delete().eq('tool_id', id);

      if (selectedAreas.length > 0) {
        const accessEntries = selectedAreas.map((area) => ({
          tool_id: id,
          area,
          granted_by: userId,
        }));

        const { error: accessError } = await supabase
          .from('tool_area_access')
          .insert(accessEntries);

        if (accessError) throw accessError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tool', id] });
      queryClient.invalidateQueries({ queryKey: ['tool-access', id] });
      onUpdateSuccess();
    },
    onError: onUpdateError,
  });

  const deleteTool = useMutation({
    mutationFn: async () => {
      await assertCanPerform('tools', 'delete', id as string);

      const { error } = await supabase.from('tools').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      onDeleteSuccess();
    },
    onError: onDeleteError,
  });

  return {
    tool: toolQuery.data,
    toolAccess: toolAccessQuery.data,
    isLoading: toolQuery.isLoading,
    updateTool,
    deleteTool,
  };
}
