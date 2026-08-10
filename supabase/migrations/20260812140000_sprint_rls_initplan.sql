-- -----------------------------------------------------------------------------
-- RLS das telas de sprint: tirar a checagem de usuário de dentro do laço
--
-- A policy de leitura é `USING (public.sprint_visivel(sprint_id))`. A função é
-- STABLE e recebe uma COLUNA, então o Postgres a executa uma vez por linha:
-- numa sprint com 300 tarefas são 300 execuções, e cada uma roda `has_role`,
-- `is_membro_digital` e, no pior caso, `resolve_user_cluster_ids` (três joins
-- nas tabelas de estrutura). A view `sprint_resumo` paga o mesmo por entregável
-- da empresa inteira.
--
-- Os dois primeiros testes de `sprint_visivel` não dependem da linha: são sobre
-- QUEM está consultando. Extraídos para uma função sem argumento e chamados
-- como `(SELECT ...)`, viram InitPlan -- avaliados uma vez para a consulta
-- toda. Para admin e para membro do Digital (que é quem abre estas telas), o
-- `OR` corta ali e o teste por linha nunca roda. Para os demais, o custo é
-- exatamente o de hoje.
--
-- A semântica não muda: `sprint_visivel(x)` já é `A OR B(x)`, e
-- `A OR (A OR B(x))` é a mesma coisa.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ve_todas_as_sprints()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
      OR public.is_membro_digital(auth.uid());
$$;

COMMENT ON FUNCTION public.ve_todas_as_sprints() IS
  'Parte de sprint_visivel() que não depende da linha: admin ou membro do Digital enxerga qualquer sprint. Sem argumento de propósito, para o planejador resolver como InitPlan quando chamada de dentro de (SELECT ...) numa policy.';

DROP POLICY IF EXISTS sprints_select ON public.sprints;
CREATE POLICY sprints_select ON public.sprints FOR SELECT TO authenticated USING (
  (SELECT public.ve_todas_as_sprints())
  OR (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sprints.project_id
      -- `IN (SELECT unnest(...))` em vez de `= ANY (f(...))`: a subconsulta não
      -- é correlacionada, então a lista de clusters do usuário é resolvida uma
      -- vez só, e não a cada linha. (`= ANY ((SELECT f()))` não serve: com
      -- subconsulta, o ANY compara linhas, e o tipo seria uuid = uuid[].)
      AND p.cluster_id IN (SELECT unnest(public.resolve_user_cluster_ids(auth.uid())))
  ))
);

DROP POLICY IF EXISTS sprint_deliverables_select ON public.sprint_deliverables;
CREATE POLICY sprint_deliverables_select ON public.sprint_deliverables FOR SELECT TO authenticated
  USING ((SELECT public.ve_todas_as_sprints()) OR public.sprint_visivel(sprint_id));

DROP POLICY IF EXISTS sprint_events_select ON public.sprint_events;
CREATE POLICY sprint_events_select ON public.sprint_events FOR SELECT TO authenticated
  USING ((SELECT public.ve_todas_as_sprints()) OR public.sprint_visivel(sprint_id));

DROP POLICY IF EXISTS sprint_metrics_select ON public.sprint_metrics;
CREATE POLICY sprint_metrics_select ON public.sprint_metrics FOR SELECT TO authenticated
  USING ((SELECT public.ve_todas_as_sprints()) OR public.sprint_visivel(sprint_id));

