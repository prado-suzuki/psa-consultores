
-- Helpers
CREATE OR REPLACE FUNCTION public.is_membro_digital(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM estrutura_equipe_membros m
    JOIN estrutura_equipes e ON e.id = m.equipe_id
    WHERE m.user_id = p_uid
      AND e.area_id = '52f0596b-2904-4f76-a22d-2bad80350458'
  );
$$;

CREATE OR REPLACE FUNCTION public.sprint_visivel(p_sprint_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.is_membro_digital(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = p_sprint_id
        AND s.project_id IS NOT NULL
        AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
    );
$$;

-- Drop antigas SELECT
DROP POLICY IF EXISTS "Team members can view sprints" ON public.sprints;
DROP POLICY IF EXISTS "Team members can view backlog items" ON public.sprint_backlog_items;
DROP POLICY IF EXISTS "Team members can view deliverables" ON public.sprint_deliverables;
DROP POLICY IF EXISTS "Team members can view events" ON public.sprint_events;
DROP POLICY IF EXISTS "Team members can view metrics" ON public.sprint_metrics;
DROP POLICY IF EXISTS "Team members can view deliverable attachments" ON public.deliverable_attachments;
DROP POLICY IF EXISTS "Team members can view standups" ON public.daily_standups;
DROP POLICY IF EXISTS "Team members can view routines" ON public.routines;
DROP POLICY IF EXISTS "Team members can view demand items" ON public.demand_items;

-- Novas SELECT
CREATE POLICY sprints_select ON public.sprints FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.is_membro_digital(auth.uid())
  OR (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sprints.project_id
      AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
  ))
);

CREATE POLICY sprint_backlog_items_select ON public.sprint_backlog_items FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.is_membro_digital(auth.uid())
  OR (sprint_id IS NOT NULL AND public.sprint_visivel(sprint_id))
  OR (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sprint_backlog_items.project_id
      AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
  ))
);

CREATE POLICY sprint_deliverables_select ON public.sprint_deliverables FOR SELECT TO authenticated
  USING (public.sprint_visivel(sprint_id));

CREATE POLICY sprint_events_select ON public.sprint_events FOR SELECT TO authenticated
  USING (public.sprint_visivel(sprint_id));

CREATE POLICY sprint_metrics_select ON public.sprint_metrics FOR SELECT TO authenticated
  USING (public.sprint_visivel(sprint_id));

CREATE POLICY deliverable_attachments_select ON public.deliverable_attachments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sprint_deliverables d
          WHERE d.id = deliverable_attachments.deliverable_id
            AND public.sprint_visivel(d.sprint_id))
);

CREATE POLICY daily_standups_select ON public.daily_standups FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.is_membro_digital(auth.uid())
  OR user_id = auth.uid()
  OR (sprint_id IS NOT NULL AND public.sprint_visivel(sprint_id))
  OR (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = daily_standups.project_id
      AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
  ))
);

CREATE POLICY routines_select ON public.routines FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.is_membro_digital(auth.uid())
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY demand_items_select ON public.demand_items FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.is_membro_digital(auth.uid())
  OR assigned_to = auth.uid()
);
