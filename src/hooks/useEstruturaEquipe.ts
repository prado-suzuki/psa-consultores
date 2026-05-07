import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches gestor and members for a given estrutura_equipe.
 * Returns deduplicated user IDs for each role.
 */
export const useEstruturaEquipe = (equipeId: string | null | undefined) => {
  const enabled = !!equipeId;

  const { data: equipeInfo, isLoading: loadingEquipe } = useQuery({
    queryKey: ['estrutura-equipe-info', equipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_equipes')
        .select('id, name, area_id, gestor_id, area:estrutura_areas!estrutura_equipes_area_id_fkey(id, name, cluster_id)')
        .eq('id', equipeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled,
  });

  const { data: memberIds = [], isLoading: loadingMembros } = useQuery({
    queryKey: ['estrutura-equipe-membros', equipeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_equipe_membros')
        .select('user_id')
        .eq('equipe_id', equipeId!);
      if (error) throw error;
      return [...new Set((data || []).map(m => m.user_id))];
    },
    enabled,
  });

  const liderIds = equipeInfo?.gestor_id ? [equipeInfo.gestor_id] : [];
  const allMemberIds = enabled ? [...new Set([...liderIds, ...memberIds])] : [];

  return {
    equipeInfo,
    liderIds,
    memberIds,
    allMemberIds,
    isLoading: loadingEquipe || loadingMembros,
  };
};
