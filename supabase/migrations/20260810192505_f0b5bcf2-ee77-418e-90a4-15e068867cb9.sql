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