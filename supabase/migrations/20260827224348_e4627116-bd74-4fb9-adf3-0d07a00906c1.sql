INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo) VALUES
  ('administracao_isolada', 'manual', 'pj',
   'A administração é exercida isoladamente por cada administrador', true),
  ('administracao_conjunta', 'manual', 'pj',
   'A administração é exercida em conjunto pelos administradores', true),
  ('administracao_diretoria', 'manual', 'pj',
   'A administração é exercida por diretoria colegiada', true),
  ('administrador_poderes_ampliados', 'manual', 'pj',
   'O administrador tem poderes ampliados (além dos de gestão ordinária)', true),
  ('haveres_fluxo_caixa_descontado', 'manual', 'pj',
   'Os haveres se apuram por fluxo de caixa descontado', true),
  ('haveres_patrimonio_liquido', 'manual', 'pj',
   'Os haveres se apuram por patrimônio líquido', true),
  ('tem_acordo_quotistas', 'manual', 'pj',
   'Existe acordo de quotistas assinado, a ser citado no contrato', true)
ON CONFLICT (nome) DO NOTHING;

COMMENT ON TABLE public.tmpl_flag IS
  'Catálogo de condições que ligam e desligam blocos. Três naturezas convivem: DERIVADA (declarativa, calculada de um campo do cadastro), MANUAL de EVENTO (as seis evento_*, hoje propostas pela derivação do livro de movimentos e apenas confirmadas pelo consultor) e MANUAL de DECISÃO DE PROJETO (escolha de redação tomada com o cliente, que não sai de cadastro nenhum: administração, poderes, haveres, acordo de quotistas).';