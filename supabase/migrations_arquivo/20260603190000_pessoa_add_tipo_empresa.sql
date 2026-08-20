-- =========================================================
-- Adiciona tipo de empresa (PJ only) na tabela pessoa
-- Proprietária (PR) | Controladora (CN) | Sócia (SC)
-- =========================================================

ALTER TABLE public.pessoa
  ADD COLUMN tipo_empresa text;

ALTER TABLE public.pessoa
  ADD CONSTRAINT pessoa_tipo_empresa_check
    CHECK (tipo_empresa IS NULL OR tipo_empresa IN ('PR', 'CN', 'SC'));

COMMENT ON COLUMN public.pessoa.tipo_empresa IS 'PJ only: PR=Proprietária | CN=Controladora | SC=Sócia';
