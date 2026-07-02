BEGIN;

ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS min_role     app_role;
ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS grupo        text;
ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS all_clusters boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.dashboards.min_role     IS 'Nível mínimo (X ou superior) p/ abrir dashboards cluster/nenhum. NULL = team_member.';
COMMENT ON COLUMN public.dashboards.grupo        IS 'Família do relatório (ex.: PERDCOMP) — só p/ agrupar a exibição na tela de Acessos. NULL = sem grupo.';
COMMENT ON COLUMN public.dashboards.all_clusters IS 'true = todos os gestores (todos os clusters ativos), sem enumerar. false = usa dashboard_cluster_access.';

CREATE TABLE IF NOT EXISTS public.dashboard_cluster_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id)        ON DELETE CASCADE,
  cluster_id   uuid NOT NULL REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_cluster_access_unq UNIQUE (dashboard_id, cluster_id)
);
COMMENT ON TABLE public.dashboard_cluster_access IS 'Clusters (gestores) que podem abrir cada dashboard cluster/nenhum. Vazio + all_clusters=false => só admin.';

CREATE INDEX IF NOT EXISTS idx_dash_cluster_access_dashboard ON public.dashboard_cluster_access (dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dash_cluster_access_cluster   ON public.dashboard_cluster_access (cluster_id);

ALTER TABLE public.dashboard_cluster_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lider+ view dashboard_cluster_access"   ON public.dashboard_cluster_access;
CREATE POLICY "lider+ view dashboard_cluster_access"   ON public.dashboard_cluster_access
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ insert dashboard_cluster_access" ON public.dashboard_cluster_access;
CREATE POLICY "lider+ insert dashboard_cluster_access" ON public.dashboard_cluster_access
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ delete dashboard_cluster_access" ON public.dashboard_cluster_access;
CREATE POLICY "lider+ delete dashboard_cluster_access" ON public.dashboard_cluster_access
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

GRANT SELECT, INSERT, DELETE ON public.dashboard_cluster_access TO authenticated;
GRANT ALL ON public.dashboard_cluster_access TO service_role;

CREATE TABLE IF NOT EXISTS public.dashboard_cliente_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  cliente_id   uuid NOT NULL REFERENCES public.cliente(id)    ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_cliente_access_unq UNIQUE (dashboard_id, cliente_id)
);
COMMENT ON TABLE public.dashboard_cliente_access IS 'Clientes que podem abrir cada dashboard filter_type=cliente. Cada um vê só o próprio id_cliente.';

CREATE INDEX IF NOT EXISTS idx_dash_cliente_access_dashboard ON public.dashboard_cliente_access (dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dash_cliente_access_cliente   ON public.dashboard_cliente_access (cliente_id);

ALTER TABLE public.dashboard_cliente_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lider+ view dashboard_cliente_access"   ON public.dashboard_cliente_access;
CREATE POLICY "lider+ view dashboard_cliente_access"   ON public.dashboard_cliente_access
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ insert dashboard_cliente_access" ON public.dashboard_cliente_access;
CREATE POLICY "lider+ insert dashboard_cliente_access" ON public.dashboard_cliente_access
  FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

DROP POLICY IF EXISTS "lider+ delete dashboard_cliente_access" ON public.dashboard_cliente_access;
CREATE POLICY "lider+ delete dashboard_cliente_access" ON public.dashboard_cliente_access
  FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

GRANT SELECT, INSERT, DELETE ON public.dashboard_cliente_access TO authenticated;
GRANT ALL ON public.dashboard_cliente_access TO service_role;

CREATE OR REPLACE FUNCTION public.get_accessible_dashboards(_target_page text DEFAULT NULL)
RETURNS TABLE (id uuid, name text, filter_type text, target_page text, sop_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.filter_type, d.target_page, d.sop_url
  FROM public.dashboards d
  WHERE d.is_active = true
    AND (_target_page IS NULL OR d.target_page = _target_page)
    AND CASE
      WHEN d.filter_type = 'cliente' THEN
        EXISTS (
          SELECT 1 FROM public.dashboard_cliente_access dca
          WHERE dca.dashboard_id = d.id
            AND dca.cliente_id = public.resolve_user_cliente_id(auth.uid())
        )
      ELSE
        public.has_role_or_higher(auth.uid(), COALESCE(d.min_role, 'team_member'::app_role))
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR d.all_clusters
          OR EXISTS (
            SELECT 1 FROM public.dashboard_cluster_access dca
            WHERE dca.dashboard_id = d.id
              AND dca.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
          )
        )
    END
  ORDER BY d.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_accessible_dashboards(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d           public.dashboards%ROWTYPE;
  v_uid       uuid := auth.uid();
  v_is_admin  boolean;
  v_clusters  uuid[];
  v_scope     uuid[];
  v_cliente   uuid;
  v_value     text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO d FROM public.dashboards WHERE id = _dashboard_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::app_role);

  IF d.filter_type = 'cliente' THEN
    v_cliente := public.resolve_user_cliente_id(v_uid);
    IF v_cliente IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.dashboard_cliente_access dca
      WHERE dca.dashboard_id = d.id AND dca.cliente_id = v_cliente
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;
    v_value := v_cliente::text;

  ELSE
    IF NOT public.has_role_or_higher(v_uid, COALESCE(d.min_role, 'team_member'::app_role)) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;
    v_clusters := public.resolve_user_cluster_ids(v_uid);

    IF NOT (
      v_is_admin
      OR d.all_clusters
      OR EXISTS (
        SELECT 1 FROM public.dashboard_cluster_access dca
        WHERE dca.dashboard_id = d.id AND dca.cluster_id = ANY (v_clusters)
      )
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;

    IF d.filter_type = 'nenhum' THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'ok',
        'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', NULL);
    END IF;

    IF d.all_clusters THEN
      SELECT array_agg(ec.id) INTO v_scope
      FROM public.estrutura_clusters ec WHERE ec.is_active = true;
    ELSE
      SELECT array_agg(dca.cluster_id) INTO v_scope
      FROM public.dashboard_cluster_access dca
      JOIN public.estrutura_clusters ec ON ec.id = dca.cluster_id AND ec.is_active = true
      WHERE dca.dashboard_id = d.id;
    END IF;

    IF v_is_admin THEN
      SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',')
      INTO v_value FROM unnest(v_scope) AS x;
    ELSE
      SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',')
      INTO v_value FROM unnest(v_clusters) AS x WHERE x = ANY (v_scope);
    END IF;

    IF v_value IS NULL OR v_value = '' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'ok',
    'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', v_value);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_dashboard_embed_url(uuid) TO authenticated;

UPDATE public.dashboards SET grupo = 'Clientes, OS e Projetos'
  WHERE id IN ('4cd85335-2a89-4221-94e0-db845c63d524',
               '726a00ef-0284-485e-a585-a74d427e14f7');
UPDATE public.dashboards SET grupo = 'Controle de uso e envio de documentos'
  WHERE id IN ('cfeb314b-722d-4bdb-a948-4636151cde74',
               '57d3df5c-80c3-4f5f-9ae5-ffaf11bdaaae');
UPDATE public.dashboards SET grupo = 'Controle de PERDCOMP'
  WHERE id IN ('08b8fb9b-cdef-4a07-98c8-cc4c6ab97117',
               '9b094479-fad7-4c08-abb4-78979ebede36');

UPDATE public.dashboards SET min_role = 'lider', all_clusters = true
  WHERE id IN ('726a00ef-0284-485e-a585-a74d427e14f7',
               '57d3df5c-80c3-4f5f-9ae5-ffaf11bdaaae');

UPDATE public.dashboards SET min_role = 'sublider', all_clusters = false
  WHERE id IN ('4cd85335-2a89-4221-94e0-db845c63d524',
               'cfeb314b-722d-4bdb-a948-4636151cde74',
               '9b094479-fad7-4c08-abb4-78979ebede36');

INSERT INTO public.dashboard_cluster_access (dashboard_id, cluster_id)
SELECT d.id, 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
FROM public.dashboards d
WHERE d.id IN ('4cd85335-2a89-4221-94e0-db845c63d524',
               'cfeb314b-722d-4bdb-a948-4636151cde74',
               '9b094479-fad7-4c08-abb4-78979ebede36')
  AND EXISTS (SELECT 1 FROM public.estrutura_clusters ec
              WHERE ec.id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3')
ON CONFLICT (dashboard_id, cluster_id) DO NOTHING;

DROP TABLE IF EXISTS public.dashboard_access CASCADE;

COMMIT;