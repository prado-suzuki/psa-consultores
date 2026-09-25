-- O anexo de imoveis rurais do modelo novo vira um quarto deck da OSG.
--
-- A `gerar-apresentacao` passa a montar o anexo de imoveis rurais do modelo da
-- consultoria (slide 28, molde `TEMPLATE_ANEXO.pptx`), uma pagina por pedaco de
-- sociedade de destino. Como os outros, ele versiona sozinho pela unique
-- `(cliente_id, tipo, versao)`, e o tipo precisa caber na trava.
--
-- Idempotente: a trava sai e volta com a lista INTEIRA, repetindo a da
-- 20260923121923 (capitulo 02) e pondo `anexo` no fim. Rodar duas vezes da no
-- mesmo.
alter table public.osg_apresentacao drop constraint if exists osg_apresentacao_tipo_check;
alter table public.osg_apresentacao add constraint osg_apresentacao_tipo_check
  check (tipo in ('patrimonial', 'societaria', 'capitulo02', 'anexo'));
