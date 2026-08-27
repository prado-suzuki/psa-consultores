-- 20260826165750_procedimentos_bucket_e_texto.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

alter table public.procedimentos
  add column if not exists arquivo_bucket text not null default 'sop-documents';

comment on column public.procedimentos.arquivo_bucket is
  'Bucket do Storage onde `arquivo_path` vive. Default mantém o comportamento antigo (sop-documents); project_documents usam project-documents.';

alter table public.procedimentos
  add column if not exists conteudo_texto text;

comment on column public.procedimentos.conteudo_texto is
  'Texto do procedimento quando `source_type` = ''texto'' (ex.: cópia de processes.formatted_content no momento da importação). Guardar a cópia é o que permite reprocessar depois sem depender do original ter mudado.';

alter table public.procedimentos
  drop constraint if exists procedimentos_source_type_check;

alter table public.procedimentos
  add constraint procedimentos_source_type_check
  check (source_type = any (array['link'::text, 'pdf'::text, 'docx'::text, 'texto'::text]));
