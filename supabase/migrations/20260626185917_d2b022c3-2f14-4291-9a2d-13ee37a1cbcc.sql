BEGIN;

CREATE TABLE IF NOT EXISTS public.roi_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid NOT NULL,
  scope_kind    text NOT NULL CHECK (scope_kind IN ('process', 'project')),
  scope_id      uuid,
  process_id    uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  label         text,
  snapshot_at   timestamptz NOT NULL DEFAULT now(),
  annual_cost     numeric,
  annual_hours    numeric,
  annual_savings  numeric,
  roi_percent     numeric,
  payback_months  numeric,
  hours_freed     numeric,
  investment      numeric,
  created_by    uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roi_snapshots_process    ON public.roi_snapshots (process_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_checkpoint ON public.roi_snapshots (checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_scope      ON public.roi_snapshots (scope_kind, scope_id, snapshot_at DESC);

GRANT SELECT, INSERT, DELETE ON public.roi_snapshots TO authenticated;
GRANT ALL ON public.roi_snapshots TO service_role;

ALTER TABLE public.roi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can view roi_snapshots"
ON public.roi_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

DROP POLICY IF EXISTS "Team members can insert roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can insert roi_snapshots"
ON public.roi_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

DROP POLICY IF EXISTS "Team members can delete roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can delete roi_snapshots"
ON public.roi_snapshots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

COMMENT ON TABLE public.roi_snapshots IS 'Histórico de mensurações de ROI por processo. checkpoint_id agrupa o save (1 linha = escopo process; N = escopo project). Append-only.';

COMMIT;