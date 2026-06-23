-- ============================================================================
-- CRUD de Dashboards do Looker + controle de acesso
--   - public.dashboards        : registro dos dashboards (nome, embed, params, tipo de filtro)
--   - public.dashboard_access  : grant usuário -> dashboard (+ override de cluster p/ sócios)
-- NÃO mexe em nada existente. Consumidores (BoardRelatorios etc.) seguem no config hardcoded.
-- ============================================================================

BEGIN;

-- Garante a função de updated_at (idempotente — não sobrescreve dados, só a função)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1) public.dashboards  — registro de cada dashboard
-- ============================================================================
CREATE TABLE public.dashboards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text    NOT NULL,                       -- nome exibido
  embed_url     text    NOT NULL,                       -- URL do iframe do Looker (/embed/reporting/.../page/...)
  param_names   text[]  NOT NULL DEFAULT '{}',          -- chaves dsN da URL: {'ds0.cluster_id_param','ds13.cluster_id_param'}
  filter_type   text    NOT NULL DEFAULT 'cluster',     -- como o valor é resolvido: cluster | cliente | nenhum
  target_page   text,                                   -- onde o dashboard aparece (rota/área) — informativo
  is_active     boolean NOT NULL DEFAULT true,          -- liga/desliga sem apagar
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

-- ============================================================================
-- 2) public.dashboard_access  — quem pode ver cada dashboard (editado na aba Usuários)
-- ============================================================================
CREATE TABLE public.dashboard_access (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id          uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  -- Override SÓ p/ quem não tem vínculo derivável (sócio/conta de teste).
  -- Vazio + false => filtro vem do viewer (cliente/cluster). Sem isso preenchido = fail-closed.
  override_cluster_ids  uuid[]  NOT NULL DEFAULT '{}',   -- clusters explícitos (sem FK: array)
  override_all_clusters boolean NOT NULL DEFAULT false,  -- "todos os clusters ativos" (união resolvida server-side)
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

-- Cada um vê o próprio grant; admin vê tudo (necessário pro CRUD listar grants de qualquer user).
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
