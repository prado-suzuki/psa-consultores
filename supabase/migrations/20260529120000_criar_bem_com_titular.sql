-- =============================================================================
-- Diagnóstico Patrimonial: criação atômica de bem + titular (bens sem matrícula)
-- =============================================================================
-- Bens não-imóveis (PS/AP/OU) registram titularidade direto no bem (sem
-- matrícula). Espelhando criar_matricula_com_titular, a criação insere bem e
-- titularidade na MESMA transação: se o titular falhar, o bem não é criado.
-- Garante que todo bem desse tipo nasça com ao menos um titular.
--
-- Imóveis (IR/IB) NÃO usam esta função — a titularidade deles vive na matrícula.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.criar_bem_com_titular(
  bem_data jsonb,
  titular_data jsonb
)
RETURNS public.bem
LANGUAGE plpgsql
-- SECURITY INVOKER (padrão): as RLS de bem/titularidade são aplicadas ao
-- usuário chamador (team_member+).
AS $$
DECLARE
  v_bem public.bem;
BEGIN
  IF titular_data IS NULL OR (titular_data->>'titular_pessoa_id') IS NULL THEN
    RAISE EXCEPTION 'Titular é obrigatório para cadastrar este bem';
  END IF;

  INSERT INTO public.bem
  SELECT (jsonb_populate_record(
    NULL::public.bem,
    bem_data || jsonb_build_object(
      'id', gen_random_uuid(),
      'created_at', now(),
      'updated_at', now(),
      'created_by', auth.uid(),
      'updated_by', NULL
    )
  )).*
  RETURNING * INTO v_bem;

  INSERT INTO public.titularidade (bem_id, titular_pessoa_id, tipo, fracao, created_by)
  VALUES (
    v_bem.id,
    (titular_data->>'titular_pessoa_id')::uuid,
    COALESCE(titular_data->>'tipo', 'DIREITO'),
    NULLIF(titular_data->>'fracao', '')::numeric,
    auth.uid()
  );

  RETURN v_bem;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_bem_com_titular(jsonb, jsonb) TO authenticated;
