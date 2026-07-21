import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreateRoutineInput {
  title: string;
  description: string | null;
  is_recurring: boolean;
  frequency: string;
  assigned_to: string | null;
  estimated_hours: number | null;
  status: string;
  created_by: string | undefined;
}

const rotinasQueryKeys = {
  all: ['domain-rotinas'] as const,
  teamMembers: ['domain-rotinas', 'team-members'] as const,
  assignedTo: (userId: string | undefined) =>
    ['domain-rotinas', 'assigned-to', userId ?? null] as const,
};

export function useDomainRotinas(userId: string | undefined) {
  const teamMembersQuery = useQuery({
    queryKey: rotinasQueryKeys.teamMembers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      return data ?? [];
    },
  });

  const routinesQuery = useQuery({
    queryKey: rotinasQueryKeys.assignedTo(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('assigned_to', userId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    teamMembers: teamMembersQuery.data ?? [],
    myRoutines: routinesQuery.data ?? [],
    isLoading: teamMembersQuery.isLoading || routinesQuery.isLoading,
    error: teamMembersQuery.error ?? routinesQuery.error,
  };
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoutineInput) => {
      const { error } = await supabase.from('routines').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rotinasQueryKeys.all });
    },
  });
}
