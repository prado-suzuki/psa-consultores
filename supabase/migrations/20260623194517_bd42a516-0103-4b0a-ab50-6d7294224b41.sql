BEGIN;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.dashboards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text    NOT NULL,
  embed_url     text    NOT NULL,
  param_names   text[]  NOT NULL DEFAULT '{}',
  filter_type   text    NOT NULL DEFAULT 'cluster',
  target_page   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT dashboards_filter_type_chk CHECK (filter_type IN ('cluster','cliente','nenhum'))
);

COMMENT ON TABLE  public.dashboards             IS 'Registro de dashboards do Looker Studio (cadastro na aba /equipe/acessos > Dashboards).';
COMMENT ON COLUMN public.dashboards.param_names IS 'Chaves dsN.<param> que a URL recebe (?params=). Multi-fonte = várias chaves.';
COMMENT ON COLUMN public.dashboards.filter_type IS 'cluster|cliente|nenhum — define qual resolvedor preenche o valor do filtro em runtime.';

CREATE INDEX idx_dashboards_ativos ON public.dashboards (is_active);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_member+ can view dashboards"  ON public.dashboards;
CREATE POLICY "team_member+ can view dashboards"  ON public.dashboards
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "lider+ can insert dashboards"      ON public.dashboards;
CREATE POLICY "lider+ can insert dashboards"      ON public.dashboards
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ can update dashboards"      ON public.dashboards;
CREATE POLICY "lider+ can update dashboards"      ON public.dashboards
  FOR UPDATE TO authenticated
  USING      (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "admin can delete dashboards"       ON public.dashboards;
CREATE POLICY "admin can delete dashboards"       ON public.dashboards
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO authenticated;
GRANT ALL ON public.dashboards TO service_role;

CREATE TRIGGER trg_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dashboard_access (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id          uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  override_cluster_ids  uuid[]  NOT NULL DEFAULT '{}',
  override_all_clusters boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_access_unq UNIQUE (dashboard_id, user_id)
);

COMMENT ON TABLE  public.dashboard_access                       IS 'Grant usuário -> dashboard. Override de cluster apenas p/ usuários sem vínculo (sócios).';
COMMENT ON COLUMN public.dashboard_access.override_cluster_ids  IS 'Clusters explícitos p/ sócio (sem vínculo). Vazio = filtro derivado do viewer.';
COMMENT ON COLUMN public.dashboard_access.override_all_clusters IS 'true = sócio vê todos os clusters ativos (injetados na URL, nunca URL nua/fail-open).';

CREATE INDEX idx_dashboard_access_dashboard ON public.dashboard_access (dashboard_id);
CREATE INDEX idx_dashboard_access_user      ON public.dashboard_access (user_id);

ALTER TABLE public.dashboard_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own or admin dashboard_access"  ON public.dashboard_access;
CREATE POLICY "view own or admin dashboard_access"  ON public.dashboard_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ can insert dashboard_access" ON public.dashboard_access;
CREATE POLICY "lider+ can insert dashboard_access" ON public.dashboard_access
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ can update dashboard_access" ON public.dashboard_access;
CREATE POLICY "lider+ can update dashboard_access" ON public.dashboard_access
  FOR UPDATE TO authenticated
  USING      (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ can delete dashboard_access" ON public.dashboard_access;
CREATE POLICY "lider+ can delete dashboard_access" ON public.dashboard_access
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_access TO authenticated;
GRANT ALL ON public.dashboard_access TO service_role;

CREATE TRIGGER trg_dashboard_access_updated_at
  BEFORE UPDATE ON public.dashboard_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;