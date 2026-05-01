-- Tabela de correções manuais ICMS para sub-abas T03.1
CREATE TABLE public.correcoes_icms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribuinte_id UUID NOT NULL,
  familia TEXT NOT NULL CHECK (familia IN ('acucar','etanol_interestado','biodiesel')),
  data_lancamento DATE NOT NULL,
  competencia TEXT,
  descricao TEXT NOT NULL,
  produto TEXT,
  campos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ambiente TEXT NOT NULL DEFAULT 'prod',
  excluido BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correcoes_icms_lookup
  ON public.correcoes_icms (contribuinte_id, familia, data_lancamento)
  WHERE excluido = false;

ALTER TABLE public.correcoes_icms ENABLE ROW LEVEL SECURITY;

-- Validação de FK lógica para contribuinte
CREATE OR REPLACE FUNCTION public.validate_correcoes_icms_contribuinte()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.contribuinte_id) THEN
    RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.contribuinte_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_correcoes_icms_validate_contribuinte
BEFORE INSERT OR UPDATE ON public.correcoes_icms
FOR EACH ROW EXECUTE FUNCTION public.validate_correcoes_icms_contribuinte();

CREATE TRIGGER trg_correcoes_icms_updated_at
BEFORE UPDATE ON public.correcoes_icms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: equipe interna (team_member ou superior)
CREATE POLICY "Equipe pode visualizar correcoes ICMS"
ON public.correcoes_icms FOR SELECT
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "Equipe pode inserir correcoes ICMS"
ON public.correcoes_icms FOR INSERT
WITH CHECK (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "Equipe pode atualizar correcoes ICMS"
ON public.correcoes_icms FOR UPDATE
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));