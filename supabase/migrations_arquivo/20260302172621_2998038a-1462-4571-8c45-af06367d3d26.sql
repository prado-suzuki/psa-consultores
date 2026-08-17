
-- Table
CREATE TABLE public.contribuinte_bal_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_contribuinte uuid NOT NULL UNIQUE,
  balancete_detalhamento boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contribuinte_bal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read contribuinte_bal_config"
  ON public.contribuinte_bal_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can insert contribuinte_bal_config"
  ON public.contribuinte_bal_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update contribuinte_bal_config"
  ON public.contribuinte_bal_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

-- Trigger
CREATE TRIGGER update_contribuinte_bal_config_updated_at
  BEFORE UPDATE ON public.contribuinte_bal_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
