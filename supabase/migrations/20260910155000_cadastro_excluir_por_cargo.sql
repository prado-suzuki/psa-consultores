-- Apagar cliente e contribuinte passa a exigir só cargo, não cluster.
--
-- Tarefa 2 de 5 da regra decidida pela Patricia em 02/09/2026.
-- docs/sprints/sprint-13/TAREFA_excluir-por-cargo.md
--
-- POR QUE IMPORTA, se as duas excluem logicamente: o DESFAZER do salvamento
-- apaga cliente de verdade. Quando um passo do cadastro falha, a tela chama
-- `.delete()` no cliente recém-criado e a cascata leva contribuinte, OS, rateio
-- e produtos. Hoje esse apagar exige `cliente_visivel_para` e atinge ZERO
-- linhas, sem devolver erro — e o cliente recém-criado costuma nascer invisível
-- para quem o criou, justamente quando o cluster é de outra área. É a causa dos
-- nove clientes "Frigobom" órfãos de 01/09/2026.
--
-- A de `contribuinte` não é exercida pelo cadastro. Entra para não ficar mais
-- restrita que o UPDATE ao lado, que é a incoerência que produziu o defeito.
--
-- O QUE FICA: o guarda `excluido = false`. Estas duas tabelas guardam linha
-- excluída por decisão de 02/09, e apagar de vez o que já foi excluído
-- logicamente não é operação que o cadastro deva oferecer.
--
-- ESTADO CONFERIDO EM 10/09/2026 por SELECT em `pg_policies`, produção e
-- sandbox idênticos: as duas policies ainda pedem `cliente_visivel_para`.
--
-- NÃO LIMPA OS ÓRFÃOS QUE JÁ EXISTEM. Em produção hoje há 31 clientes e 37
-- contribuintes marcados como excluídos. Esta migração impede novos; o destino
-- dos antigos é decisão da Patricia.
--
-- Idempotente pelo par `drop policy if exists` + `create policy`.

DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
