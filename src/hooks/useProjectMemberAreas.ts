import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAreas {
  ids: string[];
  names: string[];
}

/**
 * For each org_project, computes the set of estrutura_areas covered by its members
 * (via estrutura_equipe_membros and estrutura_equipes.gestor_id). Returns a map
 * project_id → { ids, names } sorted alphabetically by name.
 */
export const useProjectMemberAreas = () => {
  return useQuery({
    queryKey: ['org-project-member-areas'],
    queryFn: async () => {
      const [
        { data: projectMembers, error: pmErr },
        { data: equipeMembros, error: emErr },
        { data: equipes, error: eErr },
        { data: areas, error: aErr },
      ] = await Promise.all([
        supabase.from('org_project_members').select('project_id, user_id'),
        supabase.from('estrutura_equipe_membros').select('user_id, equipe_id'),
        supabase.from('estrutura_equipes').select('id, area_id, gestor_id'),
        supabase.from('estrutura_areas').select('id, name').eq('is_active', true),
      ]);
      if (pmErr) throw pmErr;
      if (emErr) throw emErr;
      if (eErr) throw eErr;
      if (aErr) throw aErr;

      const equipeArea = new Map((equipes || []).map(e => [e.id, e.area_id]));
      const areaName = new Map((areas || []).map(a => [a.id, a.name]));

      const userAreas = new Map<string, Set<string>>();
      const addUserArea = (uid: string, aid: string | null | undefined) => {
        if (!aid) return;
        if (!userAreas.has(uid)) userAreas.set(uid, new Set());
        userAreas.get(uid)!.add(aid);
      };

      for (const m of equipeMembros || []) {
        addUserArea(m.user_id, equipeArea.get(m.equipe_id));
      }
      for (const e of equipes || []) {
        if (e.gestor_id) addUserArea(e.gestor_id, e.area_id);
      }

      const projectAreas = new Map<string, Set<string>>();
      for (const m of projectMembers || []) {
        const aids = userAreas.get(m.user_id);
        if (!aids) continue;
        if (!projectAreas.has(m.project_id)) projectAreas.set(m.project_id, new Set());
        const set = projectAreas.get(m.project_id)!;
        for (const aid of aids) set.add(aid);
      }

      const result: Record<string, ProjectAreas> = {};
      for (const [pid, aids] of projectAreas) {
        const items = [...aids]
          .map(aid => ({ id: aid, name: areaName.get(aid) || '' }))
          .filter(it => it.name)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        result[pid] = {
          ids: items.map(i => i.id),
          names: items.map(i => i.name),
        };
      }
      return result;
    },
  });
};
