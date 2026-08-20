-- EDU-24 · A leitura que entrega ao portal do cliente o que foi pedido, e nada mais.
--
-- A função que o portal usa hoje, get_checklist_solicitado_cliente, lê
-- checklist_cliente_item do cliente logado e filtra apenas os status
-- 'dispensado' e 'nao_aplicavel'. O furo: em 03/08/2026 não existe NENHUMA
-- linha nesses dois status (0 de 475). O filtro não filtra nada, e todo cliente
-- vê 100% das próprias linhas, inclusive rascunho que ninguém enviou. O maior
-- (Barralcool) vê 239 linhas.
--
-- Esta função lê da solicitação e só devolve conteúdo quando o status é
-- 'enviada'. Sem pedido enviado, devolve cabeçalho nulo e lista vazia.
--
-- É AQUI que a herança do catálogo se resolve. solicitacao_item não copia texto
-- (EDU-22): item de catálogo entra com documento, entidade e nota nulos. O
-- coalesce abaixo pega o texto da linha quando preenchido e cai no catálogo
-- quando nulo. LEFT JOIN e não JOIN, porque item criado à mão tem
-- item_padrao_id nulo e todo o texto mora na própria linha.
--
-- SECURITY DEFINER: a função roda com os privilégios de quem a criou e IGNORA a
-- RLS das tabelas que lê. Por isso o filtro por resolve_user_cliente_id
-- (auth.uid()) DENTRO do corpo não é opcional: é ele que faz o papel do RLS. Sem
-- ele, qualquer usuário autenticado lê o pedido de qualquer outro.
--
-- A função ANTIGA não é apagada aqui: ela ainda é usada por
-- src/components/cliente/ChecklistDocumentosConteudo.tsx e por
-- src/components/cliente/ColetaDocumentosCliente.tsx. Quem as desliga é a
-- EDU-27; apagar agora deixaria a área do cliente em branco no meio da sprint.
--
-- Reversão: drop function public.get_solicitacao_ativa_cliente();

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
