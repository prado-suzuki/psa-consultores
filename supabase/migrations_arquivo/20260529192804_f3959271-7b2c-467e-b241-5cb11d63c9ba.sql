CREATE OR REPLACE FUNCTION public.criar_bem_com_titular(
  bem_data jsonb,
  titular_data jsonb
)
RETURNS public.bem
LANGUAGE plpgsql
SET search_path = public
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