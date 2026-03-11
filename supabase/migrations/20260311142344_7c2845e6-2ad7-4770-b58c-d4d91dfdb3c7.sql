
CREATE TABLE public.inscricao_contribuinte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribuinte_id uuid NOT NULL,
  situacao text NOT NULL DEFAULT 'sim',
  numero_ie text,
  uf text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.inscricao_contribuinte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage inscricoes"
ON public.inscricao_contribuinte FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_inscricao_contribuinte_updated_at
  BEFORE UPDATE ON public.inscricao_contribuinte
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
