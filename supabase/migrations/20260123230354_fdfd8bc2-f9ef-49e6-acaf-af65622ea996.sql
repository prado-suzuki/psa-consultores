-- =============================================
-- POLÍTICAS DE DELETE PARA TICKETS
-- =============================================

-- Admins podem excluir qualquer ticket
CREATE POLICY "Admins can delete any ticket"
ON public.tickets
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Team members podem excluir tickets atribuídos a eles
CREATE POLICY "Team members can delete assigned tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'team_member') AND assigned_to = auth.uid());

-- =============================================
-- POLÍTICAS DE DELETE PARA TICKET_ATTACHMENTS
-- =============================================

-- Admins podem excluir qualquer anexo
CREATE POLICY "Admins can delete any attachment"
ON public.ticket_attachments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Team members podem excluir anexos de tickets atribuídos a eles
CREATE POLICY "Team members can delete attachments of assigned tickets"
ON public.ticket_attachments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'team_member') AND
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_attachments.ticket_id 
    AND tickets.assigned_to = auth.uid()
  )
);

-- =============================================
-- POLÍTICAS DE DELETE PARA TICKET_MESSAGES
-- =============================================

-- Admins podem excluir qualquer mensagem
CREATE POLICY "Admins can delete any message"
ON public.ticket_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Team members podem excluir mensagens de tickets atribuídos a eles
CREATE POLICY "Team members can delete messages of assigned tickets"
ON public.ticket_messages
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'team_member') AND
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_messages.ticket_id 
    AND tickets.assigned_to = auth.uid()
  )
);