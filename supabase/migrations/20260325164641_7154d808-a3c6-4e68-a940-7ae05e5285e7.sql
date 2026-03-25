
-- 1. ciclos_avaliacao
CREATE TABLE public.ciclos_avaliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  data_analise_semestral date,
  status text DEFAULT 'planejado',
  descricao text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_ciclos_avaliacao_updated_at
  BEFORE UPDATE ON public.ciclos_avaliacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ciclos_avaliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam ciclos" ON public.ciclos_avaliacao
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 2. metas
CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  meta_pai_id uuid REFERENCES public.metas(id) ON DELETE SET NULL,
  nivel text NOT NULL,
  dimensao text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  criterio_evidencia text,
  prazo date,
  peso numeric DEFAULT 1.0,
  responsavel_id uuid,
  area_id uuid,
  progresso_atual numeric DEFAULT 0,
  classificacao_final text,
  ajuste_qualitativo text,
  status text DEFAULT 'ativa',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam metas" ON public.metas
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 3. kpis_meta
CREATE TABLE public.kpis_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id uuid REFERENCES public.metas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  valor_alvo numeric NOT NULL,
  valor_atual numeric DEFAULT 0,
  unidade text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_kpis_meta_updated_at
  BEFORE UPDATE ON public.kpis_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kpis_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam kpis" ON public.kpis_meta
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 4. atualizacoes_meta
CREATE TABLE public.atualizacoes_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id uuid REFERENCES public.metas(id) ON DELETE CASCADE,
  progresso_anterior numeric,
  progresso_novo numeric,
  comentario text,
  autor_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.atualizacoes_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam atualizacoes" ON public.atualizacoes_meta
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 5. analises_semestrais
CREATE TABLE public.analises_semestrais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  responsavel_id uuid,
  entregas_realizadas text,
  riscos_identificados text,
  ajustes_necessarios text,
  comentario_lider text,
  comentario_avaliado text,
  status text DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_analises_semestrais_updated_at
  BEFORE UPDATE ON public.analises_semestrais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.analises_semestrais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam analises semestrais" ON public.analises_semestrais
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 6. feedbacks
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  de_usuario_id uuid,
  para_usuario_id uuid,
  contexto text NOT NULL,
  comportamento text NOT NULL,
  impacto text NOT NULL,
  anonimo boolean DEFAULT false,
  visivel_para_avaliado boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam feedbacks" ON public.feedbacks
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 7. reunioes_1a1
CREATE TABLE public.reunioes_1a1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lider_id uuid,
  membro_id uuid,
  ciclo_id uuid REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL,
  data_reuniao date NOT NULL,
  temas_discutidos text,
  sentimento integer,
  observacoes_lider text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_reunioes_1a1_updated_at
  BEFORE UPDATE ON public.reunioes_1a1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reunioes_1a1 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam reunioes 1a1" ON public.reunioes_1a1
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );

-- 8. itens_acao_1a1
CREATE TABLE public.itens_acao_1a1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id uuid REFERENCES public.reunioes_1a1(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  responsavel_id uuid,
  prazo date,
  status text DEFAULT 'aberto',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_itens_acao_1a1_updated_at
  BEFORE UPDATE ON public.itens_acao_1a1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.itens_acao_1a1 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e lider acessam itens de acao" ON public.itens_acao_1a1
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
  );
