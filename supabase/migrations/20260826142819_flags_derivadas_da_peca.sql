-- 20260826142819_flags_derivadas_da_peca.sql
--
-- A constituição e a alteração compartilham o mesmo modelo, mas alguns blocos
-- pertencem somente a uma das duas peças. O escopo derivada_peca distingue essas
-- condições das flags declarativas do cadastro e das escolhas feitas pelo
-- consultor: a tela sintetiza exatamente uma delas pela posição na sucessão.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

ALTER TABLE public.tmpl_flag DROP CONSTRAINT IF EXISTS tmpl_flag_escopo_check;
ALTER TABLE public.tmpl_flag
  ADD CONSTRAINT tmpl_flag_escopo_check
    CHECK (escopo = ANY (ARRAY[
      'cliente'::text,
      'pj'::text,
      'documento'::text,
      'derivada_peca'::text
    ]));

-- Flags derivadas da peça não apontam para uma coluna do cadastro: o número da
-- alteração vem da cadeia de documento_gerado e só existe no controlador.
ALTER TABLE public.tmpl_flag DROP CONSTRAINT IF EXISTS tmpl_flag_definicao_por_tipo;
ALTER TABLE public.tmpl_flag
  ADD CONSTRAINT tmpl_flag_definicao_por_tipo CHECK (
    (
      tipo = 'manual'
      AND expressao_sql IS NULL
      AND entidade IS NULL
      AND campo IS NULL
      AND valor IS NULL
    )
    OR
    (
      tipo = 'derivada'
      AND (
        (
          escopo = 'derivada_peca'
          AND expressao_sql IS NULL
          AND entidade IS NULL
          AND campo IS NULL
          AND valor IS NULL
        )
        OR
        (
          expressao_sql IS NOT NULL
          AND entidade IS NULL
          AND campo IS NULL
          AND valor IS NULL
        )
        OR
        (
          expressao_sql IS NULL
          AND entidade IS NOT NULL
          AND campo IS NOT NULL
          AND valor IS NOT NULL
        )
      )
    )
  );

INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo)
VALUES
  (
    'e_alteracao',
    'derivada',
    'derivada_peca',
    'A peça é uma alteração contratual',
    true
  ),
  (
    'e_constituicao',
    'derivada',
    'derivada_peca',
    'A peça é uma constituição',
    true
  )
ON CONFLICT (nome) DO NOTHING;
