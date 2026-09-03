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
 *
 * Uma LISTA de categorias significa "qualquer uma delas" (`overlaps`) — é como o
 * consolidado do Board pega as equipes do Tax e da OSG juntas. Categoria única
 * segue com o `contains` de sempre.
 */
/**
 * Mapa pessoa -> equipe ATIVA a que ela pertence.
 *
 * Serve para atribuir um chamado a uma equipe, coisa que `tickets` não sabe
 * fazer sozinho: não existe `equipe_id` na tabela, então a equipe é a de quem
 * atendeu. Há gente em mais de uma equipe no cadastro, e nesse caso vale a
 * primeira encontrada — as pessoas que hoje respondem chamados estão todas em
 * uma equipe ativa só, então o desempate não decide nada por enquanto; se
 * passar a decidir, o certo é o chamado ganhar equipe própria, não este mapa
 * ficar mais esperto.
 */
export const useEquipePorPessoa = () => {
  return useQuery({
    queryKey: ['estrutura-equipes', 'por-pessoa'],
    queryFn: async () => {
      const [{ data: equipes, error: eErr }, { data: membros, error: mErr }] = await Promise.all([
        supabase.from('estrutura_equipes').select('id, name').eq('is_active', true),
        supabase.from('estrutura_equipe_membros').select('user_id, equipe_id'),
      ]);
      if (eErr) throw eErr;
      if (mErr) throw mErr;

      const nomePorEquipe = new Map((equipes || []).map((e) => [e.id, e.name]));
      const porPessoa = new Map<string, string>();
      (membros || []).forEach((membro) => {
        if (!membro.user_id || porPessoa.has(membro.user_id)) return;
        const nome = nomePorEquipe.get(membro.equipe_id);
        if (nome) porPessoa.set(membro.user_id, nome);
      });
      return porPessoa;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useEstruturaEquipesByCategory = (category: string | string[]) => {
  // Ordenado para ['tax','osg'] e ['osg','tax'] caírem na mesma entrada de cache.
  const categorias = Array.isArray(category) ? [...category].sort() : category;

  return useQuery({
    queryKey: ['estrutura-equipes-by-category', categorias],
    queryFn: async () => {
      const baseAreas = supabase
        .from('estrutura_areas')
        .select('id, name, cluster_id, cluster:estrutura_clusters!estrutura_areas_cluster_id_fkey(id, name)')
        .eq('is_active', true);

      const { data: areas, error: aErr } = await (Array.isArray(categorias)
        ? baseAreas.overlaps('page_categories', categorias)
        : baseAreas.contains('page_categories', [categorias]));
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
