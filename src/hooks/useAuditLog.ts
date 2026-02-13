import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

interface AuditLogEntry {
  area: 'tax' | 'osg';
  entity_type: 'project' | 'task' | 'subtask';
  entity_id: string;
  entity_name: string;
  action: 'created' | 'updated' | 'deleted';
  changed_fields?: Record<string, { old: unknown; new: unknown }>;
  details?: string;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = useCallback(async (entry: AuditLogEntry) => {
    if (!user?.id) return;
    try {
      await supabase.from('audit_logs' as any).insert({
        area: entry.area,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_name: entry.entity_name,
        action: entry.action,
        changed_fields: entry.changed_fields ?? null,
        performed_by: user.id,
        details: entry.details ?? null,
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }, [user?.id]);

  return { logAction };
};
