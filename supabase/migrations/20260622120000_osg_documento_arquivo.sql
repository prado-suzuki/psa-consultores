-- OSG · armazenamento de documentos recebidos do cliente (binário no GCS, metadado aqui).
BEGIN;

-- enums (guards porque CREATE TYPE não tem IF NOT EXISTS)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_doc_fonte') then
    create type public.osg_doc_fonte as enum ('cliente', 'psa', 'arquivar');
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_doc_categoria') then
    create type public.osg_doc_categoria as enum (
      'bens_direitos', 'cadastros_fiscais', 'declaracao_ir', 'agrarios',
      'pessoais', 'societarios', 'sucessorios', 'outros'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_doc_status') then
    create type public.osg_doc_status as enum ('pendente', 'ativo');
  end if;
end $$;

create table if not exists public.documento_arquivo (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.cliente(id) on delete restrict,
  fonte               public.osg_doc_fonte     not null default 'cliente',
  categoria           public.osg_doc_categoria not null,
  -- vínculos polimórficos (nullable); v1 popula bem/matricula/pessoa
  bem_id              uuid references public.bem(id)        on delete set null,
  matricula_id        uuid references public.matricula(id)  on delete set null,
  pessoa_id           uuid references public.pessoa(id)     on delete set null,
  contribuinte_id     uuid,  -- reservado
  org_projects_id     uuid,  -- reservado
  documento_gerado_id uuid references public.documento_gerado(id) on delete set null,  -- reservado p/ fatia 2
  -- binário no GCS
  nome_original       text not null,       -- nome legível p/ o usuário; a chave GCS é opaca
  gcs_uri             text,                -- preenchido após o finalize
  checksum            text,                -- crc32c vindo do GCS
  mime                text,
  tamanho             bigint,
  status              public.osg_doc_status not null default 'pendente',
  -- convenções do schema
  excluido            boolean not null default false,
  ambiente            text not null default 'dev',
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

create index if not exists idx_doc_arq_cliente   on public.documento_arquivo (cliente_id)   where excluido = false;
create index if not exists idx_doc_arq_bem        on public.documento_arquivo (bem_id)       where excluido = false;
create index if not exists idx_doc_arq_matricula  on public.documento_arquivo (matricula_id) where excluido = false;
create index if not exists idx_doc_arq_pessoa     on public.documento_arquivo (pessoa_id)    where excluido = false;

-- updated_at automático
create or replace function public.documento_arquivo_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_doc_arq_updated_at on public.documento_arquivo;
create trigger trg_doc_arq_updated_at
  before update on public.documento_arquivo
  for each row execute function public.documento_arquivo_touch_updated_at();

alter table public.documento_arquivo enable row level security;

drop policy if exists "team_member+ can view documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can view documento_arquivo" on public.documento_arquivo
  for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can insert documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can insert documento_arquivo" on public.documento_arquivo
  for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can update documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can update documento_arquivo" on public.documento_arquivo
  for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "admin can delete documento_arquivo" on public.documento_arquivo;
create policy "admin can delete documento_arquivo" on public.documento_arquivo
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
