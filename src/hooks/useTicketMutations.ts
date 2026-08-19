import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { computeFieldDiff } from '@/lib/diffUtils';
import { ticketRichTextToPlain } from '@/components/chamados/ticketRichTextFormat';
import {
  isDuplicateMessageError,
  type TicketMessageOutcome,
  type TicketMessageWarning,
} from '@/lib/ticketMessageOutcome';

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

      await assertCanPerform('tickets', 'update', params.ticketId);
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
  const queryClient = useQueryClient();
  const invalidate = useTicketInvalidation();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, agentId, agentName }: {
      ticketId: string;
      agentId: string | null;
      agentName?: string | null;
    }) => {
      await assertCanPerform('tickets', 'update', ticketId);
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
      // Delegar cria uma tarefa no banco (trigger trg_tickets_gera_tarefa,
      // EDU-11). Sem isto ela só aparece no painel depois de recarregar a
      // página. Fica AQUI, e não no `useTicketInvalidation` compartilhado: as
      // outras cinco mutations que usam o auxiliar não geram tarefa nenhuma, e
      // invalidar ali seria rebuscar a lista mais pesada do sistema de graça.
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
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
      await assertCanPerform('tickets', 'update', ticketId);
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
      await assertCanPerform('tickets', 'update', ticketId);
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
// Contrato: gravar a mensagem é a operação essencial. Atualizar o
// `activity_status` e notificar são efeitos colaterais — se falharem, viram
// `warnings` no resultado; NUNCA derrubam o envio.
//
// Por que isso importa: entre 08/07 e 06/08/2026 esta mutation chamava
// `assertCanPerform('tickets','update')` DEPOIS de gravar a mensagem. Para a
// role `client` o precheck lançava exceção (não conseguia ler a whitelist), a
// tela exibia "erro", o cliente reenviava e a mensagem duplicava — além de
// status e e-mail nunca rodarem. O precheck saiu daqui: verificar permissão
// depois de um write consumado só pode inventar erro. Em seu lugar, o próprio
// UPDATE presta contas via `.select('id')`.

interface SendTicketMessageParams {
  ticketId: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  actorName?: string;
}

export function useSendTicketMessage() {
  const invalidate = useTicketInvalidation();

  return useMutation<TicketMessageOutcome, Error, SendTicketMessageParams>({
    mutationFn: async ({ ticketId, userId, message, isAdmin, actorName }) => {
      const warnings: TicketMessageWarning[] = [];

      // 1. Operação essencial. INSERT barrado por RLS devolve erro de verdade
      //    (42501), então aqui `throw` é legítimo: nada foi gravado.
      const { error: insertError } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        user_id: userId,
        message: message.trim(),
        is_admin: isAdmin,
      });

      // Reenvio idêntico barrado pelo trigger do banco não é falha: a mensagem
      // já está no chamado. Segue o fluxo para não deixar o chamado inconsistente.
      const duplicate = insertError ? isDuplicateMessageError(insertError) : false;
      if (insertError && !duplicate) throw insertError;

      // 2. Efeito colateral — status do chamado.
      //    `.select('id')` é obrigatório: UPDATE barrado por RLS devolve sucesso
      //    com 0 linhas, sem erro. Sem isso a falha é silenciosa.
      const newActivityStatus = isAdmin ? 'respondido' : 'aguardando_resposta';
      const updatePayload: { activity_status: string; updated_at?: string } = {
        activity_status: newActivityStatus,
      };
      if (!isAdmin) {
        updatePayload.updated_at = new Date().toISOString();
      }

      const { data: atualizados, error: updateError } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticketId)
        .select('id');

      const activityStatusUpdated = !updateError && (atualizados?.length ?? 0) > 0;
      if (!activityStatusUpdated) {
        warnings.push('status_nao_atualizado');
        console.error('[useSendTicketMessage] activity_status não atualizado', {
          ticketId,
          motivo: updateError?.message ?? 'RLS barrou o UPDATE (0 linhas afetadas)',
        });
      }

      // 3. Efeito colateral — notificação. Aguardamos de propósito: afirmar
      //    "cliente notificado" sem conferir é exatamente a mentira que fez o
      //    incidente durar um mês. Duplicata não renotifica.
      let notified = false;
      if (!duplicate) {
        try {
          const { error: notifyError } = await supabase.functions.invoke('notify-ticket', {
            body: {
              event_type: 'ticket_replied',
              ticket_id: ticketId,
              actor_name: actorName || (isAdmin ? 'Equipe PSA' : 'Cliente'),
              message_preview: ticketRichTextToPlain(message).substring(0, 200),
            },
          });
          if (notifyError) throw notifyError;
          notified = true;
        } catch (notifyError) {
          warnings.push('notificacao_nao_enviada');
          console.error('[useSendTicketMessage] notify-ticket falhou', notifyError);
        }
      }

      return {
        ticketId,
        persisted: true,
        duplicate,
        activityStatusUpdated,
        notified,
        warnings,
      };
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

      // 2. Delete attachment records — precheck em uma linha amostrada, RLS de delete é admin-only e uniforme
      const { data: sampleAttachment } = await supabase
        .from('ticket_attachments')
        .select('id')
        .in('ticket_id', ticketIds)
        .limit(1)
        .maybeSingle();
      if (sampleAttachment?.id) {
        await assertCanPerform('ticket_attachments', 'delete', sampleAttachment.id);
      }
      await supabase
        .from('ticket_attachments')
        .delete()
        .in('ticket_id', ticketIds);

      // 3. Delete messages — precheck em uma linha amostrada (delete exige admin)
      const { data: sampleMessage } = await supabase
        .from('ticket_messages')
        .select('id')
        .in('ticket_id', ticketIds)
        .limit(1)
        .maybeSingle();
      if (sampleMessage?.id) {
        await assertCanPerform('ticket_messages', 'delete', sampleMessage.id);
      }
      await supabase
        .from('ticket_messages')
        .delete()
        .in('ticket_id', ticketIds);

      // 4. Delete tickets — precheck no primeiro id, RLS uniforme (admin only)
      await assertCanPerform('tickets', 'delete', ticketIds[0]);
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
