import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';

// ── useUpdateTicketRouting ────────────────────────────────────
// Updates cliente_id / cluster_id / estrutura_area_id with cascade validation.

interface UpdateTicketRoutingParams {
  ticketId: string;
  cliente_id?: string | null;
  cluster_id?: string | null;
  estrutura_area_id?: string | null;
}

export function useUpdateTicketRouting() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (params: UpdateTicketRoutingParams) => {
      const { data: current, error: readError } = await supabase
        .from('tickets')
        .select('cliente_id, cluster_id, estrutura_area_id')
        .eq('id', params.ticketId)
        .maybeSingle();

      if (readError) throw readError;
      if (!current) throw new Error('Chamado não encontrado');

      const next = {
        cliente_id: params.cliente_id !== undefined ? params.cliente_id : (current as any).cliente_id,
        cluster_id: params.cluster_id !== undefined ? params.cluster_id : (current as any).cluster_id,
        estrutura_area_id:
          params.estrutura_area_id !== undefined ? params.estrutura_area_id : (current as any).estrutura_area_id,
      };

      // Cascade: cluster must belong to chosen client
      if (next.cluster_id && next.cliente_id) {
        const { data: link } = await supabase
          .from('cliente_clusters')
          .select('cluster_id')
          .eq('cliente_id', next.cliente_id)
          .eq('cluster_id', next.cluster_id)
          .maybeSingle();
        if (!link) {
          next.cluster_id = null;
          next.estrutura_area_id = null;
        }
      } else if (!next.cliente_id) {
        next.cluster_id = null;
        next.estrutura_area_id = null;
      }

      // Cascade: area must belong to chosen cluster
      if (next.estrutura_area_id && next.cluster_id) {
        const { data: area } = await supabase
          .from('estrutura_areas')
          .select('id')
          .eq('id', next.estrutura_area_id)
          .eq('cluster_id', next.cluster_id)
          .maybeSingle();
        if (!area) next.estrutura_area_id = null;
      } else if (!next.cluster_id) {
        next.estrutura_area_id = null;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          cliente_id: next.cliente_id,
          cluster_id: next.cluster_id,
          estrutura_area_id: next.estrutura_area_id,
        })
        .eq('id', params.ticketId);

      if (error) throw error;

      const diff = computeFieldDiff(
        current as any,
        next as any,
        ['cliente_id', 'cluster_id', 'estrutura_area_id'],
      );

      return { ticketId: params.ticketId, before: current, after: next, diff };
    },
    onSuccess: (result) => {
      if (Object.keys(result.diff).length > 0) {
        logAction({
          area: 'cadastros',
          entity_type: 'cliente',
          entity_id: result.ticketId,
          entity_name: 'Chamado',
          action: 'updated',
          changed_fields: result.diff,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
    },
  });
}

// ── Shared invalidation helper ───────────────────────────────

function useTicketInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
  };
}

// ── useAssignTicket ───────────────────────────────────────────

export function useAssignTicket() {
  const invalidate = useTicketInvalidation();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, agentId, agentName }: {
      ticketId: string;
      agentId: string | null;
      agentName?: string | null;
    }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: agentId })
        .eq('id', ticketId);

      if (error) throw error;

      // Notify (fire-and-forget)
      if (agentId) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_assigned',
            ticket_id: ticketId,
            actor_name: agentName || 'Gestão PSA',
            assigned_to_name: agentName,
          }
        }).catch(console.error);
      }

      return { ticketId, agentId };
    },
    onSuccess: (_, vars) => {
      logAction({
        area: 'cadastros',
        entity_type: 'cliente',
        entity_id: vars.ticketId,
        entity_name: 'Chamado',
        action: 'updated',
        changed_fields: { assigned_to: { old: null, new: vars.agentId } },
        details: `Agente atribuído: ${vars.agentName || 'removido'}`,
      });
      invalidate();
    },
  });
}

// ── useUpdateTicketStatus ─────────────────────────────────────

export function useUpdateTicketStatus() {
  const invalidate = useTicketInvalidation();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, newStatus, actorName }: {
      ticketId: string;
      newStatus: string;
      actorName?: string;
    }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      if (newStatus === 'resolvido') {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_resolved',
            ticket_id: ticketId,
            actor_name: actorName || 'Equipe PSA',
          }
        }).catch(console.error);
      }

      return { ticketId, newStatus };
    },
    onSuccess: (_, vars) => {
      logAction({
        area: 'cadastros',
        entity_type: 'cliente',
        entity_id: vars.ticketId,
        entity_name: 'Chamado',
        action: 'updated',
        changed_fields: { status: { old: null, new: vars.newStatus } },
      });
      invalidate();
    },
  });
}

// ── useUpdateTicketDeadline ───────────────────────────────────

export function useUpdateTicketDeadline() {
  const invalidate = useTicketInvalidation();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, deadline }: {
      ticketId: string;
      deadline: string | null;
    }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ deadline } as any)
        .eq('id', ticketId);

      if (error) throw error;
      return { ticketId, deadline };
    },
    onSuccess: (_, vars) => {
      logAction({
        area: 'cadastros',
        entity_type: 'cliente',
        entity_id: vars.ticketId,
        entity_name: 'Chamado',
        action: 'updated',
        changed_fields: { deadline: { old: null, new: vars.deadline } },
      });
      invalidate();
    },
  });
}

// ── useSendTicketMessage ──────────────────────────────────────

export function useSendTicketMessage() {
  const invalidate = useTicketInvalidation();

  return useMutation({
    mutationFn: async ({ ticketId, userId, message, isAdmin, actorName }: {
      ticketId: string;
      userId: string;
      message: string;
      isAdmin: boolean;
      actorName?: string;
    }) => {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        user_id: userId,
        message: message.trim(),
        is_admin: isAdmin,
      });

      if (error) throw error;

      // Update activity status: admin replies = respondido, client replies = aguardando_resposta
      const newActivityStatus = isAdmin ? 'respondido' : 'aguardando_resposta';
      const updatePayload: any = { activity_status: newActivityStatus };
      if (!isAdmin) {
        updatePayload.updated_at = new Date().toISOString();
      }

      await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticketId);

      // Notify (fire-and-forget)
      supabase.functions.invoke('notify-ticket', {
        body: {
          event_type: 'ticket_replied',
          ticket_id: ticketId,
          actor_name: actorName || (isAdmin ? 'Equipe PSA' : 'Cliente'),
          message_preview: message.trim().substring(0, 200),
        }
      }).catch(console.error);

      return { ticketId };
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

// ── useUploadTicketAttachments ────────────────────────────────

export function useUploadTicketAttachments() {
  const invalidate = useTicketInvalidation();

  return useMutation({
    mutationFn: async ({ ticketId, files, userId, actorName }: {
      ticketId: string;
      files: File[];
      userId: string;
      actorName?: string;
    }) => {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('ticket_attachments')
          .insert({
            ticket_id: ticketId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: userId,
          });

        if (dbError) throw dbError;
      }

      // Notify (fire-and-forget)
      supabase.functions.invoke('notify-ticket', {
        body: {
          event_type: 'ticket_replied',
          ticket_id: ticketId,
          actor_name: actorName || 'Usuário',
          message_preview: `${files.length} arquivo(s) anexado(s)`,
        }
      }).catch(console.error);

      return { ticketId, count: files.length };
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

// ── useDeleteTickets ──────────────────────────────────────────

export function useDeleteTickets() {
  const invalidate = useTicketInvalidation();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketIds }: { ticketIds: string[] }) => {
      // 1. Delete storage files
      for (const ticketId of ticketIds) {
        const { data: attachments } = await supabase
          .from('ticket_attachments')
          .select('file_path')
          .eq('ticket_id', ticketId);

        if (attachments && attachments.length > 0) {
          const filePaths = attachments.map(a => a.file_path);
          await supabase.storage.from('ticket-attachments').remove(filePaths);
        }
      }

      // 2. Delete attachment records
      await supabase
        .from('ticket_attachments')
        .delete()
        .in('ticket_id', ticketIds);

      // 3. Delete messages
      await supabase
        .from('ticket_messages')
        .delete()
        .in('ticket_id', ticketIds);

      // 4. Delete tickets
      const { error } = await supabase
        .from('tickets')
        .delete()
        .in('id', ticketIds);

      if (error) throw error;

      return { count: ticketIds.length };
    },
    onSuccess: (result, vars) => {
      for (const ticketId of vars.ticketIds) {
        logAction({
          area: 'cadastros',
          entity_type: 'cliente',
          entity_id: ticketId,
          entity_name: 'Chamado',
          action: 'deleted',
        });
      }
      invalidate();
    },
  });
}
