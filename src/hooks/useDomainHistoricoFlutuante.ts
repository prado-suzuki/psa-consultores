import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricoFlutuanteAuditLog {
  id: string;
  entity_type: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

export function useHistoricoFlutuanteLogs(entityIds: string[]) {
  const ids = [...entityIds].filter(Boolean).sort();

  return useQuery<HistoricoFlutuanteAuditLog[]>({
    queryKey: ['historico-cadastro', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(
          'id, entity_type, entity_name, action, changed_fields, performed_by, performed_at, details',
        )
        .eq('area', 'osg')
        .in('entity_id', ids)
        .order('performed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as HistoricoFlutuanteAuditLog[];
    },
  });
}
