import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useAuditLog } from '@/hooks/useAuditLog';

// ── useTicketEmpresas ─────────────────────────────────────────
// Active clients for the CreateTicketDialog empresa selector

export interface TicketEmpresa {
  id: string;
  nome: string;
}

export function useTicketEmpresas() {
  return useQuery({
    queryKey: ['tickets', 'empresas'],
    queryFn: async (): Promise<TicketEmpresa[]> => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      return (data || []) as TicketEmpresa[];
    },
  });
}

// ── useTicketAreasForCliente ──────────────────────────────────
// Clusters → areas for a specific client

export interface TicketArea {
  id: string;
  name: string;
  cluster_id: string;
}

export function useTicketAreasForCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['tickets', 'areas-for-cliente', clienteId],
    queryFn: async (): Promise<TicketArea[]> => {
      // 1. Get clusters for this client
      const { data: clusterLinks } = await supabase
        .from('cliente_clusters')
        .select('cluster_id')
        .eq('cliente_id', clienteId!);

      const clusterIds = (clusterLinks || []).map(c => c.cluster_id);

      // 2. Fetch areas — filtered by clusters if any, otherwise all active
      let query = supabase
        .from('estrutura_areas')
        .select('id, name, cluster_id')
        .eq('is_active', true)
        .order('name');

      if (clusterIds.length > 0) {
        query = query.in('cluster_id', clusterIds);
      }

      const { data } = await query;
      return (data || []) as TicketArea[];
    },
    enabled: !!clienteId,
  });
}

// ── useTicketClientProfiles ───────────────────────────────────
// Client profiles with email for the CreateTicketDialog user selector

export interface TicketClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function useTicketClientProfiles() {
  return useQuery({
    queryKey: ['tickets', 'client-profiles'],
    queryFn: async (): Promise<TicketClientProfile[]> => {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      if (!rolesData || rolesData.length === 0) return [];

      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .rpc('get_profiles_with_email' as any)
        .in('id', userIds)
        .order('first_name');

      return (profilesData || []) as TicketClientProfile[];
    },
  });
}

// ── useCreateTicketCliente ────────────────────────────────────
// Client-initiated ticket creation (NovoChamado)

interface CreateTicketClienteParams {
  userId: string;
  title: string;
  department: string;
  description: string;
  priority: string;
  files: File[];
  actorName?: string;
}

export function useCreateTicketCliente() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (params: CreateTicketClienteParams) => {
      // Resolve cliente_id from representante
      let clienteId: string | null = null;
      const { data: repData } = await supabase
        .from('representante' as any)
        .select('id_cliente')
        .eq('user_id', params.userId)
        .maybeSingle();

      if (repData) {
        clienteId = (repData as any).id_cliente;
      }

      const insertPayload: any = {
        user_id: params.userId,
        title: params.title,
        department: params.department,
        description: params.description,
        priority: params.priority,
        status: 'aberto',
      };
      if (clienteId) {
        insertPayload.cliente_id = clienteId;
      }

      const { data: ticketData, error } = await supabase
        .from('tickets')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Upload files
      if (params.files.length > 0 && ticketData) {
        for (const file of params.files) {
          const filePath = `${ticketData.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file);

          if (!uploadError) {
            await supabase.from('ticket_attachments').insert({
              ticket_id: ticketData.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: params.userId,
            });
          }
        }
      }

      // Notify (fire-and-forget)
      if (ticketData) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_created',
            ticket_id: ticketData.id,
            actor_name: params.actorName || 'Cliente',
          }
        }).catch(console.error);
      }

      return ticketData;
    },
    onSuccess: (data) => {
      if (data) {
        logAction({
          area: 'cadastros',
          entity_type: 'cliente',
          entity_id: data.id,
          entity_name: data.title || 'Chamado',
          action: 'created',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
    },
  });
}

// ── useCreateTicketGestao ─────────────────────────────────────
// Management-initiated ticket creation (CreateTicketDialog)

interface CreateTicketGestaoParams {
  title: string;
  description: string;
  department: string | null;
  priority: string;
  user_id: string;
  cliente_id: string;
  estrutura_area_id: string;
  files: File[];
}

export function useCreateTicketGestao() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (params: CreateTicketGestaoParams) => {
      const insertPayload: any = {
        title: params.title,
        description: params.description,
        department: params.department || null,
        priority: params.priority,
        user_id: params.user_id,
        cliente_id: params.cliente_id,
        estrutura_area_id: params.estrutura_area_id,
        status: 'aberto',
        activity_status: 'aguardando_resposta',
      };

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // Upload files
      if (params.files.length > 0 && ticket) {
        for (const file of params.files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: params.user_id,
          });
        }
      }

      // Notify (fire-and-forget)
      if (ticket) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_created',
            ticket_id: ticket.id,
            actor_name: 'Gestão PSA',
          }
        }).catch(console.error);
      }

      return ticket;
    },
    onSuccess: (data) => {
      if (data) {
        logAction({
          area: 'cadastros',
          entity_type: 'cliente',
          entity_id: data.id,
          entity_name: data.title || 'Chamado',
          action: 'created',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
    },
  });
}
