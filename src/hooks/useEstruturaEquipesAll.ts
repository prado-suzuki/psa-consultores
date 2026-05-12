import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EquipeOption {
  id: string;
  name: string;
  area_id: string | null;
  area_name: string;
  gestor_id: string | null;
}

export interface AreaOption {
  id: string;
  name: string;
}

/**
 * Lista todas as equipes ativas com sua área para alimentar selects agrupados,
 * e expõe também a lista de áreas distintas em ordem alfabética.
 * Fonte única usada em /equipe/projetos e filtros relacionados.
 */
export const useEstruturaEquipesAll = () => {
  return useQuery({
    queryKey: ['estrutura-equipes-all'],
    queryFn: async () => {
      const { data: equipes, error } = await supabase
        .from('estrutura_equipes')
        .select('id, name, area_id, gestor_id, area:estrutura_areas!estrutura_equipes_area_id_fkey(id, name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;

      type Row = {
        id: string;
        name: string;
        area_id: string | null;
        gestor_id: string | null;
        area: { id: string; name: string } | null;
      };

      const list: EquipeOption[] = ((equipes as unknown as Row[]) ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        area_id: e.area_id,
        area_name: e.area?.name ?? 'Sem área',
        gestor_id: e.gestor_id,
      }));

      const areaMap = new Map<string, AreaOption>();
      for (const e of list) {
        if (e.area_id && !areaMap.has(e.area_id)) {
          areaMap.set(e.area_id, { id: e.area_id, name: e.area_name });
        }
      }
      const areas = Array.from(areaMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      // Group equipes by area for select grouping
      const grouped = areas.map((a) => ({
        area: a,
        equipes: list.filter((e) => e.area_id === a.id),
      }));

      return { equipes: list, areas, grouped };
    },
  });
};
