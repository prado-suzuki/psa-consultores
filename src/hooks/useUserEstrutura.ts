import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EstruturaEquipe {
  id: string;
  name: string;
  area_id: string;
  sublider_id: string | null;
}

interface EstruturaArea {
  id: string;
  name: string;
  color: string | null;
  cluster_id: string;
}

interface EstruturaCluster {
  id: string;
  name: string;
  cost_center: string | null;
}

interface UserEstrutura {
  equipes: EstruturaEquipe[];
  areas: EstruturaArea[];
  clusters: EstruturaCluster[];
  isLoading: boolean;
}

export function useUserEstrutura(userId?: string): UserEstrutura {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['user-estrutura', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      // 1. Get user's team memberships
      const { data: memberships, error: mErr } = await supabase
        .from('estrutura_equipe_membros')
        .select('equipe_id')
        .eq('user_id', targetUserId!);
      if (mErr) throw mErr;
      if (!memberships?.length) return { equipes: [], areas: [], clusters: [] };

      const equipeIds = memberships.map(m => m.equipe_id);

      // 2. Get teams
      const { data: equipes, error: eErr } = await supabase
        .from('estrutura_equipes')
        .select('id, name, area_id, sublider_id')
        .in('id', equipeIds);
      if (eErr) throw eErr;

      const areaIds = [...new Set((equipes || []).map(e => e.area_id))];
      if (!areaIds.length) return { equipes: equipes || [], areas: [], clusters: [] };

      // 3. Get areas
      const { data: areas, error: aErr } = await supabase
        .from('estrutura_areas')
        .select('id, name, color, cluster_id')
        .in('id', areaIds);
      if (aErr) throw aErr;

      const clusterIds = [...new Set((areas || []).map(a => a.cluster_id))];
      if (!clusterIds.length) return { equipes: equipes || [], areas: areas || [], clusters: [] };

      // 4. Get clusters
      const { data: clusters, error: cErr } = await supabase
        .from('estrutura_clusters')
        .select('id, name, cost_center')
        .in('id', clusterIds);
      if (cErr) throw cErr;

      return {
        equipes: equipes || [],
        areas: areas || [],
        clusters: clusters || [],
      };
    },
  });

  return {
    equipes: data?.equipes || [],
    areas: data?.areas || [],
    clusters: data?.clusters || [],
    isLoading,
  };
}
