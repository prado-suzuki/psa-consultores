import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Shared types ──────────────────────────────────────────────

export interface TicketProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export interface TicketListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to: string | null;
  activity_status: string | null;
  deadline: string | null;
  estrutura_area_id: string | null;
  cluster_id: string | null;
  profiles?: TicketProfile;
  agent?: TicketProfile;
  attachment_count?: number;
  assigned_agent?: { first_name: string; last_name: string } | null;
  cliente_nome?: string | null;
}

export interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to: string | null;
  activity_status: string | null;
  deadline: string | null;
  estrutura_area_id: string | null;
  cliente_id: string | null;
  profiles?: TicketProfile;
  areaName?: string | null;
}

export interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_id: string;
  author?: { first_name: string; last_name: string };
}

export interface TicketAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

// ── useMyTickets ──────────────────────────────────────────────
// Client-side ticket list (MeusChamados)

export function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'my', userId],
    queryFn: async (): Promise<TicketListItem[]> => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          assigned_agent:profiles_safe!assigned_to(first_name, last_name)
        `)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TicketListItem[];
    },
    enabled: !!userId,
  });
}

// ── useTicketsList ────────────────────────────────────────────
// Full ticket list with enrichment (GestaoChamados, EquipeChamados)

interface TicketsListOptions {
  assignedTo?: string;        // filter by assigned_to (EquipeChamados non-leader)
  filterAssigned?: boolean;   // if true, uses assignedTo filter
}

export function useTicketsList(options?: TicketsListOptions) {
  const assignedTo = options?.filterAssigned ? options?.assignedTo : undefined;

  return useQuery({
    queryKey: ['tickets', 'list', assignedTo ?? 'all'],
    queryFn: async (): Promise<TicketListItem[]> => {
      let query = supabase
        .from('tickets')
        .select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status, deadline, estrutura_area_id, cluster_id')
        .order('created_at', { ascending: false });

      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }

      const { data: ticketsData, error } = await query;
      if (error) throw error;
      if (!ticketsData || ticketsData.length === 0) return [];

      // Enrich with profiles
      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const agentIds = [...new Set(ticketsData.filter(t => t.assigned_to).map(t => t.assigned_to as string))];
      const { data: agentsData } = agentIds.length > 0
        ? await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', agentIds)
        : { data: [] as TicketProfile[] };

      const profilesMap = new Map<string, TicketProfile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));

      const agentsMap = new Map<string, TicketProfile>();
      agentsData?.forEach(a => agentsMap.set(a.id, a));

      // Attachment counts
      const ticketIds = ticketsData.map(t => t.id);
      const { data: attachmentCounts } = await supabase
        .from('ticket_attachments')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      const attachmentCountMap = new Map<string, number>();
      attachmentCounts?.forEach(a => {
        attachmentCountMap.set(a.ticket_id, (attachmentCountMap.get(a.ticket_id) || 0) + 1);
      });

      return ticketsData.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status || 'aberto',
        priority: ticket.priority || 'normal',
        department: ticket.department || '',
        user_id: ticket.user_id,
        created_at: ticket.created_at || '',
        updated_at: ticket.updated_at || '',
        assigned_to: ticket.assigned_to || null,
        activity_status: ticket.activity_status || 'aguardando_resposta',
        deadline: (ticket as any).deadline ?? null,
        estrutura_area_id: (ticket as any).estrutura_area_id ?? null,
        cluster_id: (ticket as any).cluster_id ?? null,
        profiles: profilesMap.get(ticket.user_id),
        agent: ticket.assigned_to ? agentsMap.get(ticket.assigned_to) : undefined,
        attachment_count: attachmentCountMap.get(ticket.id) || 0,
      }));
    },
  });
}

// ── useTicketDetail ───────────────────────────────────────────
// Single ticket with profile + area name

interface TicketDetailOptions {
  /** If true, also checks user_id matches (client view) */
  ownerOnly?: string;
}

export function useTicketDetail(ticketId: string | undefined, options?: TicketDetailOptions) {
  return useQuery({
    queryKey: ['tickets', 'detail', ticketId],
    queryFn: async (): Promise<TicketDetail | null> => {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId!);

      if (options?.ownerOnly) {
        query = query.eq('user_id', options.ownerOnly);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Fetch creator profile
      const { data: profileData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .eq('id', data.user_id)
        .maybeSingle();

      // Fetch area name
      let areaName: string | null = null;
      const areaId = (data as any).estrutura_area_id;
      if (areaId) {
        const { data: areaData } = await supabase
          .from('estrutura_areas')
          .select('name')
          .eq('id', areaId)
          .maybeSingle();
        if (areaData) areaName = areaData.name;
      }

      return {
        ...data,
        deadline: (data as any).deadline ?? null,
        estrutura_area_id: (data as any).estrutura_area_id ?? null,
        cliente_id: (data as any).cliente_id ?? null,
        profiles: profileData || undefined,
        areaName,
      } as TicketDetail;
    },
    enabled: !!ticketId,
  });
}

// ── useTicketMessages ─────────────────────────────────────────

export function useTicketMessages(ticketId: string | undefined, enrichAdminProfiles = false) {
  return useQuery({
    queryKey: ['tickets', 'messages', ticketId, enrichAdminProfiles],
    queryFn: async (): Promise<TicketMessage[]> => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      if (!enrichAdminProfiles) return data as TicketMessage[];

      // Enrich admin messages with profile names
      const adminUserIds = [...new Set(data.filter(m => m.is_admin).map(m => m.user_id))];
      let profilesMap: Record<string, { first_name: string; last_name: string }> = {};

      if (adminUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .in('id', adminUserIds);

        profilesData?.forEach(p => {
          profilesMap[p.id] = { first_name: p.first_name || '', last_name: p.last_name || '' };
        });
      }

      return data.map(msg => ({
        ...msg,
        author: msg.is_admin ? profilesMap[msg.user_id] : undefined,
      })) as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}

// ── useTicketAttachments ──────────────────────────────────────

export function useTicketAttachments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'attachments', ticketId],
    queryFn: async (): Promise<TicketAttachment[]> => {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TicketAttachment[];
    },
    enabled: !!ticketId,
  });
}

// ── useTicketAgents ───────────────────────────────────────────
// Internal users (team_member + admin) for assignment selectors

export function useTicketAgents() {
  return useQuery({
    queryKey: ['tickets', 'agents'],
    queryFn: async (): Promise<TicketProfile[]> => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'team_member']);

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', userIds);

      return (profiles || []) as TicketProfile[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
