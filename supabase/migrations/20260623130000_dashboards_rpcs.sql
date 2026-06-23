-- ============================================================================
-- RPCs server-side para os dashboards (resolução de RLS sem o cliente enviar id)
--   - resolve_user_cluster_ids(uid)   : 3 caminhos (membro ∪ gestor equipe ∪ gestor área)
--   - resolve_user_cliente_id(uid)    : representante → cliente (1 esperado, fail-loud se >1)
--   - get_accessible_dashboards(page) : lista dashboards que o usuário logado pode ver
--   - get_dashboard_embed_url(id)     : resolve o VALOR do filtro server-side (auth.uid()),
--                                       fail-closed; devolve embed_url + param_names + value.
-- Tudo SECURITY DEFINER: o valor do filtro é derivado do usuário AUTENTICADO,
-- nunca enviado pelo cliente. (Limitação conhecida do Looker: o param ainda vai
-- na URL do iframe e é editável no DevTools — blindagem total exige embed assinado.)
-- NÃO altera nada existente. Só cria funções novas.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Cluster(s) do usuário — união dos 3 caminhos (espelha useUserEstrutura e o
--    CTE user_cluster_src das views BQ). Só clusters ativos. Determinístico.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_user_cluster_ids(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(c.id ORDER BY c.id), '{}')
  FROM (
    SELECT DISTINCT c.id
    FROM public.estrutura_clusters c
    WHERE c.is_active = true
      AND c.id IN (
        -- caminho 1: membro de equipe
        SELECT a.cluster_id
        FROM public.estrutura_equipe_membros m
        JOIN public.estrutura_equipes e ON e.id = m.equipe_id
        JOIN public.estrutura_areas    a ON a.id = e.area_id
        WHERE m.user_id = _uid
        UNION
        -- caminho 2: gestor de equipe
        SELECT a.cluster_id
        FROM public.estrutura_equipes e
        JOIN public.estrutura_areas   a ON a.id = e.area_id
        WHERE e.gestor_id = _uid
        UNION
        -- caminho 3: gestor de área
        SELECT a.cluster_id
        FROM public.estrutura_areas a
        WHERE a.gestor_chamados_id = _uid
      )
  ) c;
$$;

COMMENT ON FUNCTION public.resolve_user_cluster_ids(uuid) IS
  'Clusters ativos do usuário pela união dos 3 caminhos (membro ∪ gestor equipe ∪ gestor área).';

-- ----------------------------------------------------------------------------
-- 2) Cliente do usuário (lado cliente do portal). 1 esperado por regra de negócio;
--    >1 distinto = dado duplicado → fail-loud (espelha useClienteClusters).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_user_cliente_id(_uid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT c.id)
  INTO ids
  FROM public.representante r
  JOIN public.cliente c ON c.id = r.id_cliente AND c.excluido = false
  WHERE r.user_id = _uid AND r.excluido = false;

  IF ids IS NULL OR array_length(ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  IF array_length(ids, 1) > 1 THEN
    RAISE EXCEPTION
      'resolve_user_cliente_id: usuario % vinculado a % id_cliente distintos (dado duplicado)',
      _uid, array_length(ids, 1);
  END IF;
  RETURN ids[1];
END;
$$;

COMMENT ON FUNCTION public.resolve_user_cliente_id(uuid) IS
  'id_cliente do usuário via representante→cliente. Fail-loud se >1 distinto.';

-- ----------------------------------------------------------------------------
-- 3) Dashboards que o usuário logado pode ver (gate por dashboard_access).
--    SECURITY DEFINER: clientes (role abaixo de team_member) leem via esta RPC,
--    sem precisar de SELECT direto na tabela `dashboards`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_accessible_dashboards(_target_page text DEFAULT NULL)
RETURNS TABLE (id uuid, name text, filter_type text, target_page text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.filter_type, d.target_page
  FROM public.dashboards d
  WHERE d.is_active = true
    AND (_target_page IS NULL OR d.target_page = _target_page)
    AND EXISTS (
      SELECT 1 FROM public.dashboard_access da
      WHERE da.dashboard_id = d.id AND da.user_id = auth.uid()
    )
  ORDER BY d.name;
$$;

COMMENT ON FUNCTION public.get_accessible_dashboards(text) IS
  'Lista (id, nome, filter_type, target_page) dos dashboards que o usuário logado tem acesso.';

-- ----------------------------------------------------------------------------
-- 4) Resolve o filtro do dashboard para o usuário logado. Fail-closed.
--    Retorna jsonb { ok, reason, embed_url, param_names, value }.
--    O front monta a URL final (buildLookerEmbedUrl) — o VALOR vem daqui (server-side).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d           public.dashboards%ROWTYPE;
  acc         public.dashboard_access%ROWTYPE;
  v_uid       uuid := auth.uid();
  cluster_ids uuid[];
  cliente_id  uuid;
  v_value     text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO d FROM public.dashboards WHERE id = _dashboard_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO acc FROM public.dashboard_access
  WHERE dashboard_id = _dashboard_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
  END IF;

  -- Dashboard sem RLS (Digital DEV interno): sem params.
  IF d.filter_type = 'nenhum' THEN
    RETURN jsonb_build_object(
      'ok', true, 'reason', 'ok',
      'embed_url', d.embed_url,
      'param_names', to_jsonb(d.param_names),
      'value', NULL
    );

  ELSIF d.filter_type = 'cluster' THEN
    IF acc.override_all_clusters THEN
      SELECT array_agg(id ORDER BY id) INTO cluster_ids
      FROM public.estrutura_clusters WHERE is_active = true;
    ELSIF array_length(acc.override_cluster_ids, 1) IS NOT NULL THEN
      cluster_ids := acc.override_cluster_ids;
    ELSE
      cluster_ids := public.resolve_user_cluster_ids(v_uid);
    END IF;

    IF cluster_ids IS NULL OR array_length(cluster_ids, 1) IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;

    -- distinct + ordenado → string "id,id" (UNNEST(SPLIT(@p,',')) no DS aceita 1 ou N)
    SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',')
    INTO v_value
    FROM unnest(cluster_ids) AS x;

  ELSIF d.filter_type = 'cliente' THEN
    cliente_id := public.resolve_user_cliente_id(v_uid);
    IF cliente_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
    v_value := cliente_id::text;

  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_filter_type');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'reason', 'ok',
    'embed_url', d.embed_url,
    'param_names', to_jsonb(d.param_names),
    'value', v_value
  );
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_embed_url(uuid) IS
  'Resolve o valor do filtro (cluster/cliente) server-side p/ o usuário logado. Fail-closed.';

GRANT EXECUTE ON FUNCTION public.resolve_user_cluster_ids(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_cliente_id(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_dashboards(text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_embed_url(uuid)    TO authenticated;

COMMIT;
