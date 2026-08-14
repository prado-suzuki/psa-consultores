ALTER TABLE public.pessoa RENAME COLUMN rg_numero        TO documento_identidade_numero;
ALTER TABLE public.pessoa RENAME COLUMN rg_orgao_emissor TO documento_identidade_orgao;
ALTER TABLE public.pessoa RENAME COLUMN rg_uf            TO documento_identidade_uf;

ALTER TABLE public.pessoa
  ADD COLUMN documento_identidade_tipo text,
  ADD COLUMN nome_uso text,
  ADD COLUMN genero char(1),
  ADD COLUMN naturalidade_municipio text,
  ADD COLUMN naturalidade_uf text,
  ADD COLUMN filiacao_pai_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,
  ADD COLUMN filiacao_mae_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,
  ADD COLUMN convive_uniao_estavel boolean NOT NULL DEFAULT false,
  ADD COLUMN is_fundador boolean NOT NULL DEFAULT false;

ALTER TABLE public.pessoa
  ADD CONSTRAINT pessoa_genero_check
    CHECK (genero IS NULL OR genero IN ('M','F')),
  ADD CONSTRAINT pessoa_documento_identidade_tipo_check
    CHECK (documento_identidade_tipo IS NULL
           OR documento_identidade_tipo IN ('rg','cnh','reservista','ctps'));

COMMENT ON COLUMN public.pessoa.documento_identidade_tipo   IS 'PF only: rg|cnh|reservista|ctps';
COMMENT ON COLUMN public.pessoa.documento_identidade_numero IS 'PF only';
COMMENT ON COLUMN public.pessoa.documento_identidade_orgao  IS 'PF only';
COMMENT ON COLUMN public.pessoa.documento_identidade_uf     IS 'PF only';
COMMENT ON COLUMN public.pessoa.nome_uso                IS 'Nome utilizado em contratos';
COMMENT ON COLUMN public.pessoa.genero                  IS 'PF only: M ou F (concordância)';
COMMENT ON COLUMN public.pessoa.naturalidade_municipio  IS 'PF only';
COMMENT ON COLUMN public.pessoa.naturalidade_uf         IS 'PF only';
COMMENT ON COLUMN public.pessoa.filiacao_pai_pessoa_id  IS 'PF only: nullable, se o pai estiver cadastrado';
COMMENT ON COLUMN public.pessoa.filiacao_mae_pessoa_id  IS 'PF only: nullable, se a mãe estiver cadastrada';
COMMENT ON COLUMN public.pessoa.convive_uniao_estavel   IS 'PF only';
COMMENT ON COLUMN public.pessoa.is_fundador             IS 'PF only: patriarca/matriarca do grupo';

CREATE INDEX idx_pessoa_filiacao_pai_pessoa_id ON public.pessoa(filiacao_pai_pessoa_id);
CREATE INDEX idx_pessoa_filiacao_mae_pessoa_id ON public.pessoa(filiacao_mae_pessoa_id);