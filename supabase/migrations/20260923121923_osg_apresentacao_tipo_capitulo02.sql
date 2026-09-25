-- O capitulo 02 do modelo novo vira um terceiro deck da OSG.
--
-- `osg_apresentacao.tipo` nasceu com a trava `('patrimonial', 'societaria')` na
-- 20260921174136, porque eram os dois decks que a `gerar-apresentacao` sabia montar.
-- A funcao passa a montar tambem o capitulo 02 inteiro do modelo da consultoria
-- (slides 5 a 17, molde `TEMPLATE_CAPITULO_02.pptx`), e cada deck versiona sozinho
-- pela unique `(cliente_id, tipo, versao)` — entao o tipo novo precisa caber na trava.
--
-- O texto e o mesmo que a Edge Function recebe em `tipos`, como os dois de antes.
--
-- Idempotente: a trava sai e volta com a lista INTEIRA ate este arquivo, e rodar
-- duas vezes da no mesmo. Quem acrescentar outro tipo depois repete a lista toda e
-- poe o seu no fim — e por isso este arquivo nao pode ser reaplicado DEPOIS de um
-- mais novo: ele devolveria a trava a tres tipos.
alter table public.osg_apresentacao drop constraint if exists osg_apresentacao_tipo_check;
alter table public.osg_apresentacao add constraint osg_apresentacao_tipo_check
  check (tipo in ('patrimonial', 'societaria', 'capitulo02'));
