import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewerCandidate {
  id: string;
  name: string;
}

export function useReviewerCandidates(clusterIds: readonly string[] = []) {
  const stableClusterIds = [...clusterIds].sort();

  return useQuery({
    queryKey: ['org-task-reviewer-candidates', stableClusterIds],
    queryFn: async (): Promise<ReviewerCandidate[]> => {
      if (stableClusterIds.length === 0) return [];

      const [rolesResult, membersResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['sublider', 'lider', 'admin']),
        Promise.all(
          stableClusterIds.map(clusterId =>
            supabase.rpc('get_cluster_members', { _cluster_id: clusterId })
          ),
        ),
      ]);

      if (rolesResult.error) throw rolesResult.error;
      const membersError = membersResult.find(result => result.error)?.error;
      if (membersError) throw membersError;

      const memberIds = new Set(
        membersResult.flatMap(result => result.data || []).map(member => member.id),
      );
      const eligibleIds = [
        ...new Set(
          (rolesResult.data || [])
            .map(role => role.user_id)
            .filter(userId => memberIds.has(userId)),
        ),
      ];

      if (eligibleIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', eligibleIds);

      if (profilesError) throw profilesError;

      return (profiles || [])
        .filter((profile): profile is typeof profile & { id: string } => Boolean(profile.id))
        .map(profile => ({
          id: profile.id,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },
    enabled: stableClusterIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
