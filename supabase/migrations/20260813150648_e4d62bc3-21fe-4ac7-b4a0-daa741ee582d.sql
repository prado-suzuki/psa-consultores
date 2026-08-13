DROP POLICY IF EXISTS "cliente can view own solicitacao enviada" ON public.solicitacao;
CREATE POLICY "cliente can view own solicitacao enviada"
  ON public.solicitacao FOR SELECT TO authenticated
  USING (cliente_id = public.resolve_user_cliente_id(auth.uid())
         AND status IN ('enviada'::public.osg_solicitacao_status,
                        'em_checklist'::public.osg_solicitacao_status));

DROP POLICY IF EXISTS "cliente can view own solicitacao_item enviada" ON public.solicitacao_item;
CREATE POLICY "cliente can view own solicitacao_item enviada"
  ON public.solicitacao_item FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solicitacao s
                  WHERE s.id = solicitacao_id
                    AND s.cliente_id = public.resolve_user_cliente_id(auth.uid())
                    AND s.status IN ('enviada'::public.osg_solicitacao_status,
                                     'em_checklist'::public.osg_solicitacao_status)));