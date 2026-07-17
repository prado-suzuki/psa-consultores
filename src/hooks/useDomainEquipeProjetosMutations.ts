import { useMutation } from '@tanstack/react-query';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

interface UpdateProjectInput {
  projectId: string;
  payload: TablesUpdate<'projects'>;
}

interface UpdateProjectStatusInput {
  projectId: string;
  status: string;
}

interface UpdateProcessInput {
  processId: string;
  payload: TablesUpdate<'processes'>;
}

interface UpdateProcessStageInput {
  processId: string;
  stage: string;
}

const equipeProjetosMutationKeys = {
  importProjects: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'import-projects', userId ?? null] as const,
  createProject: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'create-project', userId ?? null] as const,
  updateProject: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'update-project', userId ?? null] as const,
  deleteProject: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'delete-project', userId ?? null] as const,
  updateProjectStatus: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'update-project-status', userId ?? null] as const,
  createProcess: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'create-process', userId ?? null] as const,
  updateProcess: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'update-process', userId ?? null] as const,
  deleteProcess: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'delete-process', userId ?? null] as const,
  updateProcessStage: (userId: string | undefined) =>
    ['domain-equipe-projetos', 'update-process-stage', userId ?? null] as const,
};

export function useEquipeProjetoMutations(userId: string | undefined) {
  const importProjectsMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.importProjects(userId),
    mutationFn: async (payload: TablesInsert<'projects'>[]) => {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const createProjectMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.createProject(userId),
    mutationFn: async (payload: TablesInsert<'projects'>) => {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const updateProjectMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.updateProject(userId),
    mutationFn: async ({ projectId, payload }: UpdateProjectInput) => {
      await assertCanPerform('projects', 'update', projectId);
      const { error } = await supabase.from('projects').update(payload).eq('id', projectId);

      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const deleteProjectMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.deleteProject(userId),
    mutationFn: async (projectId: string) => {
      await assertCanPerform('projects', 'delete', projectId);
      const { error } = await supabase.from('projects').delete().eq('id', projectId);

      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const updateProjectStatusMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.updateProjectStatus(userId),
    mutationFn: async ({ projectId, status }: UpdateProjectStatusInput) => {
      await assertCanPerform('projects', 'update', projectId);
      await supabase.from('projects').update({ status }).eq('id', projectId);
    },
    networkMode: 'always',
    retry: false,
  });

  return {
    importProjectsMutation,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    updateProjectStatusMutation,
  };
}

export function useEquipeProjetoProcessMutations(userId: string | undefined) {
  const createProcessMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.createProcess(userId),
    mutationFn: async (payload: TablesInsert<'processes'>) => {
      const { error } = await supabase.from('processes').insert(payload);
      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const updateProcessMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.updateProcess(userId),
    mutationFn: async ({ processId, payload }: UpdateProcessInput) => {
      await assertCanPerform('processes', 'update', processId);
      const { error } = await supabase.from('processes').update(payload).eq('id', processId);

      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const deleteProcessMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.deleteProcess(userId),
    mutationFn: async (processId: string) => {
      await assertCanPerform('processes', 'delete', processId);
      const { error } = await supabase.from('processes').delete().eq('id', processId);

      if (error) throw error;
    },
    networkMode: 'always',
    retry: false,
  });

  const updateProcessStageMutation = useMutation({
    mutationKey: equipeProjetosMutationKeys.updateProcessStage(userId),
    mutationFn: async ({ processId, stage }: UpdateProcessStageInput) => {
      await assertCanPerform('processes', 'update', processId);
      await supabase.from('processes').update({ stage }).eq('id', processId);
    },
    networkMode: 'always',
    retry: false,
  });

  return {
    createProcessMutation,
    updateProcessMutation,
    deleteProcessMutation,
    updateProcessStageMutation,
  };
}
