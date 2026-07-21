import { useMutation } from '@tanstack/react-query';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

interface UpdateProcessInput {
  processId: string;
  payload: TablesUpdate<'processes'>;
}

interface AddProjectLinkInput {
  processId: string;
  projectId: string;
  impactType: string;
}

const mutationKeys = {
  importProcesses: (userId: string | undefined) =>
    ['domain-equipe-processos', 'import', userId ?? null] as const,
  updateProcess: (userId: string | undefined) =>
    ['domain-equipe-processos', 'update', userId ?? null] as const,
  deleteProcess: (userId: string | undefined) =>
    ['domain-equipe-processos', 'delete', userId ?? null] as const,
  addProjectLink: (userId: string | undefined) =>
    ['domain-equipe-processos', 'add-project-link', userId ?? null] as const,
  removeProjectLink: (userId: string | undefined) =>
    ['domain-equipe-processos', 'remove-project-link', userId ?? null] as const,
};

const mutationOptions = {
  retry: false,
  networkMode: 'always',
  // The page keeps its existing action-specific console logs and toasts.
  onError: () => undefined,
} as const;

export function useEquipeProcessosMutations(userId: string | undefined) {
  const importProcessesMutation = useMutation({
    mutationKey: mutationKeys.importProcesses(userId),
    mutationFn: async (payload: TablesInsert<'processes'>[]) => {
      const { error } = await supabase.from('processes').insert(payload);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const updateProcessMutation = useMutation({
    mutationKey: mutationKeys.updateProcess(userId),
    mutationFn: async ({ processId, payload }: UpdateProcessInput) => {
      await assertCanPerform('processes', 'update', processId);
      const { error } = await supabase.from('processes').update(payload).eq('id', processId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const deleteProcessMutation = useMutation({
    mutationKey: mutationKeys.deleteProcess(userId),
    mutationFn: async (processId: string) => {
      const { data: sampleStage } = await supabase
        .from('process_stages')
        .select('id')
        .eq('process_id', processId)
        .limit(1)
        .maybeSingle();
      if (sampleStage?.id) await assertCanPerform('process_stages', 'delete', sampleStage.id);
      await supabase.from('process_stages').delete().eq('process_id', processId);

      const { data: sampleLink } = await supabase
        .from('project_processes')
        .select('id')
        .eq('process_id', processId)
        .limit(1)
        .maybeSingle();
      if (sampleLink?.id) await assertCanPerform('project_processes', 'delete', sampleLink.id);
      await supabase.from('project_processes').delete().eq('process_id', processId);

      await assertCanPerform('processes', 'delete', processId);
      const { error } = await supabase.from('processes').delete().eq('id', processId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const addProjectLinkMutation = useMutation({
    mutationKey: mutationKeys.addProjectLink(userId),
    mutationFn: async ({ processId, projectId, impactType }: AddProjectLinkInput) => {
      const { error } = await supabase.from('project_processes').insert({
        process_id: processId,
        project_id: projectId,
        impact_type: impactType,
      });
      if (error) throw error;
    },
    ...mutationOptions,
  });

  const removeProjectLinkMutation = useMutation({
    mutationKey: mutationKeys.removeProjectLink(userId),
    mutationFn: async (linkId: string) => {
      await assertCanPerform('project_processes', 'delete', linkId);
      const { error } = await supabase.from('project_processes').delete().eq('id', linkId);
      if (error) throw error;
    },
    ...mutationOptions,
  });

  return {
    importProcessesMutation,
    updateProcessMutation,
    deleteProcessMutation,
    addProjectLinkMutation,
    removeProjectLinkMutation,
  };
}
