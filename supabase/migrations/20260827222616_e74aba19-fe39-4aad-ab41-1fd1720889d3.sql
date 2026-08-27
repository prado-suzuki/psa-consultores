-- 20260824212848_tmpl_flag_eventos_alteracao_contratual.sql
-- Seed das flags MANUAIS de evento da alteração contratual em public.tmpl_flag.
--
-- Por que manual e não derivada: uma alteração contratual é o diff sobre o
-- estado da sociedade, e o sistema não guarda a história dela. A decisão de
-- produto do caminho B (docs/planos/alteracao-contratual-caminho-b.md, seção 2)
-- foi não construir o ledger de eventos datados: o estado pós-evento é o
-- cadastro atualizado à mão. Sem ledger, "houve aumento de capital" não se
-- deduz do estado atual do cadastro, e por isso quem diz é o consultor, no
-- interruptor do passo de condições (EscolhaFlagsManuais.tsx).
--
-- Os nomes vêm da tabela de blocos de resolução em
-- docs/osg/catalogo-familias-e-flags.md (seção "Documento: Alteração
-- Contratual"). Ficam só as seis flags de EVENTO; as marcadas ali como
-- "derivada" (renúncia ao direito de preferência, declaração de
-- desimpedimento) e a "computada" (novo quadro societário) não entram aqui,
-- porque decorrem destas e não de um interruptor próprio.
--
-- Escopo 'pj', não 'cliente': o evento societário é da pessoa jurídica cujo
-- contrato está sendo alterado. Um mesmo cliente pode ter várias empresas, e o
-- aumento de capital de uma não é o da outra. É também o que o código já
-- espera: useDomainFlagsManuais grava pj_pessoa_id = a empresa escolhida quando
-- o escopo é 'pj' (e NULL quando é 'cliente'), o controlador passa o empresaId
-- do passo 2 nesse campo, e o passo das condições só destrava depois que a
-- empresa foi escolhida.
--
-- O CHECK tmpl_flag_definicao_por_tipo (baseline ~8030) exige que tipo =
-- 'manual' venha com expressao_sql, entidade, campo e valor TODOS nulos: a
-- definição declarativa é exclusiva das derivadas. Por isso o INSERT lista só
-- nome, tipo, escopo, descricao e ativo.
--
-- `descricao` é o rótulo que o consultor lê: EscolhaFlagsManuais.tsx mostra
-- `flag.descricao || flag.nome` ao lado do interruptor, e o resumo do passo
-- concatena as ligadas. Frase curta, na voz do evento.
--
-- Idempotente por ON CONFLICT (nome) DO NOTHING, sobre o unique
-- tmpl_flag_nome_key. Sem DELETE e sem reseed: override e versões de bloco
-- continuam apontados por chave, e apagar linha quebraria a reprodução das
-- versões já seladas.
--
-- Fora de escopo, de propósito: os blocos de resolução (o texto jurídico é de
-- outra pessoa), os vínculos em tmpl_bloco_flag (os blocos ainda não existem) e
-- qualquer ledger de eventos.

INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo) VALUES
  ('evento_alteracao_endereco', 'manual', 'pj',
   'Houve mudança do endereço da sede', true),
  ('evento_aumento_capital', 'manual', 'pj',
   'Houve aumento do capital social', true),
  ('evento_integralizacao', 'manual', 'pj',
   'Houve integralização de capital (em imóveis, quotas ou dinheiro)', true),
  ('evento_cessao_quotas', 'manual', 'pj',
   'Houve cessão de quotas entre sócios ou para terceiro', true),
  ('evento_mudanca_socios', 'manual', 'pj',
   'Houve entrada ou retirada de sócio', true),
  ('evento_mudanca_administracao', 'manual', 'pj',
   'Houve mudança na administração da sociedade', true)
ON CONFLICT (nome) DO NOTHING;