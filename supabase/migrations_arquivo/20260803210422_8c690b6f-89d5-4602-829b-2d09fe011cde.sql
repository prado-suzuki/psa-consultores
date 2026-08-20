-- EDU-24 · A leitura que entrega ao portal do cliente o que foi pedido, e nada mais.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_solicitacao_ativa_cliente()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH s AS (
    SELECT sol.id, sol.status, sol.enviada_em
    FROM public.solicitacao sol
    WHERE sol.cliente_id = public.resolve_user_cliente_id(auth.uid())
      AND sol.status = 'enviada'::public.osg_solicitacao_status
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'solicitacao',
      (SELECT jsonb_build_object('id', s.id, 'status', s.status, 'enviada_em', s.enviada_em)
         FROM s),
    'itens',
      COALESCE(
        (SELECT jsonb_agg(
                  jsonb_build_object(
                    'id',        i.id,
                    'grupo',     i.grupo,
                    'documento', COALESCE(i.documento, t.documento),
                    'nota',      COALESCE(i.nota,      t.nota),
                    'entidade',  COALESCE(i.entidade,  t.entidade),
                    'ordem',     i.ordem
                  )
                  ORDER BY i.grupo, i.ordem, COALESCE(i.documento, t.documento)
                )
           FROM public.solicitacao_item i
           JOIN s ON s.id = i.solicitacao_id
           LEFT JOIN public.documento_tipo t ON t.id = i.item_padrao_id
          WHERE i.status = 'ativo'::public.osg_solicitacao_item_status),
        '[]'::jsonb)
  );
$function$;

COMMENT ON FUNCTION public.get_solicitacao_ativa_cliente() IS
  'Entrega ao portal do cliente a solicitação ENVIADA dele e os itens ativos dela. Sem pedido enviado, devolve solicitacao nula e itens vazio (nunca null puro, para o front tratar um formato só). documento, entidade e nota herdam de documento_tipo quando nulos na linha.';

REVOKE ALL ON FUNCTION public.get_solicitacao_ativa_cliente() FROM public;
GRANT EXECUTE ON FUNCTION public.get_solicitacao_ativa_cliente() TO authenticated;

COMMIT;