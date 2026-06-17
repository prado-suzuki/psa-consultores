-- ============================================================================
-- MÓDULO: Composição Documental OSG
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
  CONSTRAINT tmpl_flag_expressao_por_tipo CHECK (
    (tipo = 'derivada' AND expressao_sql IS NOT NULL)
    OR (tipo = 'manual' AND expressao_sql IS NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_flag TO authenticated;
GRANT ALL ON public.tmpl_flag TO service_role;
CREATE INDEX idx_tmpl_flag_tipo ON public.tmpl_flag(tipo);
ALTER TABLE public.tmpl_flag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_flag" ON public.tmpl_flag FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_flag" ON public.tmpl_flag FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_flag" ON public.tmpl_flag FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_flag" ON public.tmpl_flag FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_flag_updated_at BEFORE UPDATE ON public.tmpl_flag FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_documento TO authenticated;
GRANT ALL ON public.tmpl_documento TO service_role;
ALTER TABLE public.tmpl_documento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_documento" ON public.tmpl_documento FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_documento" ON public.tmpl_documento FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_documento" ON public.tmpl_documento FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_documento" ON public.tmpl_documento FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_documento_updated_at BEFORE UPDATE ON public.tmpl_documento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_bloco TO authenticated;
GRANT ALL ON public.tmpl_bloco TO service_role;
CREATE INDEX idx_tmpl_bloco_categoria ON public.tmpl_bloco(categoria);
CREATE INDEX idx_tmpl_bloco_bloco_origem_id ON public.tmpl_bloco(bloco_origem_id);
CREATE INDEX idx_tmpl_bloco_escopo_documento_raiz_id ON public.tmpl_bloco(escopo_documento_raiz_id);
ALTER TABLE public.tmpl_bloco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_bloco" ON public.tmpl_bloco FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_bloco" ON public.tmpl_bloco FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_bloco" ON public.tmpl_bloco FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_bloco" ON public.tmpl_bloco FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_bloco_updated_at BEFORE UPDATE ON public.tmpl_bloco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_bloco_versao TO authenticated;
GRANT ALL ON public.tmpl_bloco_versao TO service_role;
CREATE INDEX idx_tmpl_bloco_versao_bloco_id ON public.tmpl_bloco_versao(bloco_id);
CREATE UNIQUE INDEX uq_tmpl_bloco_versao_atual ON public.tmpl_bloco_versao(bloco_id) WHERE atual;
ALTER TABLE public.tmpl_bloco_versao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_bloco_versao_updated_at BEFORE UPDATE ON public.tmpl_bloco_versao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.tmpl_bloco_flag (
  bloco_id uuid NOT NULL REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES public.tmpl_flag(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (bloco_id, flag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_bloco_flag TO authenticated;
GRANT ALL ON public.tmpl_bloco_flag TO service_role;
CREATE INDEX idx_tmpl_bloco_flag_flag_id ON public.tmpl_bloco_flag(flag_id);
ALTER TABLE public.tmpl_bloco_flag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_bloco_flag_updated_at BEFORE UPDATE ON public.tmpl_bloco_flag FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tmpl_documento_bloco TO authenticated;
GRANT ALL ON public.tmpl_documento_bloco TO service_role;
CREATE INDEX idx_tmpl_documento_bloco_documento_id ON public.tmpl_documento_bloco(documento_id);
CREATE INDEX idx_tmpl_documento_bloco_bloco_id ON public.tmpl_documento_bloco(bloco_id);
ALTER TABLE public.tmpl_documento_bloco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tmpl_documento_bloco_updated_at BEFORE UPDATE ON public.tmpl_documento_bloco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_flag_valor TO authenticated;
GRANT ALL ON public.projeto_flag_valor TO service_role;
CREATE INDEX idx_projeto_flag_valor_cliente_id ON public.projeto_flag_valor(cliente_id);
CREATE INDEX idx_projeto_flag_valor_pj_pessoa_id ON public.projeto_flag_valor(pj_pessoa_id);
CREATE INDEX idx_projeto_flag_valor_flag_id ON public.projeto_flag_valor(flag_id);
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_cliente ON public.projeto_flag_valor(cliente_id, flag_id) WHERE pj_pessoa_id IS NULL;
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_pj ON public.projeto_flag_valor(cliente_id, pj_pessoa_id, flag_id) WHERE pj_pessoa_id IS NOT NULL;
ALTER TABLE public.projeto_flag_valor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view projeto_flag_valor" ON public.projeto_flag_valor FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert projeto_flag_valor" ON public.projeto_flag_valor FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update projeto_flag_valor" ON public.projeto_flag_valor FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete projeto_flag_valor" ON public.projeto_flag_valor FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_projeto_flag_valor_updated_at BEFORE UPDATE ON public.projeto_flag_valor FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','revisao','finalizado','registrado')),
  gerado_por_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  gerado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_gerado TO authenticated;
GRANT ALL ON public.documento_gerado TO service_role;
CREATE INDEX idx_documento_gerado_cliente_id ON public.documento_gerado(cliente_id);
CREATE INDEX idx_documento_gerado_pj_pessoa_id ON public.documento_gerado(pj_pessoa_id);
CREATE INDEX idx_documento_gerado_template_id ON public.documento_gerado(documento_template_id);
CREATE INDEX idx_documento_gerado_anterior_id ON public.documento_gerado(documento_anterior_id);
CREATE INDEX idx_documento_gerado_raiz_id ON public.documento_gerado(documento_raiz_id);
ALTER TABLE public.documento_gerado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view documento_gerado" ON public.documento_gerado FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert documento_gerado" ON public.documento_gerado FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update documento_gerado" ON public.documento_gerado FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete documento_gerado" ON public.documento_gerado FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_documento_gerado_updated_at BEFORE UPDATE ON public.documento_gerado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.documento_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_gerado_id uuid NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('substituicao','supressao','adicao')),
  bloco_alvo_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  bloco_substituto_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  ordem integer,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT documento_override_campos_por_tipo CHECK (
    (tipo = 'substituicao' AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NOT NULL)
    OR (tipo = 'supressao'  AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NULL)
    OR (tipo = 'adicao'     AND bloco_alvo_id IS NULL     AND bloco_substituto_id IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_override TO authenticated;
GRANT ALL ON public.documento_override TO service_role;
CREATE INDEX idx_documento_override_documento_gerado_id ON public.documento_override(documento_gerado_id);
CREATE INDEX idx_documento_override_bloco_alvo_id ON public.documento_override(bloco_alvo_id);
CREATE INDEX idx_documento_override_bloco_substituto_id ON public.documento_override(bloco_substituto_id);
ALTER TABLE public.documento_override ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_member+ can view documento_override" ON public.documento_override FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert documento_override" ON public.documento_override FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update documento_override" ON public.documento_override FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete documento_override" ON public.documento_override FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_documento_override_updated_at BEFORE UPDATE ON public.documento_override FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


ALTER TABLE public.tmpl_bloco
  ADD CONSTRAINT tmpl_bloco_escopo_documento_raiz_fk
  FOREIGN KEY (escopo_documento_raiz_id)
  REFERENCES public.documento_gerado(id) ON DELETE SET NULL;
