-- As DECISÕES DE PROJETO: o que sobra de manual depois que o ledger passa a
-- derivar os eventos.
--
-- Frente 5 de docs/planos/ledger-societario-e-alteracao-derivada.md.
--
-- O painel manual nasceu para responder o que o sistema não sabia, e as seis
-- flags `evento_*` moravam ali por falta de ledger. Com o livro de movimentos, o
-- evento se deriva e passa a ser conferência (Frente 4). O que continua sendo
-- resposta do consultor é de outra natureza: não é fato do mundo que o cadastro
-- devesse saber, é ESCOLHA de redação do contrato, tomada com o cliente. Não sai
-- de cadastro nenhum, hoje nem depois, e é para isso que o painel manual existe.
--
-- Os nomes e as vagas vêm de docs/osg/catalogo-familias-e-flags.md (tabela de
-- cláusulas do Contrato Social e catálogo consolidado).
--
-- Sobre as CATEGÓRICAS: `tmpl_bloco_flag` é conjunção booleana, e o catálogo
-- registra isso como ponto de schema aberto (item 1 de "Pontos de schema a
-- decidir"). Enquanto ele não se decide, uma escolha de N valores entra como N
-- booleanos de nome explícito, que é o que o motor sabe compor hoje:
--
--   administração   → isolada | conjunta | diretoria colegiada
--   haveres         → fluxo de caixa descontado | patrimônio líquido | ambas
--                     (as duas ligadas juntas SÃO o caso "ambas", sem terceira flag)
--
-- Escopo 'pj', como as de evento: a decisão é do contrato daquela empresa, e um
-- mesmo cliente pode ter uma holding com administração conjunta e uma operacional
-- com administração isolada.
--
-- A DATA do acordo de quotistas não entra aqui: flag é interruptor, e data é
-- valor. Ela entra no bloco como campo de texto livre da tela Gerar, que é o
-- mecanismo que a casa já tem para valor sem cadastro de origem.
--
-- O CHECK tmpl_flag_definicao_por_tipo exige que tipo = 'manual' venha com
-- expressao_sql, entidade, campo e valor TODOS nulos: a definição declarativa é
-- exclusiva das derivadas. Por isso o INSERT lista só nome, tipo, escopo,
-- descricao e ativo.
--
-- Idempotente por ON CONFLICT (nome) DO NOTHING. Sem DELETE e sem reseed:
-- override e versões de bloco apontam por chave, e apagar linha quebraria a
-- reprodução das versões já seladas.
--
-- Fora de escopo, de propósito: os blocos que estas flags governam (o texto
-- jurídico é de outra pessoa) e os vínculos em tmpl_bloco_flag.

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
