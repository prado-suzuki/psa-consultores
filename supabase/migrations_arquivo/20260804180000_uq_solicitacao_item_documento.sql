-- Duplicata de item manual: troca o indice que nao protegia por uma constraint
-- que protege.
--
-- O QUE ESTAVA ERRADO
-- O indice uq_solicitacao_item_manual checava a trinca
-- (solicitacao_id, documento, entidade). A ALE-29 tirou o campo entidade do
-- formulario — era ele a origem do `entidade = 'Bem'` que apareceu em 7 de 475
-- linhas de cliente —, entao todo item manual passou a gravar entidade NULA. E,
-- em indice unico, nulo nao colide com nulo: as tres celulas nunca batiam ao
-- mesmo tempo, e dois documentos manuais com o mesmo nome entravam os dois.
-- O indice nao estava quebrado por erro de escrita; ele foi feito para um
-- formulario que deixou de existir.
--
-- POR QUE UMA CONSTRAINT SIMPLES BASTA
-- (solicitacao_id, documento) protege o item manual, que tem documento
-- preenchido, e nao atrapalha o item de catalogo, que tem documento NULO de
-- proposito (o texto e herdado de documento_tipo) e por isso nunca colide com
-- outro. A mesma regra do nulo que quebrava a protecao e a que agora evita o
-- falso bloqueio.
--
-- O QUE ELA NAO COBRE
-- Variacao de caixa, espaco nas pontas ou acento: constraint so aceita coluna,
-- nao expressao. Isso fica com a checagem da tela
-- (encontrarManualComMesmoNome, em src/lib/solicitacao.ts), que normaliza os
-- tres antes de gravar. A constraint e a rede de baixo: pega gravacao
-- simultanea e escrita por fora do sistema.
--
-- Conferido no banco em 04/08/2026, nao presumido: 47 itens em 1 solicitacao,
-- 1 deles manual, e ZERO grupos de (solicitacao_id, documento) repetidos entre
-- as linhas com documento preenchido — a constraint entra sem esbarrar em dado
-- existente.
--
-- Reversao:
--   alter table public.solicitacao_item
--     drop constraint uq_solicitacao_item_documento;
--   create unique index uq_solicitacao_item_manual
--     on public.solicitacao_item (solicitacao_id, documento, entidade);

BEGIN;

drop index if exists public.uq_solicitacao_item_manual;

alter table public.solicitacao_item
  add constraint uq_solicitacao_item_documento unique (solicitacao_id, documento);

comment on constraint uq_solicitacao_item_documento on public.solicitacao_item is
  'Impede o mesmo documento manual duas vezes na mesma solicitacao. Nao afeta item de catalogo, cujo documento e nulo e por isso nunca colide.';

COMMIT;
