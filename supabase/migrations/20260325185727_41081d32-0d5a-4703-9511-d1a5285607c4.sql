
-- Add new columns to metas table for PPR decisions and member updates
alter table metas
  add column if not exists ajuste_qualitativo_publico text,
  add column if not exists recomendacao_decisao text check (recomendacao_decisao in ('promover','reajustar','monitorar','manter')),
  add column if not exists ultima_atualizacao_membro timestamptz,
  add column if not exists comentario_membro text;
