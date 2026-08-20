-- ============================================================================
-- RPC de PRÉ-VISUALIZAÇÃO (admin) dos dashboards.
--   preview_dashboard_embed_url(dashboard, modo, alvo...) — resolve o filtro
--   para um ALVO escolhido (usuário / cluster / cliente), NÃO para auth.uid().
--   Gated em lider+ (ferramenta de validação admin). Fail-closed.
-- Reusa resolve_user_cluster_ids / resolve_user_cliente_id (migration #2).
-- Não altera nada existente.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.preview_dashboard_embed_url(
  _dashboard_id uuid,
  _mode         text,
  _cluster_ids  uuid[] DEFAULT '{}',
  _user_id      uuid   DEFAULT NULL,
  _cliente_id   uuid   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d           public.dashboards%ROWTYPE;
  cluster_ids uuid[];
  cliente_id  uuid;
  v_value     text;
BEGIN
  -- Só admin/líder pode pré-visualizar como outro.
  IF NOT public.has_role_or_higher(auth.uid(), 'lider'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO d FROM public.dashboards WHERE id = _dashboard_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Sem RLS: ignora o alvo.
  IF d.filter_type = 'nenhum' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'ok',
      'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', NULL);

  ELSIF d.filter_type = 'cluster' THEN
    IF _mode = 'user' THEN
      IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_target'); END IF;
      cluster_ids := public.resolve_user_cluster_ids(_user_id);
    ELSIF _mode = 'cluster' THEN
      cluster_ids := _cluster_ids;
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'mode_mismatch');
    END IF;
    IF cluster_ids IS NULL OR array_length(cluster_ids, 1) IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
    SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',') INTO v_value
    FROM unnest(cluster_ids) AS x;

  ELSIF d.filter_type = 'cliente' THEN
    IF _mode = 'user' THEN
      IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_target'); END IF;
      cliente_id := public.resolve_user_cliente_id(_user_id);
    ELSIF _mode = 'cliente' THEN
      cliente_id := _cliente_id;
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'mode_mismatch');
    END IF;
    IF cliente_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
    v_value := cliente_id::text;

  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_filter_type');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'ok',
    'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', v_value);
END;
$$;

COMMENT ON FUNCTION public.preview_dashboard_embed_url(uuid, text, uuid[], uuid, uuid) IS
  'Preview admin (lider+): resolve o filtro do dashboard para um alvo (usuário/cluster/cliente). Fail-closed.';

GRANT EXECUTE ON FUNCTION public.preview_dashboard_embed_url(uuid, text, uuid[], uuid, uuid) TO authenticated;

COMMIT;
