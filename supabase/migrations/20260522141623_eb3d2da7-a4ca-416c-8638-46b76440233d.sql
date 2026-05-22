
CREATE TABLE IF NOT EXISTS public.rls_precheck_allowed_tables (
  table_name text PRIMARY KEY,
  allowed_ops text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rls_precheck_allowed_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_precheck_allowed_tables_read_authenticated"
  ON public.rls_precheck_allowed_tables;
CREATE POLICY "rls_precheck_allowed_tables_read_authenticated"
  ON public.rls_precheck_allowed_tables
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.rls_precheck_allowed_tables(table_name, allowed_ops)
VALUES
  ('tools',            ARRAY['update','delete']),
  ('tool_area_access', ARRAY['update','delete'])
ON CONFLICT (table_name) DO UPDATE SET allowed_ops = EXCLUDED.allowed_ops;

CREATE OR REPLACE FUNCTION public.can_perform(
  p_table text,
  p_op    text,
  p_id    uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed_ops    text[];
  v_rows           int;
  v_exists         boolean;
  v_policy_text    text;
  v_required_role  text;
  v_role           text;
  v_roles          text[];
  v_rank           int;
  v_best_rank      int := 999;
BEGIN
  SELECT allowed_ops INTO v_allowed_ops
    FROM public.rls_precheck_allowed_tables
   WHERE table_name = p_table;

  IF v_allowed_ops IS NULL THEN
    RAISE EXCEPTION 'Table % is not allowed for precheck', p_table
      USING ERRCODE = '22023';
  END IF;

  IF NOT (p_op = ANY(v_allowed_ops)) THEN
    RAISE EXCEPTION 'Op % not allowed for table %', p_op, p_table
      USING ERRCODE = '22023';
  END IF;

  IF p_op NOT IN ('update','delete') THEN
    RAISE EXCEPTION 'Only update/delete are supported (got %)', p_op
      USING ERRCODE = '22023';
  END IF;

  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id = $1)', p_table)
    INTO v_exists USING p_id;

  BEGIN
    IF p_op = 'delete' THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table) USING p_id;
    ELSE
      EXECUTE format('UPDATE public.%I SET id = id WHERE id = $1', p_table) USING p_id;
    END IF;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE EXCEPTION 'PRECHECK_OK' USING DETAIL = v_rows::text;
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'PRECHECK_OK' THEN
        DECLARE
          v_detail text;
        BEGIN
          GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
          v_rows := COALESCE(v_detail::int, 0);
        END;

        IF v_rows > 0 THEN
          RETURN jsonb_build_object(
            'allowed', true,
            'reason', null,
            'required_role', null,
            'message', null
          );
        END IF;

        IF NOT v_exists THEN
          RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'row_not_found',
            'required_role', null,
            'message', null
          );
        END IF;

        SELECT string_agg(coalesce(qual,'') || ' ' || coalesce(with_check,''), ' ')
          INTO v_policy_text
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = p_table
           AND cmd IN (UPPER(p_op), 'ALL');

        v_roles := ARRAY[]::text[];
        IF v_policy_text IS NOT NULL THEN
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role_or_higher\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
        END IF;

        v_required_role := null;
        IF v_roles IS NOT NULL AND array_length(v_roles, 1) > 0 THEN
          FOREACH v_role IN ARRAY v_roles LOOP
            v_rank := CASE v_role
              WHEN 'team_member' THEN 1
              WHEN 'sublider'    THEN 2
              WHEN 'lider'       THEN 3
              WHEN 'admin'       THEN 4
              ELSE 999
            END;
            IF v_rank < v_best_rank THEN
              v_best_rank := v_rank;
              v_required_role := v_role;
            END IF;
          END LOOP;
        END IF;

        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'rls_blocked',
          'required_role', v_required_role,
          'message', null
        );
      ELSE
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'trigger_blocked',
          'required_role', null,
          'message', SQLERRM
        );
      END IF;
    WHEN insufficient_privilege THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'grant_missing',
        'required_role', null,
        'message', null
      );
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_perform(text, text, uuid) TO authenticated;
