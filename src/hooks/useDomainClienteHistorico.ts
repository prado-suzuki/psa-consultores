import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteHistoricoAuditLog {
  id: string;
  entity_type: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

export function useClienteHistorico(clienteId: string, allIds: string[]) {
  return useQuery<ClienteHistoricoAuditLog[]>({
    queryKey: ['client-history-logs', clienteId, allIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('area', 'dev')
        .in('entity_id', allIds)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as unknown as ClienteHistoricoAuditLog[];
    },
    enabled: allIds.length > 0,
  });
}
