-- =========================================================
-- Cria as tabelas administracao, quadro_societario e
-- capital_integralizacao conforme o diagrama OSG.
-- Segue as convenções: auditoria (created_by/updated_by ->
-- profiles), RLS (team_member+ leitura/escrita, admin delete),
-- índices em FKs e trigger de updated_at.
-- =========================================================

-- =========================
-- TABELA: administracao
-- =========================
CREATE TABLE public.administracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pj_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  administrador_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  cargo text,
  pode_isoladamente boolean,
  data_inicio date,
  data_fim date,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.administracao.pj_pessoa_id IS 'PJ administrada';
COMMENT ON COLUMN public.administracao.administrador_pessoa_id IS 'Pessoa que administra a PJ';
COMMENT ON COLUMN public.administracao.pode_isoladamente IS 'Se o administrador pode agir isoladamente';

CREATE INDEX idx_administracao_pj_pessoa_id ON public.administracao(pj_pessoa_id);
CREATE INDEX idx_administracao_administrador_pessoa_id ON public.administracao(administrador_pessoa_id);

ALTER TABLE public.administracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view administracao"
  ON public.administracao FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert administracao"
  ON public.administracao FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update administracao"
  ON public.administracao FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete administracao"
  ON public.administracao FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_administracao_updated_at
  BEFORE UPDATE ON public.administracao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TABELA: quadro_societario
-- =========================
CREATE TABLE public.quadro_societario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  socio_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  quotas integer,
  vlr_total numeric,
  percentual numeric,
  data_referencia date,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.quadro_societario.empresa_pessoa_id IS 'PJ cujo quadro societário é descrito';
COMMENT ON COLUMN public.quadro_societario.socio_pessoa_id IS 'Sócio (pessoa) participante da PJ';
COMMENT ON COLUMN public.quadro_societario.percentual IS 'Percentual de participação do sócio';

CREATE INDEX idx_quadro_societario_empresa_pessoa_id ON public.quadro_societario(empresa_pessoa_id);
CREATE INDEX idx_quadro_societario_socio_pessoa_id ON public.quadro_societario(socio_pessoa_id);

ALTER TABLE public.quadro_societario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view quadro_societario"
  ON public.quadro_societario FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert quadro_societario"
  ON public.quadro_societario FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update quadro_societario"
  ON public.quadro_societario FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete quadro_societario"
  ON public.quadro_societario FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_quadro_societario_updated_at
  BEFORE UPDATE ON public.quadro_societario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TABELA: capital_integralizacao
-- =========================
CREATE TABLE public.capital_integralizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  bem_id uuid NOT NULL REFERENCES public.bem(id) ON DELETE CASCADE,
  socio_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  empresa_destino_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  vlr_mercado numeric,
  pct_vlr_mercado numeric,
  vlr_contabil numeric,
  pct_vlr_contabil numeric,
  vlr_capital_arredondado numeric,
  pct_capital numeric,
  reserva_capital numeric,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.capital_integralizacao.socio_pessoa_id IS 'Sócio que integraliza o bem no capital';
COMMENT ON COLUMN public.capital_integralizacao.empresa_destino_pessoa_id IS 'PJ destino que recebe o bem como capital';
COMMENT ON COLUMN public.capital_integralizacao.reserva_capital IS 'Parcela alocada em reserva de capital';

CREATE INDEX idx_capital_integralizacao_cliente_id ON public.capital_integralizacao(cliente_id);
CREATE INDEX idx_capital_integralizacao_bem_id ON public.capital_integralizacao(bem_id);
CREATE INDEX idx_capital_integralizacao_socio_pessoa_id ON public.capital_integralizacao(socio_pessoa_id);
CREATE INDEX idx_capital_integralizacao_empresa_destino_pessoa_id ON public.capital_integralizacao(empresa_destino_pessoa_id);

ALTER TABLE public.capital_integralizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view capital_integralizacao"
  ON public.capital_integralizacao FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert capital_integralizacao"
  ON public.capital_integralizacao FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update capital_integralizacao"
  ON public.capital_integralizacao FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete capital_integralizacao"
  ON public.capital_integralizacao FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_capital_integralizacao_updated_at
  BEFORE UPDATE ON public.capital_integralizacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
