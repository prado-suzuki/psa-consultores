-- Seeds fixos p/ apresentações OSG PSA (referenciados pela edge function gerar-apresentacao)
INSERT INTO public.tmpl_documento (id, nome, tipo, descricao, ativo)
VALUES
  ('a11a11a1-0000-4000-8000-000000000001'::uuid,
   'Apresentação Patrimonial PSA',
   'osg_apresentacao_patrimonial',
   'Template base do deck patrimonial gerado automaticamente pela edge function gerar-apresentacao (bens + matrículas + titularidades).',
   true),
  ('a11a11a1-0000-4000-8000-000000000002'::uuid,
   'Apresentação Societária PSA',
   'osg_apresentacao_societaria',
   'Template base do deck societário gerado automaticamente pela edge function gerar-apresentacao (organograma + quadro societário).',
   true)
ON CONFLICT (id) DO NOTHING;