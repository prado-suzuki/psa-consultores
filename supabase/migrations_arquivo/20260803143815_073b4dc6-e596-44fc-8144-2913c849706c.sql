BEGIN;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_doc_grupo') then
    create type public.osg_doc_grupo as enum ('pf', 'pj', 'bens_imoveis', 'outros');
  end if;
end $$;

alter table public.checklist_item_padrao
  add column if not exists grupo public.osg_doc_grupo;

comment on column public.checklist_item_padrao.grupo is
  'Gaveta da área do cliente em que o documento aparece. Dado gravado, não inferido de entidade nem de categoria.';

COMMIT;