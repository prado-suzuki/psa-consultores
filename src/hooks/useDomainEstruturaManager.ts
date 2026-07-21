import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export type MinimumProfileRole = 'team_member' | 'sublider' | 'lider' | 'admin';

// Hierarquia oficial: team_member < sublider < lider < admin.
export function useProfilesMinRole(minimumRole: MinimumProfileRole) {
  return useQuery({
    queryKey: ['profiles-min-role', minimumRole],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profiles_with_min_role', {
        _minimum_role: minimumRole,
      });

      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
}
