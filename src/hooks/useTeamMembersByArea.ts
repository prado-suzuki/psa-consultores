import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AreaEquipeGroup {
  equipe_id: string;
  equipe_name: string;
  members: Array<{ id: string; first_name: string; last_name: string }>;
}

export interface AreaGroup {
  area_id: string;
  area_name: string;
  cluster_name: string;
  members: Array<{ id: string; first_name: string; last_name: string }>;
  equipes: AreaEquipeGroup[];
}

export interface TeamMembersByAreaResult {
  groups: AreaGroup[];
  currentUserAreaIds: string[];
}

/**
 * Returns all internal users (team_member or above) grouped by área.
 * A user appears in every área whose equipes they belong to (or manage).
 * Each área also exposes its equipes with the members per equipe (so callers
 * can show a visual separation when multiple equipes exist).
 * Users without any equipe (e.g., admins) appear under an "Outros" group.
 * Also returns the current user's área IDs so callers can expand them by default.
 */
export const useTeamMembersByArea = () => {
  return useQuery<TeamMembersByAreaResult>({
    queryKey: ['team-members-by-area'],
    queryFn: async () => {
      const allowedRoles = ['team_member', 'sublider', 'lider', 'admin'] as const;

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      const [{ data: roles }, { data: profiles }, { data: clusters }, { data: areas }, { data: equipes }, { data: membros }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('role', allowedRoles),
        supabase.from('profiles_safe').select('id, first_name, last_name').order('first_name'),
        supabase.from('estrutura_clusters').select('id, name').eq('is_active', true).order('name'),
        supabase.from('estrutura_areas').select('id, name, cluster_id').eq('is_active', true),
        supabase.from('estrutura_equipes').select('id, name, area_id, gestor_id').eq('is_active', true),
        supabase.from('estrutura_equipe_membros').select('user_id, equipe_id'),
      ]);

      const allowedUserIds = new Set((roles || []).map((r) => r.user_id));
      const profileById = new Map((profiles || []).map((p) => [p.id, p]));

      const areaById = new Map((areas || []).map((a) => [a.id, a]));
      const clusterById = new Map((clusters || []).map((c) => [c.id, c.name]));
      const equipeById = new Map((equipes || []).map((e) => [e.id, e]));

      type Profile = { id: string; first_name: string; last_name: string };

      const userAreaEquipes = new Map<string, Map<string, Set<string>>>();
      const addUserAreaEquipe = (userId: string, areaId: string, equipeId: string) => {
        if (!allowedUserIds.has(userId)) return;
        if (!userAreaEquipes.has(userId)) userAreaEquipes.set(userId, new Map());
        const areasOfUser = userAreaEquipes.get(userId)!;
        if (!areasOfUser.has(areaId)) areasOfUser.set(areaId, new Set());
        areasOfUser.get(areaId)!.add(equipeId);
      };

      for (const m of membros || []) {
        const equipe = equipeById.get(m.equipe_id);
        if (equipe?.area_id) addUserAreaEquipe(m.user_id, equipe.area_id, equipe.id);
      }
      for (const e of equipes || []) {
        if (!e.gestor_id || !e.area_id) continue;
        addUserAreaEquipe(e.gestor_id, e.area_id, e.id);
      }

      type AreaScratch = {
        area_id: string;
        area_name: string;
        cluster_name: string;
        membersById: Map<string, Profile>;
        equipesById: Map<string, { equipe_id: string; equipe_name: string; membersById: Map<string, Profile> }>;
      };

      const areaScratch = new Map<string, AreaScratch>();
      const ensureArea = (areaId: string, areaName: string, clusterName: string): AreaScratch => {
        if (!areaScratch.has(areaId)) {
          areaScratch.set(areaId, {
            area_id: areaId,
            area_name: areaName,
            cluster_name: clusterName,
            membersById: new Map(),
            equipesById: new Map(),
          });
        }
        return areaScratch.get(areaId)!;
      };
      const ensureEquipe = (a: AreaScratch, equipeId: string, equipeName: string) => {
        if (!a.equipesById.has(equipeId)) {
          a.equipesById.set(equipeId, { equipe_id: equipeId, equipe_name: equipeName, membersById: new Map() });
        }
        return a.equipesById.get(equipeId)!;
      };

      for (const userId of allowedUserIds) {
        const profile = profileById.get(userId);
        if (!profile) continue;
        const areasOfUser = userAreaEquipes.get(userId);
        if (!areasOfUser || areasOfUser.size === 0) {
          const outros = ensureArea('__none__', 'Outros', '');
          outros.membersById.set(userId, profile);
          continue;
        }
        for (const [areaId, equipeIds] of areasOfUser) {
          const area = areaById.get(areaId);
          if (!area) continue;
          const clusterName = clusterById.get(area.cluster_id) || '';
          const a = ensureArea(areaId, area.name || 'Área sem nome', clusterName);
          a.membersById.set(userId, profile);
          for (const equipeId of equipeIds) {
            const equipe = equipeById.get(equipeId);
            if (!equipe) continue;
            const eg = ensureEquipe(a, equipeId, equipe.name || 'Equipe');
            eg.membersById.set(userId, profile);
          }
        }
      }

      const byName = (a: Profile, b: Profile) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'pt-BR');

      const groups: AreaGroup[] = Array.from(areaScratch.values()).map((a) => ({
        area_id: a.area_id,
        area_name: a.area_name,
        cluster_name: a.cluster_name,
        members: Array.from(a.membersById.values()).sort(byName),
        equipes: Array.from(a.equipesById.values())
          .map((e) => ({
            equipe_id: e.equipe_id,
            equipe_name: e.equipe_name,
            members: Array.from(e.membersById.values()).sort(byName),
          }))
          .sort((x, y) => x.equipe_name.localeCompare(y.equipe_name, 'pt-BR')),
      }));

      groups.sort((a, b) => {
        if (a.area_id === '__none__') return 1;
        if (b.area_id === '__none__') return -1;
        const c = a.cluster_name.localeCompare(b.cluster_name, 'pt-BR');
        if (c !== 0) return c;
        return a.area_name.localeCompare(b.area_name, 'pt-BR');
      });

      const currentUserAreaIds = currentUserId
        ? Array.from(userAreaEquipes.get(currentUserId)?.keys() || [])
        : [];

      return { groups, currentUserAreaIds };
    },
  });
};
