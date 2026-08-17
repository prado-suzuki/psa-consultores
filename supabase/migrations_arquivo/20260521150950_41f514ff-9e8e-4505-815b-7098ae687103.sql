CREATE TABLE IF NOT EXISTS public.grupo_tributo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla text NOT NULL UNIQUE,
  denominacao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.codigo_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_tributo_id uuid NOT NULL REFERENCES public.grupo_tributo(id) ON DELETE RESTRICT,
  codigo text NOT NULL,
  denominacao_receita text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT codigo_receita_grupo_codigo_unique UNIQUE (grupo_tributo_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_codigo_receita_grupo ON public.codigo_receita(grupo_tributo_id);

DROP TRIGGER IF EXISTS trg_grupo_tributo_updated_at ON public.grupo_tributo;
CREATE TRIGGER trg_grupo_tributo_updated_at
  BEFORE UPDATE ON public.grupo_tributo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_codigo_receita_updated_at ON public.codigo_receita;
CREATE TRIGGER trg_codigo_receita_updated_at
  BEFORE UPDATE ON public.codigo_receita
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.grupo_tributo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigo_receita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read grupo_tributo" ON public.grupo_tributo;
CREATE POLICY "Authenticated can read grupo_tributo"
  ON public.grupo_tributo FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage grupo_tributo" ON public.grupo_tributo;
CREATE POLICY "Admins manage grupo_tributo"
  ON public.grupo_tributo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read codigo_receita" ON public.codigo_receita;
CREATE POLICY "Authenticated can read codigo_receita"
  ON public.codigo_receita FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage codigo_receita" ON public.codigo_receita;
CREATE POLICY "Admins manage codigo_receita"
  ON public.codigo_receita FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));