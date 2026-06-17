-- Migration 20260526150000: desacopla matrícula do bem
ALTER TABLE public.matricula ALTER COLUMN bem_id DROP NOT NULL;

ALTER TABLE public.matricula DROP CONSTRAINT IF EXISTS matricula_bem_id_fkey;
ALTER TABLE public.matricula
  ADD CONSTRAINT matricula_bem_id_fkey
  FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE SET NULL;

ALTER TABLE public.matricula
  ADD CONSTRAINT matricula_cartorio_numero_unique UNIQUE (cartorio_id, numero);

CREATE INDEX IF NOT EXISTS idx_matricula_bem_id ON public.matricula(bem_id);

COMMENT ON COLUMN public.matricula.bem_id IS 'FK opcional para bem. NULL = matrícula órfã (não vinculada).';

-- Migration 20260526160000: cria função atômica de matrícula + titular
CREATE OR REPLACE FUNCTION public.criar_matricula_com_titular(
  matricula_data jsonb,
  titular_data jsonb
)
RETURNS public.matricula
LANGUAGE plpgsql
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