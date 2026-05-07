import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EstruturaEquipeOption {
  id: string;
  name: string;
  area_id: string;
  area_name: string;
  cluster_id: string;
  cluster_name: string;
  gestor_id: string | null;
}

/**
 * Lists active equipes whose area belongs to a given page_category (e.g., 'tax').
 * Includes joined area + cluster names for display/grouping.
 */
export const useEstruturaEquipesByCategory = (category: string) => {
  return useQuery({
    queryKey: ['estrutura-equipes-by-category', category],
    queryFn: async () => {
      const { data: areas, error: aErr } = await supabase
        .from('estrutura_areas')
        .select('id, name, cluster_id, cluster:estrutura_clusters!estrutura_areas_cluster_id_fkey(id, name)')
        .eq('is_active', true)
        .contains('page_categories', [category]);
      if (aErr) throw aErr;
      if (!areas?.length) return [];

      type AreaRow = { id: string; name: string; cluster_id: string; cluster: { id: string; name: string } | null };
      const areaMap = new Map(
        (areas as unknown as AreaRow[]).map((a) => [
          a.id,
          { name: a.name, cluster_id: a.cluster_id, cluster_name: a.cluster?.name || '' },
        ]),
      );

      const { data: equipes, error: eErr } = await supabase
        .from('estrutura_equipes')
        .select('id, name, area_id, gestor_id')
        .eq('is_active', true)
        .in('area_id', areas.map((a) => a.id))
        .order('name');
      if (eErr) throw eErr;

      return (equipes || []).map((e) => {
        const a = areaMap.get(e.area_id);
        return {
          id: e.id,
          name: e.name,
          area_id: e.area_id,
          area_name: a?.name || '',
          cluster_id: a?.cluster_id || '',
          cluster_name: a?.cluster_name || '',
          gestor_id: e.gestor_id,
        } as EstruturaEquipeOption;
      });
    },
  });
};
