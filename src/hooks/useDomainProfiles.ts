import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProfilesNomeSource = 'profiles' | 'profiles_safe';

export function useProfilesNomeMap(source: ProfilesNomeSource = 'profiles_safe') {
  return useQuery<Record<string, string>>({
    queryKey: ['profiles-nome-map', source],
    queryFn: async () => {
      const { data } =
        source === 'profiles'
          ? await supabase.from('profiles').select('id, first_name, last_name')
          : await supabase.from('profiles_safe').select('id, first_name, last_name');

      return (data ?? []).reduce<Record<string, string>>((nomeMap, profile) => {
        if (profile.id) {
          nomeMap[profile.id] = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
        }

        return nomeMap;
      }, {});
    },
  });
}
