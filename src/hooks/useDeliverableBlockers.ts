// Bloqueios abertos por entregável, vindos das dailies (T3). Usado para o selo
// "🚩 Bloqueada" no Kanban/sprint. Resiliente à migração: usa select('*'), então
// antes de a coluna `blocked_deliverable_id` existir no banco, nenhuma linha traz
// o campo e o mapa sai vazio (nenhum selo) — sem quebrar a tela.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliverableBlocker {
  reason: string | null;
  owner: string | null;
  date: string;
}

export function useDeliverableBlockers() {
  return useQuery<Record<string, DeliverableBlocker>>({
    queryKey: ['deliverable-blockers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_standups')
        .select('*')
        .order('date', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const latestByDeliverable: Record<string, DeliverableBlocker> = {};
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const deliverableId = row.blocked_deliverable_id as string | null | undefined;
        if (!deliverableId) continue;
        // Ordenado por data desc: a primeira ocorrência de cada tarefa é o bloqueio mais recente.
        if (!latestByDeliverable[deliverableId]) {
          latestByDeliverable[deliverableId] = {
            reason: (row.blockers as string | null) ?? null,
            owner: (row.blocker_owner as string | null) ?? null,
            date: row.date as string,
          };
        }
      }
      return latestByDeliverable;
    },
    staleTime: 0,
    gcTime: 0,
  });
}

/** Texto do tooltip do selo de bloqueio. */
export function formatBlockerTooltip(blocker: DeliverableBlocker): string {
  const parts = ['🚩 Bloqueada'];
  if (blocker.reason) parts.push(blocker.reason);
  if (blocker.owner) parts.push(`destrava: ${blocker.owner}`);
  parts.push(new Date(`${blocker.date}T12:00:00`).toLocaleDateString('pt-BR'));
  return parts.join(' · ');
}
