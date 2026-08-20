-- =============================================================================
-- Diagnóstico Patrimonial: criação atômica de matrícula + titular
-- =============================================================================
-- O cliente de uma matrícula passa a ser derivado da titularidade
-- (titularidade -> pessoa.cliente_id). Para garantir que toda matrícula tenha
-- ao menos um titular (e portanto um cliente), a criação insere matrícula e
-- titularidade na MESMA transação: se o titular falhar, a matrícula não é criada.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.criar_matricula_com_titular(
  matricula_data jsonb,
  titular_data jsonb
)
RETURNS public.matricula
LANGUAGE plpgsql
-- SECURITY INVOKER (padrão): as RLS de matricula/titularidade são aplicadas
-- ao usuário chamador (team_member+).
AS $$
DECLARE
  v_matricula public.matricula;
BEGIN
  IF titular_data IS NULL OR (titular_data->>'titular_pessoa_id') IS NULL THEN
    RAISE EXCEPTION 'Titular é obrigatório para cadastrar uma matrícula';
  END IF;

  INSERT INTO public.matricula
  SELECT (jsonb_populate_record(
    NULL::public.matricula,
    matricula_data || jsonb_build_object(
      'id', gen_random_uuid(),
      'created_at', now(),
      'updated_at', now(),
      'created_by', auth.uid(),
      'updated_by', NULL
    )
  )).*
  RETURNING * INTO v_matricula;

  INSERT INTO public.titularidade (matricula_id, titular_pessoa_id, tipo, fracao, created_by)
  VALUES (
    v_matricula.id,
    (titular_data->>'titular_pessoa_id')::uuid,
    COALESCE(titular_data->>'tipo', 'DIREITO'),
    NULLIF(titular_data->>'fracao', '')::numeric,
    auth.uid()
  );

  RETURN v_matricula;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_matricula_com_titular(jsonb, jsonb) TO authenticated;
