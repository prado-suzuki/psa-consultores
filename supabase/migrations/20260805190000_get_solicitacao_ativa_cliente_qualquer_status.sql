-- B3 da ALE-31 · A leitura passa a devolver o cabeçalho em QUALQUER status, e os
-- itens só depois de enviado.
--
-- O BUG, medido em 05/08/2026
--
-- A versão anterior filtrava `AND sol.status = 'enviada'`. A tela do cliente
-- (ColetaDocumentosCliente.tsx) decide trancar o envio comparando o status com
-- 'encerrada'. Como encerrada não passa no filtro, a função devolve
-- `solicitacao: null`, e `null?.status === 'encerrada'` é falso — a condição é
-- IMPOSSÍVEL de satisfazer. O único status que a tela conseguia receber era
-- justamente 'enviada'.
--
-- Efeito observado na solicitação 23faac3a: depois de encerrada, o cliente
-- continuava enviando e excluindo arquivo, sem nenhuma mudança na tela. O mesmo
-- vale para rascunho — o consultor ainda monta a lista e o cliente já pode subir
-- arquivo num pedido que nunca foi enviado.
--
-- POR QUE NÃO BASTA APAGAR O FILTRO
--
-- Ele não estava ali por acaso. A EDU-24 o introduziu justamente para o cliente
-- NÃO ver rascunho: antes dela, "todo cliente via 100% das próprias linhas,
-- inclusive rascunho que ninguém enviou". Apagar o filtro devolveria esse furo.
--
-- Então a correção separa duas perguntas que estavam coladas numa só:
--
--   1) EM QUE ESTADO está o pedido?  → o cabeçalho vem SEMPRE. É disso que a tela
--      precisa para decidir se libera o envio, e é o que ela nunca recebia.
--   2) O QUE foi pedido?             → os itens vêm só quando o status já saiu de
--      'rascunho'. Rascunho devolve cabeçalho com status e lista VAZIA.
--
-- Resultado por status:
--
--   rascunho   → cabeçalho com status, itens []   → tela fecha, nada a mostrar
--   enviada    → cabeçalho + itens                → tela abre
--   encerrada  → cabeçalho + itens                → tela fecha, itens em leitura
--   sem nenhuma → solicitacao null, itens []      → tela fecha
--
-- QUAL SOLICITAÇÃO ESCOLHER
--
-- Sem o filtro de status, um cliente com três encerradas e um rascunho casa com
-- quatro linhas, e o LIMIT 1 escolheria qualquer uma. O ORDER BY resolve com o
-- mesmo critério que a leitura do consultor já usa (useDomainSolicitacao):
--
--   encerrada_em DESC NULLS FIRST → a NÃO encerrada vem primeiro, e o índice
--                                   único parcial garante que existe no máximo uma
--   created_at DESC               → entre encerradas, a mais recente
--
-- O QUE NÃO MUDA
--
-- O filtro por resolve_user_cliente_id(auth.uid()) — em SECURITY DEFINER é ele
-- que faz o papel da RLS. O filtro dos itens por solicitacao_item.status='ativo',
-- que é o que mantém o dispensado fora da vista do cliente. E a herança do
-- catálogo por coalesce, com LEFT JOIN porque item criado à mão tem
-- item_padrao_id nulo.
--
-- ACRESCENTADO: `encerrada_em` no cabeçalho, para a tela poder dizer desde quando
-- o pedido está fechado. Chave nova em jsonb é compatível: quem não lê, ignora.
--
-- ATENÇÃO — esta migration sozinha NÃO fecha o bug. Ela habilita a correção: a
-- tela precisa passar a liberar o envio em 'enviada', em vez de trancar em
-- 'encerrada'. Sem essa segunda metade, o comportamento continua o de hoje.
--
-- Reversão: CREATE OR REPLACE com o corpo de
-- 20260803230000_get_solicitacao_ativa_cliente.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_solicitacao_ativa_cliente()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH s AS (
    SELECT sol.id, sol.status, sol.enviada_em, sol.encerrada_em
    FROM public.solicitacao sol
    WHERE sol.cliente_id = public.resolve_user_cliente_id(auth.uid())
    ORDER BY sol.encerrada_em DESC NULLS FIRST, sol.created_at DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'solicitacao',
      (SELECT jsonb_build_object(
                'id',           s.id,
                'status',       s.status,
                'enviada_em',   s.enviada_em,
                'encerrada_em', s.encerrada_em
              )
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
          WHERE i.status = 'ativo'::public.osg_solicitacao_item_status
            AND s.status <> 'rascunho'::public.osg_solicitacao_status),
        '[]'::jsonb)
  );
$function$;

COMMENT ON FUNCTION public.get_solicitacao_ativa_cliente() IS
  'Entrega ao portal do cliente a solicitação dele em QUALQUER status, para a tela poder decidir se libera o envio, e os itens ativos apenas quando o status já saiu de rascunho. Escolhe a não encerrada, ou a última encerrada. Sem solicitação, devolve solicitacao nula e itens vazio (nunca null puro, para o front tratar um formato só). documento, entidade e nota herdam de documento_tipo quando nulos na linha.';

REVOKE ALL ON FUNCTION public.get_solicitacao_ativa_cliente() FROM public;
GRANT EXECUTE ON FUNCTION public.get_solicitacao_ativa_cliente() TO authenticated;

COMMIT;
