import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE_TIME = 5 * 60 * 1000;

/**
 * Quantas PESSOAS estão nas equipes de cada cluster da estrutura.
 *
 * Serve o card de saúde da OSG no Estratégico: "ticket médio × time" só é
 * pergunta de diretoria se o tamanho do time vier do cadastro, e não de um
 * número dito em reunião. Conta `user_id` DISTINTO — a mesma pessoa em duas
 * equipes da área é uma cabeça, não duas.
 *
 * Senioridade não sai daqui de propósito: não existe vínculo pessoa ↔ cargo
 * (`job_roles` tem salário de referência, ninguém está ligado a ele). Quem
 * consome mostra "—" com o motivo em vez de estimar.
 */
export function useDomainHeadcountCluster() {
  return useQuery<Map<string, number>>({
    queryKey: ['board-headcount-por-cluster'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const [areasRes, equipesRes, membrosRes] = await Promise.all([
        supabase.from('estrutura_areas').select('id, cluster_id'),
        supabase.from('estrutura_equipes').select('id, area_id'),
        supabase.from('estrutura_equipe_membros').select('equipe_id, user_id'),
      ]);
      if (areasRes.error) throw areasRes.error;
      if (equipesRes.error) throw equipesRes.error;
      if (membrosRes.error) throw membrosRes.error;

      const clusterDaArea = new Map((areasRes.data ?? []).map((a) => [a.id, a.cluster_id]));
      const clusterDaEquipe = new Map<string, string>();
      for (const e of equipesRes.data ?? []) {
        const cl = e.area_id ? clusterDaArea.get(e.area_id) : null;
        if (cl) clusterDaEquipe.set(e.id, cl);
      }

      const porCluster = new Map<string, Set<string>>();
      for (const m of membrosRes.data ?? []) {
        const cl = clusterDaEquipe.get(m.equipe_id);
        if (!cl || !m.user_id) continue;
        const set = porCluster.get(cl) ?? new Set<string>();
        set.add(m.user_id);
        porCluster.set(cl, set);
      }
      return new Map([...porCluster].map(([cl, set]) => [cl, set.size]));
    },
  });
}
