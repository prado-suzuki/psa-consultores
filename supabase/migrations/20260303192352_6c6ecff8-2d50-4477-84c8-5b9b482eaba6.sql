
CREATE TABLE public.produto_segmento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.produto_segmento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read produto_segmento" ON public.produto_segmento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team members can manage produto_segmento" ON public.produto_segmento
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
    OR public.has_role(auth.uid(), 'team_member')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lider')
    OR public.has_role(auth.uid(), 'team_member')
  );

INSERT INTO public.produto_segmento (codigo, nome) VALUES
  ('ASO', 'Auditoria Pessoa Jurídica'),
  ('AFI', 'Auditoria Pessoa Física'),
  ('PFT', 'Consultoria Profitto'),
  ('PTN', 'Consultoria Protenun'),
  ('DHU', 'Consultoria em Recursos Humanos'),
  ('FMB', 'Consultoria Family Business'),
  ('OS1', 'Sucessão Familiar - 1.0 (jurídico)'),
  ('OSG', 'Sucessão Familiar - 2.0 (jurídico + governança)'),
  ('SOC', 'Consultoria em Organização Societária'),
  ('OUT', 'Receitas com Parceiros'),
  ('PTR', 'Planejamento Tributário'),
  ('REA', 'Reduções de Encargos na Venda de Ativos'),
  ('ACF', 'Assessoramento Contábil e Fiscal'),
  ('RRT', 'Recuperação e Ressarcimento Tributário Administrativo'),
  ('DTB', 'Defesas Tributárias Federais, Estaduais e Previdenciárias'),
  ('EDP', 'Emissão de Pareceres'),
  ('RTJ', 'Recuperação Tributária Jurídica'),
  ('RSC', 'Reestruturação Societária'),
  ('IPC', 'Implantação de Programa de COMPLIANCE'),
  ('CDI', 'Implantação de Canal de Denúncia e Investigação nas Empresas'),
  ('AIV', 'Ação de Inventário'),
  ('APV', 'Antecipação de Provas'),
  ('AGP', 'Ações de Grande Porte'),
  ('JCM', 'Consultoria Jurídica Civil Mensal'),
  ('ACO', 'Ações Coletivas'),
  ('ADJ', 'Administração Judicial'),
  ('CJP', 'Consultoria Jurídica Pontual'),
  ('DIV', 'Diversos');
