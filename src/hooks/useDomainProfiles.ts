import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProfilesNomeSource = 'profiles' | 'profiles_safe';

export interface ProfileNomeRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const getProfilesNomeQueryOptions = (source: ProfilesNomeSource) => ({
  queryKey: ['profiles-nome-map', source] as const,
  queryFn: async (): Promise<ProfileNomeRow[]> => {
    const { data } =
      source === 'profiles'
        ? await supabase.from('profiles').select('id, first_name, last_name')
        : await supabase.from('profiles_safe').select('id, first_name, last_name');

    return (data ?? []).flatMap((profile) =>
      profile.id
        ? [
            {
              id: profile.id,
              first_name: profile.first_name ?? null,
              last_name: profile.last_name ?? null,
            },
          ]
        : [],
    );
  },
});

export function useProfilesNomeRows(source: ProfilesNomeSource = 'profiles_safe') {
  return useQuery(getProfilesNomeQueryOptions(source));
}

export function useProfilesNomeMap(source: ProfilesNomeSource = 'profiles_safe') {
  return useQuery({
    ...getProfilesNomeQueryOptions(source),
    select: (profiles): Record<string, string> =>
      profiles.reduce<Record<string, string>>((nomeMap, profile) => {
        nomeMap[profile.id] = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();

        return nomeMap;
      }, {}),
  });
}
