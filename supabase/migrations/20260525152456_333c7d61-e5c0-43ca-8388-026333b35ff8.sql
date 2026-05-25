
-- =========================
-- TABELA: pessoa
-- =========================
CREATE TABLE public.pessoa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  contribuinte_id uuid REFERENCES public.contribuinte(id) ON DELETE SET NULL,
  tipo_pessoa text NOT NULL CHECK (tipo_pessoa IN ('PF','PJ')),
  denominacao text NOT NULL,
  cpf_cnpj text,

  -- Endereço
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_municipio text,
  endereco_uf text,
  endereco_cep text,

  -- PF only
  nacionalidade text,
  estado_civil text,
  regime_bens text,
  data_nascimento date,
  filiacao_pai text,
  filiacao_mae text,
  profissao text,
  rg_numero text,
  rg_orgao_emissor text,
  rg_uf text,
  conjuge_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,

  -- PJ only
  nire text,
  junta_comercial_uf text,
  data_constituicao date,
  objeto_social text,
  status_constituicao text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.pessoa.tipo_pessoa IS 'PF ou PJ';
COMMENT ON COLUMN public.pessoa.denominacao IS 'Nome completo (PF) ou Razão social (PJ)';
COMMENT ON COLUMN public.pessoa.cpf_cnpj IS 'CPF (PF) ou CNPJ (PJ)';
COMMENT ON COLUMN public.pessoa.contribuinte_id IS 'Nullable - vínculo opcional com contribuinte';

COMMENT ON COLUMN public.pessoa.nacionalidade IS 'PF only';
COMMENT ON COLUMN public.pessoa.estado_civil IS 'PF only';
COMMENT ON COLUMN public.pessoa.regime_bens IS 'PF only';
COMMENT ON COLUMN public.pessoa.data_nascimento IS 'PF only';
COMMENT ON COLUMN public.pessoa.filiacao_pai IS 'PF only';
COMMENT ON COLUMN public.pessoa.filiacao_mae IS 'PF only';
COMMENT ON COLUMN public.pessoa.profissao IS 'PF only';
COMMENT ON COLUMN public.pessoa.rg_numero IS 'PF only';
COMMENT ON COLUMN public.pessoa.rg_orgao_emissor IS 'PF only';
COMMENT ON COLUMN public.pessoa.rg_uf IS 'PF only';
COMMENT ON COLUMN public.pessoa.conjuge_id IS 'PF only - FK para outra pessoa (cônjuge)';

COMMENT ON COLUMN public.pessoa.nire IS 'PJ only';
COMMENT ON COLUMN public.pessoa.junta_comercial_uf IS 'PJ only';
COMMENT ON COLUMN public.pessoa.data_constituicao IS 'PJ only';
COMMENT ON COLUMN public.pessoa.objeto_social IS 'PJ only';
COMMENT ON COLUMN public.pessoa.status_constituicao IS 'PJ only';

CREATE INDEX idx_pessoa_cliente_id ON public.pessoa(cliente_id);
CREATE INDEX idx_pessoa_contribuinte_id ON public.pessoa(contribuinte_id);
CREATE INDEX idx_pessoa_cpf_cnpj ON public.pessoa(cpf_cnpj);
CREATE INDEX idx_pessoa_conjuge_id ON public.pessoa(conjuge_id);

ALTER TABLE public.pessoa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view pessoa"
  ON public.pessoa FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert pessoa"
  ON public.pessoa FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update pessoa"
  ON public.pessoa FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete pessoa"
  ON public.pessoa FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pessoa_updated_at
  BEFORE UPDATE ON public.pessoa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TABELA: parentesco
-- =========================
CREATE TABLE public.parentesco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  parente_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  tipo text,
  natureza text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT parentesco_no_self CHECK (pessoa_id <> parente_pessoa_id)
);

CREATE INDEX idx_parentesco_pessoa_id ON public.parentesco(pessoa_id);
CREATE INDEX idx_parentesco_parente_pessoa_id ON public.parentesco(parente_pessoa_id);

ALTER TABLE public.parentesco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view parentesco"
  ON public.parentesco FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert parentesco"
  ON public.parentesco FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update parentesco"
  ON public.parentesco FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete parentesco"
  ON public.parentesco FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_parentesco_updated_at
  BEFORE UPDATE ON public.parentesco
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
