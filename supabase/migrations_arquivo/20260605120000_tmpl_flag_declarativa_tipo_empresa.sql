-- Flags derivadas DECLARATIVAS em tmpl_flag.
--
-- Em vez de expressao_sql (que exigiria executar SQL arbitrário na geração),
-- uma flag derivada declarativa aponta um campo de uma entidade do CONTEXTO DE
-- GERAÇÃO (ex.: empresa.tipo_empresa = 'PR') e é avaliada no cliente sobre o
-- registro já selecionado na tela Gerar (lib/templates/flags.ts). expressao_sql
-- permanece para um futuro avaliador server-side; as duas formas convivem.
--
-- Seed: as três primeiras flags — tipo da empresa selecionada
-- (pessoa.tipo_empresa: PR=Proprietária | CN=Controladora | SC=Sócia).

ALTER TABLE public.tmpl_flag
  ADD COLUMN entidade text,
  ADD COLUMN campo text,
  ADD COLUMN valor text;

COMMENT ON COLUMN public.tmpl_flag.entidade IS 'Flag declarativa: chave da fonte no contexto de geração (ex.: empresa)';
COMMENT ON COLUMN public.tmpl_flag.campo IS 'Flag declarativa: campo do registro da fonte (ex.: tipo_empresa)';
COMMENT ON COLUMN public.tmpl_flag.valor IS 'Flag declarativa: valor que ativa a flag (ex.: PR)';

-- Definição declarativa é tudo-ou-nada e exclusiva de flags derivadas.
ALTER TABLE public.tmpl_flag DROP CONSTRAINT tmpl_flag_expressao_por_tipo;
ALTER TABLE public.tmpl_flag ADD CONSTRAINT tmpl_flag_definicao_por_tipo CHECK (
  (
    tipo = 'manual'
    AND expressao_sql IS NULL
    AND entidade IS NULL AND campo IS NULL AND valor IS NULL
  )
  OR (
    tipo = 'derivada'
    AND (
      (expressao_sql IS NOT NULL AND entidade IS NULL AND campo IS NULL AND valor IS NULL)
      OR (expressao_sql IS NULL AND entidade IS NOT NULL AND campo IS NOT NULL AND valor IS NOT NULL)
    )
  )
);

INSERT INTO public.tmpl_flag (nome, tipo, escopo, entidade, campo, valor, descricao, ativo) VALUES
  ('empresa-proprietaria', 'derivada', 'pj', 'empresa', 'tipo_empresa', 'PR',
   'Ativa quando a empresa selecionada na geração é Proprietária (pessoa.tipo_empresa = PR).', true),
  ('empresa-controladora', 'derivada', 'pj', 'empresa', 'tipo_empresa', 'CN',
   'Ativa quando a empresa selecionada na geração é Controladora (pessoa.tipo_empresa = CN).', true),
  ('empresa-socia', 'derivada', 'pj', 'empresa', 'tipo_empresa', 'SC',
   'Ativa quando a empresa selecionada na geração é Sócia (pessoa.tipo_empresa = SC).', true);
