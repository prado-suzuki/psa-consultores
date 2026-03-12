import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches leaders, subleaders, and members for a given estrutura area.
 * Returns deduplicated user IDs for each role + a combined allMemberIds set.
 */
export const useEstruturaArea = (estruturaAreaId: string | null | undefined) => {
  const enabled = !!estruturaAreaId;

  const { data: liderIds = [], isLoading: loadingLideres } = useQuery({
    queryKey: ['estrutura-area-lideres', estruturaAreaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_area_lideres')
        .select('user_id')
        .eq('area_id', estruturaAreaId!);
      if (error) throw error;
      return (data || []).map(d => d.user_id);
    },
    enabled,
  });

  const { data: subliderIds = [], isLoading: loadingSublideres } = useQuery({
    queryKey: ['estrutura-area-sublideres', estruturaAreaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_equipes')
        .select('sublider_id')
        .eq('area_id', estruturaAreaId!)
        .not('sublider_id', 'is', null);
      if (error) throw error;
      return [...new Set((data || []).map(d => d.sublider_id!))];
    },
    enabled,
  });

  const { data: memberIds = [], isLoading: loadingMembros } = useQuery({
    queryKey: ['estrutura-area-membros', estruturaAreaId],
    queryFn: async () => {
      // First get equipe ids for this area
      const { data: equipes, error: eErr } = await supabase
        .from('estrutura_equipes')
        .select('id')
        .eq('area_id', estruturaAreaId!)
        .eq('is_active', true);
      if (eErr) throw eErr;
      if (!equipes?.length) return [];

      const { data: members, error: mErr } = await supabase
        .from('estrutura_equipe_membros')
        .select('user_id')
        .in('equipe_id', equipes.map(e => e.id));
      if (mErr) throw mErr;
      return [...new Set((members || []).map(m => m.user_id))];
    },
    enabled,
  });

  // Combine all user IDs from the area (leaders + subleaders + members)
  const allMemberIds = enabled
    ? [...new Set([...liderIds, ...subliderIds, ...memberIds])]
    : [];

  return {
    liderIds,
    subliderIds,
    memberIds,
    allMemberIds,
    isLoading: loadingLideres || loadingSublideres || loadingMembros,
  };
};
