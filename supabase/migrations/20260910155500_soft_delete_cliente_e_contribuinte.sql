-- Exclusão lógica de cliente e contribuinte por função SECURITY DEFINER.
--
-- Tarefa 3 de 5 da regra de 02/09/2026. DEPENDE DA TAREFA 1
-- (20260910154656_cadastro_alterar_por_cargo.sql), que precisa ser aplicada antes.
-- docs/sprints/sprint-13/TAREFA_soft-delete-cliente-e-contribuinte.md
--
-- DEFEITO
-- Excluir contribuinte recusa todo mundo que não é admin, mesmo no cluster
-- certo. Marcar `excluido = true` faz a linha nova sair da vista de quem está
-- gravando no meio da própria gravação: a policy de SELECT dessas tabelas exige
-- `excluido = false`, e o Postgres aplica a leitura também à LINHA NOVA. O
-- comando inteiro é recusado com 42501.
--
-- MEDIDO EM 10/09/2026, no sandbox, em transação revertida (líder Ricardo
-- Migueis, o mesmo da medição de 20/08):
--   update contribuinte set telefone = telefone  -> 1 linha
--   update contribuinte set excluido = true      -> 42501
--   update cliente      set excluido = true      -> 42501
-- Ou seja: o defeito é real nas duas tabelas e a tarefa se justifica. O
-- `WITH CHECK` liberado não basta, porque não é ele que dispara.
--
-- CORREÇÃO
-- Uma função SECURITY DEFINER por tabela, espelhando `soft_delete_ordem_servico`
-- e `soft_delete_distribuicao_receita`, que já estão em produção desde 20/08.
-- Ela roda como dona da tabela, a policy não se aplica, e a autorização é
-- verificada por dentro. NENHUMA POLICY É ALTERADA aqui.
--
-- ============================================================================
-- ATENÇÃO — ESTA FUNÇÃO NÃO CONFERE O CLUSTER, E ISSO É O QUE A TAREFA PEDE
-- ============================================================================
-- O corpo abaixo é o SQL da tarefa 3, transcrito sem alteração. A autorização
-- dele é `admin OR (excluido = false AND cargo >= sublider)` — sem cluster.
--
-- Fora de uma função, "só cargo" ainda tem a leitura por trás: o UPDATE tem
-- WHERE e não alcança linha que o SELECT esconde. DENTRO de uma função
-- SECURITY DEFINER não existe essa rede — nem a policy de leitura nem a de
-- escrita são aplicadas. Consequência: sublíder de QUALQUER cluster exclui
-- contribuinte de QUALQUER cliente.
--
-- As duas funções irmãs em produção conferem o cluster à mão exatamente por
-- isso, e o corpo de `soft_delete_distribuicao_receita` traz o aviso:
--   "Copiar só o texto do UPDATE aqui AFROUXARIA a regra, deixando sublíder
--    excluir rateio de cliente que ele não enxerga."
--
-- Mantido como está para executar a tarefa com exatidão. A correção proposta
-- (uma cláusula `AND cliente_visivel_para(...)` em cada função) está no
-- relatório de gaps da sprint, para decisão da Patricia. Enquanto não for
-- decidido, o afrouxamento é inalcançável pela tela — a lista de clientes é
-- recortada por cluster e o modal não abre para cliente de fora —, mas é
-- alcançável pela API.
-- ============================================================================
--
-- PRÉ-REQUISITOS CONFERIDOS EM 10/09/2026, nos dois bancos:
--   - `cliente` e `contribuinte` são de `postgres` e NÃO têm FORCE ROW LEVEL
--     SECURITY, então a função escapa da policy.
--   - Triggers: `contribuinte` tem só `update_contribuinte_updated_at`;
--     `cliente` tem esse e `trg_cliente_tem_cluster`, que é DEFERRABLE
--     INITIALLY DEFERRED e não é afetado por marcar `excluido`.
--   - `updated_at` fica fora do UPDATE: o trigger BEFORE UPDATE já resolve.
--   - Chaves primárias: `cliente.id` e `contribuinte.id`.
--
-- Idempotente por `create or replace function`.

CREATE OR REPLACE FUNCTION public.soft_delete_contribuinte(_ids uuid[])
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
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM contribuinte ct
   WHERE ct.id = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM contribuinte ct
   WHERE ct.id = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         ct.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Contribuinte nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % contribuinte(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE contribuinte ct
     SET excluido = true
   WHERE ct.id = ANY (_ids)
     AND ct.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_cliente(_ids uuid[])
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
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM cliente cl
   WHERE cl.id = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM cliente cl
   WHERE cl.id = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         cl.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Cliente nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % cliente(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE cliente cl
     SET excluido = true
   WHERE cl.id = ANY (_ids)
     AND cl.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_cliente(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_cliente(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_cliente(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_cliente(uuid[]) TO service_role;
