import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EstruturaEquipe {
  id: string;
  name: string;
  area_id: string;
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
      const uid = targetUserId!;

      // 1. Os 3 caminhos de usuário → cluster, em paralelo:
      //    (1) membro de equipe  : estrutura_equipe_membros.user_id → equipe → área → cluster
      //    (2) gestor de equipe  : estrutura_equipes.gestor_id → área → cluster
      //    (3) gestor de área    : estrutura_areas.gestor_chamados_id → cluster
      // Sem isso, gestores (sem vínculo de membro) resolviam clusters: [] e caiam em
      // fail-open nos dashboards. Espelha o CTE `user_cluster_src` das views BQ.
      const [membrosRes, equipesGestorRes, areasGestorRes] = await Promise.all([
        supabase
          .from('estrutura_equipe_membros')
          .select('equipe_id')
          .eq('user_id', uid),
        supabase
          .from('estrutura_equipes')
          .select('id, name, area_id')
          .eq('gestor_id', uid),
        supabase
          .from('estrutura_areas')
          .select('id, name, color, cluster_id')
          .eq('gestor_chamados_id', uid),
      ]);
      if (membrosRes.error) throw membrosRes.error;
      if (equipesGestorRes.error) throw equipesGestorRes.error;
      if (areasGestorRes.error) throw areasGestorRes.error;

      const equipeIdsMembro = (membrosRes.data || [])
        .map((m) => m.equipe_id)
        .filter(Boolean);
      const equipesGestor = equipesGestorRes.data || [];
      const areasGestor = (areasGestorRes.data || []) as EstruturaArea[];

      // 2. Equipes do caminho 1 (membro). Caminho 2 já veio acima.
      let equipesMembro: EstruturaEquipe[] = [];
      if (equipeIdsMembro.length) {
        const { data, error } = await supabase
          .from('estrutura_equipes')
          .select('id, name, area_id')
          .in('id', equipeIdsMembro);
        if (error) throw error;
        equipesMembro = (data || []) as EstruturaEquipe[];
      }

      // Equipes = caminho 1 ∪ caminho 2 (dedup por id).
      const equipeMap = new Map<string, EstruturaEquipe>();
      for (const e of [...equipesMembro, ...equipesGestor] as EstruturaEquipe[]) {
        if (e?.id) equipeMap.set(e.id, e);
      }
      const equipes = [...equipeMap.values()];

      // 3. Áreas dos caminhos 1 e 2 (via area_id das equipes). Caminho 3 já veio.
      const areaIdsFromEquipes = [
        ...new Set(equipes.map((e) => e.area_id).filter(Boolean)),
      ];
      let areasFromEquipes: EstruturaArea[] = [];
      if (areaIdsFromEquipes.length) {
        const { data, error } = await supabase
          .from('estrutura_areas')
          .select('id, name, color, cluster_id')
          .in('id', areaIdsFromEquipes);
        if (error) throw error;
        areasFromEquipes = (data || []) as EstruturaArea[];
      }

      // Áreas = caminho 1 ∪ caminho 2 ∪ caminho 3 (dedup por id).
      const areaMap = new Map<string, EstruturaArea>();
      for (const a of [...areasFromEquipes, ...areasGestor]) {
        if (a?.id) areaMap.set(a.id, a);
      }
      const areas = [...areaMap.values()];

      // 4. Clusters = união dos cluster_id de todas as áreas (3 caminhos), dedup e
      // ordenados por id (determinístico — espelha ARRAY_AGG ... ORDER BY das views).
      const clusterIds = [
        ...new Set(areas.map((a) => a.cluster_id).filter(Boolean)),
      ];
      if (!clusterIds.length) {
        return { equipes, areas, clusters: [] };
      }

      const { data: clusters, error: cErr } = await supabase
        .from('estrutura_clusters')
        .select('id, name')
        .in('id', clusterIds)
        .eq('is_active', true);
      if (cErr) throw cErr;

      const resolvedClusters = ((clusters || []) as EstruturaCluster[])
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));

      return {
        equipes,
        areas,
        clusters: resolvedClusters,
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