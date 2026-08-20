-- ============================================================================
-- Soft-delete de OS e de rateio por função SECURITY DEFINER
-- ============================================================================
-- DEFEITO
-- Ninguém abaixo de admin consegue gravar `excluido = true` em `ordem_servico`
-- nem em `distribuicao_receita`. O banco recusa com
-- 42501 "new row violates row-level security policy".
-- Relatado pela Maritsa (líder) em 19/08/2026, cliente Clodoveu Franciosi,
-- OS 109/2026.
--
-- CAUSA
-- A migração 20260714174809 incorporou `excluido = false` nas policies de
-- SELECT de 7 tabelas, para esconder no banco o que foi excluído. Como o
-- UPDATE tem WHERE — e portanto exige SELECT sobre a tabela — o Postgres
-- aplica as policies de leitura também à LINHA NOVA. A linha nova, com
-- `excluido = true`, deixa de ser visível para quem não é admin, e o comando
-- inteiro é recusado.
--
-- Aquela migração deixou o WITH CHECK do UPDATE de propósito SEM o filtro,
-- justamente para liberar o soft-delete (está escrito no cabeçalho dela). O
-- que passou batido é que o WITH CHECK não é o único teste aplicado à linha
-- nova. Admin não sente porque `ordem_servico_select` tem `admin OR` na frente
-- do filtro e `distribuicao_receita` tem uma policy de SELECT só para admin.
--
-- MEDIDO em dev (transação com ROLLBACK, líder Ricardo Migueis, 20/08/2026):
--   update ordem_servico       set observacoes = observacoes  -> 1 linha
--   update ordem_servico       set excluido = true            -> 42501
--   idem, sem cláusula RETURNING                              -> 42501
--   update distribuicao_receita set percentual_rateio = ...   -> 1 linha
--   update distribuicao_receita set excluido = true           -> 42501
-- Falhar sem RETURNING é o que descarta a correção barata de tirar o
-- `.select()` do front: não é o retorno que dispara, é o WHERE.
--
-- CORREÇÃO
-- Uma função SECURITY DEFINER por tabela. Ela roda como dona da tabela
-- (postgres), então a policy não se aplica a ela, e a autorização passa a ser
-- verificada por dentro — espelhando a regra que hoje autoriza editar a linha.
-- NENHUMA POLICY É ALTERADA: a decisão de 14/07 de esconder linha excluída
-- continua de pé, e é justamente por isso que a correção vai por função.
--
-- PRÉ-REQUISITOS, conferidos no banco antes de escrever isto:
--   - `ordem_servico` e `distribuicao_receita` são de `postgres` e NÃO têm
--     FORCE ROW LEVEL SECURITY (`pg_class.relforcerowsecurity = false`), então
--     a função escapa da policy.
--   - has_role / has_role_or_higher / cliente_visivel_para /
--     resolve_user_cluster_ids já são SECURITY DEFINER STABLE e resolvem a
--     partir de `auth.uid()`, não de RLS — respondem o mesmo dentro da função
--     e dentro da policy.
--   - nenhuma das duas tabelas tem trigger.
--
-- ESCOPO
-- Só estas duas tabelas. `cliente`, `contribuinte`, `representante`,
-- `correcoes_icms` e `documento_arquivo` têm o mesmo defeito e ficam para
-- outra tarefa. Padrão já usado na casa: `soft_delete_documento_cliente`.
-- ============================================================================

-- ─── ordem_servico ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_ordem_servico(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão sem usuário autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM ordem_servico os
   WHERE os.id = ANY (_ids);

  -- Espelha admin_full_ordem_servico_update + rls_ordem_servico_update.
  -- A função roda como dona da tabela, então a policy NÃO é aplicada aqui:
  -- esta condição É a autorização, não um pré-filtro. Manter idêntica ao
  -- texto das policies — se elas mudarem, isto muda junto.
  SELECT count(*) INTO v_autorizadas
    FROM ordem_servico os
   WHERE os.id = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         os.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
         AND (
           cliente_visivel_para(os.id_cliente)
           OR (os.cluster_id IS NOT NULL
               AND os.cluster_id = ANY (resolve_user_cluster_ids(v_uid)))
         )
       )
     );

  -- Tudo ou nada. Exclusão parcial em silêncio foi o que escondeu o defeito
  -- original por semanas: a tela seguia como se tivesse excluído.
  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada: % de % id(s) enviados não existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissão para excluir % de % ordem(ns) de serviço.',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE ordem_servico os
     SET excluido   = true,
         updated_at = now()
   WHERE os.id = ANY (_ids)
     AND os.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

COMMENT ON FUNCTION public.soft_delete_ordem_servico(uuid[]) IS
  'Marca ordem_servico.excluido = true fora da policy (SECURITY DEFINER), '
  'validando por dentro a mesma regra de rls_ordem_servico_update. Existe '
  'porque a policy de SELECT exige excluido = false e o Postgres a aplica à '
  'linha nova, o que recusa o próprio soft-delete para quem não é admin. '
  'Tudo ou nada: qualquer id inexistente ou não autorizado aborta o lote. '
  'Devolve quantas linhas passaram de false para true — pode ser menor que o '
  'total quando um admin re-exclui linha já excluída, que é benigno.';

REVOKE ALL ON FUNCTION public.soft_delete_ordem_servico(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_ordem_servico(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_ordem_servico(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_ordem_servico(uuid[]) TO service_role;

-- ─── distribuicao_receita ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_distribuicao_receita(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão sem usuário autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM distribuicao_receita dr
   WHERE dr.id = ANY (_ids);

  -- Espelha a regra EFETIVA, que é a interseção de duas policies:
  --   rls_distribuicao_receita_update -> excluido = false AND sublider+
  --   distribuicao_receita_select     -> excluido = false AND (admin OR OS
  --                                      com cliente visível)
  -- A policy de UPDATE sozinha não checa visibilidade de cliente, mas o
  -- UPDATE só alcança linha que o SELECT deixa ver — medido em dev: um líder
  -- sem o cluster do cliente afeta 0 linhas, sem erro. Copiar só o texto do
  -- UPDATE aqui AFROUXARIA a regra, deixando sublíder excluir rateio de
  -- cliente que ele não enxerga.
  SELECT count(*) INTO v_autorizadas
    FROM distribuicao_receita dr
   WHERE dr.id = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         dr.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
         AND EXISTS (
           SELECT 1
             FROM ordem_servico os
            WHERE os.id = dr.id_ordem_servico
              AND cliente_visivel_para(os.id_cliente)
         )
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Linha de rateio não encontrada: % de % id(s) enviados não existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissão para excluir % de % linha(s) de rateio.',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  -- `distribuicao_receita` não tem coluna updated_at — não copiar o
  -- `SET updated_at = now()` da função de OS.
  UPDATE distribuicao_receita dr
     SET excluido = true
   WHERE dr.id = ANY (_ids)
     AND dr.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

COMMENT ON FUNCTION public.soft_delete_distribuicao_receita(uuid[]) IS
  'Marca distribuicao_receita.excluido = true fora da policy (SECURITY '
  'DEFINER), validando por dentro a interseção de rls_distribuicao_receita_'
  'update com distribuicao_receita_select — inclusive a visibilidade do '
  'cliente da OS, que a policy de UPDATE sozinha não exige. Tudo ou nada.';

REVOKE ALL ON FUNCTION public.soft_delete_distribuicao_receita(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_distribuicao_receita(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_distribuicao_receita(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_distribuicao_receita(uuid[]) TO service_role;