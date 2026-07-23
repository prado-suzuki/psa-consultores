import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';

export interface AuditLog {
  id: string;
  area: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

function buildMap(data: { id: string; label: string }[] | null) {
  const map: Record<string, string> = {};
  data?.forEach((item) => {
    map[item.id] = item.label;
  });
  return map;
}

export function useDomainAuditLookupMaps() {
  const { data: profiles = {} } = useProfilesNomeMap('profiles');

  const { data: projects = {} } = useQuery({
    queryKey: ['audit-lookup-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('org_projects').select('id, name');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.name })) ?? null);
    },
  });

  const { data: areas = {} } = useQuery({
    queryKey: ['audit-lookup-areas'],
    queryFn: async () => {
      const { data } = await supabase.from('estrutura_areas').select('id, name');
      const map: Record<string, string> = {};
      (data || []).forEach((item) => {
        map[item.id] = item.name;
      });
      return map;
    },
  });

  const { data: clients = {} } = useQuery({
    queryKey: ['audit-lookup-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);
      return buildMap(data?.map((item) => ({ id: item.id, label: item.nome })) ?? null);
    },
  });

  const { data: contribuintes = {} } = useQuery({
    queryKey: ['audit-lookup-contribuintes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);
      return buildMap(
        data?.map((item) => ({ id: item.id, label: item.nome_razao_social })) ?? null,
      );
    },
  });

  const { data: servicos = {} } = useQuery({
    queryKey: ['audit-lookup-servicos'],
    queryFn: async () => {
      const { data } = await supabase.from('servicos_prestados').select('id, nome');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.nome })) ?? null);
    },
  });

  const { data: tasks = {} } = useQuery({
    queryKey: ['audit-lookup-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('org_tasks').select('id, title');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.title })) ?? null);
    },
  });

  return { profiles, projects, areas, clients, contribuintes, servicos, tasks };
}

export function useDomainAuditLogs(
  area: 'tax' | 'osg',
  entityFilter: string,
  actionFilter: string,
) {
  return useQuery({
    queryKey: ['audit-logs', area, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('area', area)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AuditLog[];
    },
  });
}
