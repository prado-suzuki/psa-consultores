-- ============================================================================
-- MÓDULO: Composição Documental OSG
-- ============================================================================
-- Modela o sistema de templates de documentos jurídicos por composição de
-- blocos governados por flags, com versionamento, overrides por documento
-- gerado e cadeia documental (linhagem de alterações).
--
-- Camadas:
--   1. Vocabulário de placeholders -> vive no backend (não modelado aqui)
--   2. Biblioteca de blocos        -> tmpl_bloco + tmpl_bloco_versao
--   3. Composição                  -> tmpl_documento + tmpl_documento_bloco
--   Flags                          -> tmpl_flag + tmpl_bloco_flag + projeto_flag_valor
--   Documentos gerados             -> documento_gerado + documento_override
-- ============================================================================


-- ============================================================================
-- TABELA: tmpl_flag
-- Catálogo de flags. Derivadas (calculadas via SQL sobre o banco) ou manuais
-- (decisões do consultor por projeto).
-- ============================================================================
CREATE TABLE public.tmpl_flag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('derivada','manual')),
  escopo text NOT NULL CHECK (escopo IN ('cliente','pj')),
  expressao_sql text,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- flag derivada precisa de expressão SQL; manual não usa expressão
  CONSTRAINT tmpl_flag_expressao_por_tipo CHECK (
    (tipo = 'derivada' AND expressao_sql IS NOT NULL)
    OR (tipo = 'manual' AND expressao_sql IS NULL)
  )
);

COMMENT ON TABLE  public.tmpl_flag IS 'Catálogo de flags que governam a inclusão de blocos.';
COMMENT ON COLUMN public.tmpl_flag.nome IS 'Identificador semântico, ex: tem_conjuge_socio, administracao_isolada';
COMMENT ON COLUMN public.tmpl_flag.tipo IS 'derivada (calculada do banco) ou manual (decisão do consultor)';
COMMENT ON COLUMN public.tmpl_flag.escopo IS 'cliente ou pj';
COMMENT ON COLUMN public.tmpl_flag.expressao_sql IS 'Consulta que resolve a flag; preenchido apenas se tipo=derivada';

CREATE INDEX idx_tmpl_flag_tipo ON public.tmpl_flag(tipo);

ALTER TABLE public.tmpl_flag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_flag"
  ON public.tmpl_flag FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_flag"
  ON public.tmpl_flag FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_flag"
  ON public.tmpl_flag FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_flag"
  ON public.tmpl_flag FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_flag_updated_at
  BEFORE UPDATE ON public.tmpl_flag
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: tmpl_documento
-- Template de documento: identidade lógica de um tipo de documento jurídico.
-- ============================================================================
CREATE TABLE public.tmpl_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.tmpl_documento IS 'Template de documento jurídico componível.';
COMMENT ON COLUMN public.tmpl_documento.nome IS 'ex: Contrato Social Agro, 1a Alteracao Contratual';
COMMENT ON COLUMN public.tmpl_documento.tipo IS 'ex: contrato_social, alteracao_contratual, doacao_quotas';

ALTER TABLE public.tmpl_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_documento"
  ON public.tmpl_documento FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_documento"
  ON public.tmpl_documento FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_documento"
  ON public.tmpl_documento FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_documento"
  ON public.tmpl_documento FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_documento_updated_at
  BEFORE UPDATE ON public.tmpl_documento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: tmpl_bloco
-- Identidade lógica de um bloco de cláusula. Pode ser derivado de outro bloco
-- (edição pontual) e pode ter escopo restrito a uma linhagem documental.
-- A FK escopo_documento_raiz_id -> documento_gerado é adicionada ao final,
-- após documento_gerado existir (dependência circular).
-- ============================================================================
CREATE TABLE public.tmpl_bloco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  descricao text,
  escopo_documento_raiz_id uuid,
  bloco_origem_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE SET NULL,
  tipo_derivacao text,
  ativo boolean NOT NULL DEFAULT true,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.tmpl_bloco IS 'Bloco de cláusula reutilizável (identidade lógica; conteúdo vive em tmpl_bloco_versao).';
COMMENT ON COLUMN public.tmpl_bloco.categoria IS 'preambulo, capital, administracao, cessao, causa_mortis, etc.';
COMMENT ON COLUMN public.tmpl_bloco.escopo_documento_raiz_id IS 'null se bloco é público; senão restringe uso à linhagem do documento raiz';
COMMENT ON COLUMN public.tmpl_bloco.bloco_origem_id IS 'null se não é derivado; senão aponta para o bloco original';
COMMENT ON COLUMN public.tmpl_bloco.tipo_derivacao IS 'edicao_pontual, variacao_redacional, correcao_typo, etc.';

CREATE INDEX idx_tmpl_bloco_categoria ON public.tmpl_bloco(categoria);
CREATE INDEX idx_tmpl_bloco_bloco_origem_id ON public.tmpl_bloco(bloco_origem_id);
CREATE INDEX idx_tmpl_bloco_escopo_documento_raiz_id ON public.tmpl_bloco(escopo_documento_raiz_id);

ALTER TABLE public.tmpl_bloco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_bloco"
  ON public.tmpl_bloco FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_bloco"
  ON public.tmpl_bloco FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_bloco"
  ON public.tmpl_bloco FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_bloco"
  ON public.tmpl_bloco FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_bloco_updated_at
  BEFORE UPDATE ON public.tmpl_bloco
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: tmpl_bloco_versao
-- Cada edição de um bloco gera uma nova versão. Apenas uma é a 'atual'.
-- ============================================================================
CREATE TABLE public.tmpl_bloco_versao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco_id uuid NOT NULL REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE,
  numero_versao integer NOT NULL,
  caminho_arquivo text,
  checksum text,
  atual boolean NOT NULL DEFAULT false,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changelog text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT tmpl_bloco_versao_unica UNIQUE (bloco_id, numero_versao)
);

COMMENT ON TABLE  public.tmpl_bloco_versao IS 'Versões imutáveis do conteúdo de um bloco; garante reprodutibilidade.';
COMMENT ON COLUMN public.tmpl_bloco_versao.caminho_arquivo IS 'Referência do .docx no storage';
COMMENT ON COLUMN public.tmpl_bloco_versao.atual IS 'true para a versão vigente do bloco';

CREATE INDEX idx_tmpl_bloco_versao_bloco_id ON public.tmpl_bloco_versao(bloco_id);
-- Garante no máximo uma versão atual por bloco
CREATE UNIQUE INDEX uq_tmpl_bloco_versao_atual
  ON public.tmpl_bloco_versao(bloco_id) WHERE atual;

ALTER TABLE public.tmpl_bloco_versao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_bloco_versao"
  ON public.tmpl_bloco_versao FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_bloco_versao"
  ON public.tmpl_bloco_versao FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_bloco_versao"
  ON public.tmpl_bloco_versao FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_bloco_versao"
  ON public.tmpl_bloco_versao FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_bloco_versao_updated_at
  BEFORE UPDATE ON public.tmpl_bloco_versao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: tmpl_bloco_flag  (junção)
-- Flags que um bloco requer (conjunção simples — todas verdadeiras).
-- ============================================================================
CREATE TABLE public.tmpl_bloco_flag (
  bloco_id uuid NOT NULL REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES public.tmpl_flag(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  PRIMARY KEY (bloco_id, flag_id)
);

COMMENT ON TABLE public.tmpl_bloco_flag IS 'Flags exigidas por um bloco (AND simples entre todas).';

CREATE INDEX idx_tmpl_bloco_flag_flag_id ON public.tmpl_bloco_flag(flag_id);

ALTER TABLE public.tmpl_bloco_flag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_bloco_flag"
  ON public.tmpl_bloco_flag FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_bloco_flag"
  ON public.tmpl_bloco_flag FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_bloco_flag"
  ON public.tmpl_bloco_flag FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_bloco_flag"
  ON public.tmpl_bloco_flag FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_bloco_flag_updated_at
  BEFORE UPDATE ON public.tmpl_bloco_flag
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: tmpl_documento_bloco  (composição)
-- Sequência ordenada de blocos que compõem um template de documento.
-- ============================================================================
CREATE TABLE public.tmpl_documento_bloco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.tmpl_documento(id) ON DELETE CASCADE,
  bloco_id uuid NOT NULL REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  ordem integer NOT NULL,
  obrigatorio boolean NOT NULL DEFAULT false,
  observacao text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT tmpl_documento_bloco_unico UNIQUE (documento_id, bloco_id)
);

COMMENT ON TABLE  public.tmpl_documento_bloco IS 'Blocos que compõem um template de documento, em ordem.';
COMMENT ON COLUMN public.tmpl_documento_bloco.obrigatorio IS 'se true, ignora flags e sempre inclui o bloco';

CREATE INDEX idx_tmpl_documento_bloco_documento_id ON public.tmpl_documento_bloco(documento_id);
CREATE INDEX idx_tmpl_documento_bloco_bloco_id ON public.tmpl_documento_bloco(bloco_id);

ALTER TABLE public.tmpl_documento_bloco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view tmpl_documento_bloco"
  ON public.tmpl_documento_bloco FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert tmpl_documento_bloco"
  ON public.tmpl_documento_bloco FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update tmpl_documento_bloco"
  ON public.tmpl_documento_bloco FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete tmpl_documento_bloco"
  ON public.tmpl_documento_bloco FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tmpl_documento_bloco_updated_at
  BEFORE UPDATE ON public.tmpl_documento_bloco
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: projeto_flag_valor
-- Valor das flags manuais por projeto (cliente, opcionalmente uma PJ).
-- ============================================================================
CREATE TABLE public.projeto_flag_valor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  pj_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES public.tmpl_flag(id) ON DELETE CASCADE,
  valor boolean NOT NULL,
  setado_por_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.projeto_flag_valor IS 'Valor de flags por projeto; flags manuais ou overrides de derivadas.';
COMMENT ON COLUMN public.projeto_flag_valor.pj_pessoa_id IS 'null se o escopo da flag for cliente';

CREATE INDEX idx_projeto_flag_valor_cliente_id ON public.projeto_flag_valor(cliente_id);
CREATE INDEX idx_projeto_flag_valor_pj_pessoa_id ON public.projeto_flag_valor(pj_pessoa_id);
CREATE INDEX idx_projeto_flag_valor_flag_id ON public.projeto_flag_valor(flag_id);
-- Um único valor por (cliente, pj, flag); trata-se NULL de pj como valor distinto
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_cliente
  ON public.projeto_flag_valor(cliente_id, flag_id) WHERE pj_pessoa_id IS NULL;
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_pj
  ON public.projeto_flag_valor(cliente_id, pj_pessoa_id, flag_id) WHERE pj_pessoa_id IS NOT NULL;

ALTER TABLE public.projeto_flag_valor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view projeto_flag_valor"
  ON public.projeto_flag_valor FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert projeto_flag_valor"
  ON public.projeto_flag_valor FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update projeto_flag_valor"
  ON public.projeto_flag_valor FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete projeto_flag_valor"
  ON public.projeto_flag_valor FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_projeto_flag_valor_updated_at
  BEFORE UPDATE ON public.projeto_flag_valor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: documento_gerado
-- Instância concreta de um documento para um cliente/PJ. Carrega snapshots
-- para reprodutibilidade e a cadeia documental (anterior/raiz).
-- ============================================================================
CREATE TABLE public.documento_gerado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  pj_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,
  documento_template_id uuid REFERENCES public.tmpl_documento(id) ON DELETE RESTRICT,
  documento_anterior_id uuid REFERENCES public.documento_gerado(id) ON DELETE SET NULL,
  documento_raiz_id uuid REFERENCES public.documento_gerado(id) ON DELETE SET NULL,
  caminho_arquivo text,
  snapshot_flags jsonb,
  snapshot_dados jsonb,
  snapshot_versoes_blocos jsonb,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','revisao','finalizado','registrado')),
  gerado_por_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  gerado_em timestamptz,
  observacao text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.documento_gerado IS 'Documento concreto gerado a partir de um template, para um cliente/PJ.';
COMMENT ON COLUMN public.documento_gerado.documento_anterior_id IS 'null se é raiz da linhagem';
COMMENT ON COLUMN public.documento_gerado.documento_raiz_id IS 'igual ao id se é raiz; denormalizado para queries';
COMMENT ON COLUMN public.documento_gerado.snapshot_flags IS 'estado das flags na geração';
COMMENT ON COLUMN public.documento_gerado.snapshot_dados IS 'valores dos placeholders na geração';
COMMENT ON COLUMN public.documento_gerado.snapshot_versoes_blocos IS 'qual versão de cada bloco foi usada';
COMMENT ON COLUMN public.documento_gerado.status IS 'rascunho, revisao, finalizado, registrado';

CREATE INDEX idx_documento_gerado_cliente_id ON public.documento_gerado(cliente_id);
CREATE INDEX idx_documento_gerado_pj_pessoa_id ON public.documento_gerado(pj_pessoa_id);
CREATE INDEX idx_documento_gerado_template_id ON public.documento_gerado(documento_template_id);
CREATE INDEX idx_documento_gerado_anterior_id ON public.documento_gerado(documento_anterior_id);
CREATE INDEX idx_documento_gerado_raiz_id ON public.documento_gerado(documento_raiz_id);

ALTER TABLE public.documento_gerado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view documento_gerado"
  ON public.documento_gerado FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert documento_gerado"
  ON public.documento_gerado FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update documento_gerado"
  ON public.documento_gerado FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete documento_gerado"
  ON public.documento_gerado FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_documento_gerado_updated_at
  BEFORE UPDATE ON public.documento_gerado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- TABELA: documento_override
-- Alterações específicas de um documento gerado em relação ao seu template.
-- Tipos: substituicao, supressao, adicao.
-- ============================================================================
CREATE TABLE public.documento_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_gerado_id uuid NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('substituicao','supressao','adicao')),
  bloco_alvo_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  bloco_substituto_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  ordem integer,
  justificativa text,
  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Coerência dos campos conforme o tipo de override
  CONSTRAINT documento_override_campos_por_tipo CHECK (
    (tipo = 'substituicao' AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NOT NULL)
    OR (tipo = 'supressao'  AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NULL)
    OR (tipo = 'adicao'     AND bloco_alvo_id IS NULL     AND bloco_substituto_id IS NOT NULL)
  )
);

COMMENT ON TABLE  public.documento_override IS 'Overrides ligados a um documento gerado (não ao cliente/template).';
COMMENT ON COLUMN public.documento_override.tipo IS 'substituicao, supressao, adicao';
COMMENT ON COLUMN public.documento_override.bloco_alvo_id IS 'null em adicao';
COMMENT ON COLUMN public.documento_override.bloco_substituto_id IS 'null em supressao';
COMMENT ON COLUMN public.documento_override.ordem IS 'usado em adicao para posicionar o bloco';

CREATE INDEX idx_documento_override_documento_gerado_id ON public.documento_override(documento_gerado_id);
CREATE INDEX idx_documento_override_bloco_alvo_id ON public.documento_override(bloco_alvo_id);
CREATE INDEX idx_documento_override_bloco_substituto_id ON public.documento_override(bloco_substituto_id);

ALTER TABLE public.documento_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member+ can view documento_override"
  ON public.documento_override FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert documento_override"
  ON public.documento_override FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update documento_override"
  ON public.documento_override FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete documento_override"
  ON public.documento_override FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_documento_override_updated_at
  BEFORE UPDATE ON public.documento_override
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- FK adiada: tmpl_bloco.escopo_documento_raiz_id -> documento_gerado
-- (resolve a dependência circular entre tmpl_bloco e documento_gerado)
-- ============================================================================
ALTER TABLE public.tmpl_bloco
  ADD CONSTRAINT tmpl_bloco_escopo_documento_raiz_fk
  FOREIGN KEY (escopo_documento_raiz_id)
  REFERENCES public.documento_gerado(id) ON DELETE SET NULL;
