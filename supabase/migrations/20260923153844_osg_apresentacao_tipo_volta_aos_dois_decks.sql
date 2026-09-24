-- A trava de `osg_apresentacao.tipo` volta aos dois decks da OSG.
--
-- A 20260923121923 (capitulo02) e a 20260923122949 (anexo) alargaram a trava
-- para quatro tipos, com os dois decks que a `gerar-apresentacao` passou a montar
-- em 23/09/2026. Os dois sairam no mesmo dia: a apresentacao passou a ter tres
-- capitulos, cada um num arquivo — 01 organizacao patrimonial (`patrimonial`),
-- 02 organizacao societaria (`societaria`) e 03 planejamento tributario, que sai
-- de outra funcao e grava em outra tabela. A funcao nao aceita mais `capitulo02`
-- nem `anexo`.
--
-- As linhas desses dois tipos saem ANTES da trava, que nao volta com elas na
-- tabela. So existem no sandbox, geradas nos testes de 23/09 em clientes de
-- teste; em producao a trava nunca aceitou os dois tipos, e o `delete` nao acha
-- nada. Nenhuma tabela aponta para a `osg_apresentacao`. Os .pptx dessas linhas,
-- no bucket `osg-apresentacoes`, nao saem por aqui: storage nao e schema.
--
-- Idempotente: na segunda vez o `delete` nao acha nada, e a trava sai e volta
-- com a lista inteira, a mesma da 20260921174136.
delete from public.osg_apresentacao where tipo in ('capitulo02', 'anexo');
alter table public.osg_apresentacao drop constraint if exists osg_apresentacao_tipo_check;
alter table public.osg_apresentacao add constraint osg_apresentacao_tipo_check
  check (tipo in ('patrimonial', 'societaria'));
