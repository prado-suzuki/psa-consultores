import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export type DomainProcessImprovementJobRole = Tables<'job_roles'>;

export interface DomainProcessRoiResults {
  time_saved_hours?: number | null;
  cost_saved_monthly?: number | null;
  roi_percentage?: number | null;
  payback_months?: number | null;
}

interface DomainProcessRoiResponse {
  results?: DomainProcessRoiResults | null;
}

interface UpdateDomainProcessInput {
  processId: string;
  payload: TablesUpdate<'processes'>;
}

const domainProcessImprovementKeys = {
  jobRoles: ['domain-process-improvement', 'job-roles'] as const,
  createImprovement: ['domain-process-improvement', 'create-improvement'] as const,
  createSavingsDetails: ['domain-process-improvement', 'create-savings-details'] as const,
  createTeamMembers: ['domain-process-improvement', 'create-team-members'] as const,
  calculateRoi: ['domain-process-improvement', 'calculate-roi'] as const,
  updateProcess: ['domain-process-improvement', 'update-process'] as const,
};

export function useDomainProcessImprovement(open: boolean) {
  const jobRolesQuery = useQuery({
    queryKey: domainProcessImprovementKeys.jobRoles,
    enabled: open,
    queryFn: async () =>
      supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('hourly_rate', { ascending: true }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const createImprovementMutation = useMutation({
    mutationKey: domainProcessImprovementKeys.createImprovement,
    mutationFn: async (payload: TablesInsert<'process_improvements'>) =>
      supabase.from('process_improvements').insert(payload).select().single(),
  });

  const createSavingsDetailsMutation = useMutation({
    mutationKey: domainProcessImprovementKeys.createSavingsDetails,
    mutationFn: async (payload: TablesInsert<'improvement_savings_details'>[]) =>
      supabase.from('improvement_savings_details').insert(payload),
  });

  const createTeamMembersMutation = useMutation({
    mutationKey: domainProcessImprovementKeys.createTeamMembers,
    mutationFn: async (payload: TablesInsert<'improvement_team_members'>[]) =>
      supabase.from('improvement_team_members').insert(payload),
  });

  const calculateRoiMutation = useMutation({
    mutationKey: domainProcessImprovementKeys.calculateRoi,
    mutationFn: async (improvementId: string) =>
      supabase.functions.invoke<DomainProcessRoiResponse>('calculate-process-roi', {
        body: { improvement_id: improvementId },
      }),
  });

  const updateProcessMutation = useMutation({
    mutationKey: domainProcessImprovementKeys.updateProcess,
    mutationFn: async ({ processId, payload }: UpdateDomainProcessInput) => {
      await assertCanPerform('processes', 'update', processId);
      return supabase.from('processes').update(payload).eq('id', processId);
    },
  });

  return {
    jobRolesQuery,
    createImprovementMutation,
    createSavingsDetailsMutation,
    createTeamMembersMutation,
    calculateRoiMutation,
    updateProcessMutation,
  };
}
