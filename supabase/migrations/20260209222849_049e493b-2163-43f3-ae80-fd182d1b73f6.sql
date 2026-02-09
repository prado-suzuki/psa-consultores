
-- Criar tabela participante (produção)
CREATE TABLE public.participante (
  id_participante uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela participante_dev (desenvolvimento)
CREATE TABLE public.participante_dev (
  id_participante uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES public.cliente_dev(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Triggers de updated_at
CREATE TRIGGER update_participante_updated_at
  BEFORE UPDATE ON public.participante
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_participante_dev_updated_at
  BEFORE UPDATE ON public.participante_dev
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participante_dev ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_all_participante" ON public.participante
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('team_member','admin'))
  );

CREATE POLICY "team_members_all_participante_dev" ON public.participante_dev
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('team_member','admin'))
  );
