-- O cliente continua vendo o pedido depois da virada para o checklist.
--
-- As duas policies aditivas do portal (EDU-24) filtram `status = 'enviada'`, e o
-- filtro está ali para esconder RASCUNHO, não para esconder fase posterior. Sem
-- este ajuste, mover a solicitação para `em_checklist` (migration
-- 20260814140000) apagaria a lista da vista do cliente no exato momento em que
-- ela deveria virar checklist.
--
-- Rascunho continua invisível: o `in (...)` cita só os dois estados em que o
-- pedido já foi enviado.
--
-- O que NÃO muda:
--
--   * `get_solicitacao_ativa_cliente` fica intocada. Ela é a leitura da
--     solicitação inicial, e o seu filtro de itens (`status <> 'rascunho'`) já
--     devolve o pedido em `em_checklist` sem precisar de nada. A leitura por
--     item × instância, que a fase de checklist usa, é RPC NOVA
--     (`get_pendencias_documentos_cliente`), justamente para não mexer no fluxo
--     de solicitação que está em uso.
--   * a policy de INSERT do cliente em `documento_arquivo`, que não olha status.
--     Quem passa a validar o anexo por item é a RPC de anexo, tarefa seguinte.
--
-- Reversão: recriar as duas policies com `status = 'enviada'::public.osg_solicitacao_status`.

BEGIN;

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

COMMIT;
