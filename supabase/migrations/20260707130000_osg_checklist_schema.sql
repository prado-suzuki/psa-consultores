-- OSG · Checklist de documentos por cliente.
--   checklist_item_padrao  = catálogo editável (o "modelo" dos 63 tipos).
--   checklist_cliente_item = o que CADA cliente de fato deve: obrigatórios copiados do
--                            padrão + condicionais adicionados à mão + status, por
--                            INSTÂNCIA (pessoa/bem/matrícula).
--   documento_arquivo.checklist_item_id = liga o arquivo recebido ao item que ele
--                            satisfaz (mata o casamento por categoria).
-- Campos/FKs validados contra o schema vivo (cliente, pessoa, bem, matricula, documento_arquivo).
BEGIN;

-- enums (CREATE TYPE não tem IF NOT EXISTS → guard)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_checklist_origem') then
    create type public.osg_checklist_origem as enum ('padrao', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_checklist_status') then
    create type public.osg_checklist_status as enum ('pendente', 'recebido', 'dispensado', 'nao_aplicavel');
  end if;
end $$;

-- ───────────────────────── catálogo padrão (global; a OSG edita aqui) ─────────────────────────
create table if not exists public.checklist_item_padrao (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,                 -- chave estável (slug) p/ o seed
  modulo              text not null,                        -- módulo do OSG Work que consome
  entidade            text not null,                        -- Pessoa Física / PJ / Matrícula (...) / Bem / ...
  documento           text not null,
  nota                text,
  categoria           public.osg_doc_categoria,             -- casa com documento_arquivo.categoria
  categoria_docbox    text,                                 -- rótulo do cluster DocBox (exibição)
  confidencial        boolean not null default false,
  obrigatorio_default boolean not null default false,       -- obrigatório = copiado automaticamente p/ o cliente
  -- granularidade da geração por cliente:
  -- 'pessoa_pf' | 'pessoa_pj' | 'matricula_rural' | 'matricula_urbana' | 'bem' | 'cliente'
  granularidade       text not null default 'cliente',
  ordem               integer not null default 0,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

-- ───────────────────── itens por cliente (padrão copiado + condicionais manuais) ─────────────────────
create table if not exists public.checklist_cliente_item (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.cliente(id) on delete cascade,
  item_padrao_id      uuid references public.checklist_item_padrao(id) on delete set null,  -- null = item 100% manual
  -- campos denormalizados (copiados do padrão OU digitados no item manual)
  modulo              text not null,
  entidade            text not null,
  documento           text not null,
  nota                text,
  categoria           public.osg_doc_categoria,
  categoria_docbox    text,
  confidencial        boolean not null default false,
  obrigatorio         boolean not null default false,       -- pode divergir do padrão (override por cliente)
  origem              public.osg_checklist_origem not null default 'padrao',
  status              public.osg_checklist_status  not null default 'pendente',  -- 'recebido' é derivado do vínculo; 'dispensado'/'nao_aplicavel' são manuais
  -- vínculo polimórfico opcional à instância específica (nível "por instância")
  pessoa_id           uuid references public.pessoa(id)    on delete cascade,
  bem_id              uuid references public.bem(id)       on delete cascade,
  matricula_id        uuid references public.matricula(id) on delete cascade,
  observacao          text,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

create index if not exists idx_chk_cli_cliente   on public.checklist_cliente_item (cliente_id);
create index if not exists idx_chk_cli_padrao    on public.checklist_cliente_item (item_padrao_id);
create index if not exists idx_chk_cli_pessoa    on public.checklist_cliente_item (pessoa_id);
create index if not exists idx_chk_cli_bem       on public.checklist_cliente_item (bem_id);
create index if not exists idx_chk_cli_matricula on public.checklist_cliente_item (matricula_id);

-- liga o arquivo recebido ao item que ele satisfaz
alter table public.documento_arquivo
  add column if not exists checklist_item_id uuid
  references public.checklist_cliente_item(id) on delete set null;
create index if not exists idx_doc_arq_checklist_item
  on public.documento_arquivo (checklist_item_id) where excluido = false;

-- updated_at automático
create or replace function public.checklist_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chk_padrao_updated_at on public.checklist_item_padrao;
create trigger trg_chk_padrao_updated_at
  before update on public.checklist_item_padrao
  for each row execute function public.checklist_touch_updated_at();

drop trigger if exists trg_chk_cli_updated_at on public.checklist_cliente_item;
create trigger trg_chk_cli_updated_at
  before update on public.checklist_cliente_item
  for each row execute function public.checklist_touch_updated_at();

-- ───────────────────────────────────── RLS ─────────────────────────────────────
alter table public.checklist_item_padrao  enable row level security;
alter table public.checklist_cliente_item enable row level security;

-- Catálogo: todo team_member vê e edita (o "OSG pode mudar no futuro").
-- Restrinja o write a admin trocando has_role_or_higher(...,'team_member') por has_role(...,'admin') se preferir.
drop policy if exists "team_member+ can view checklist_item_padrao" on public.checklist_item_padrao;
create policy "team_member+ can view checklist_item_padrao" on public.checklist_item_padrao
  for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can write checklist_item_padrao" on public.checklist_item_padrao;
create policy "team_member+ can write checklist_item_padrao" on public.checklist_item_padrao
  for all to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- Itens por cliente: visíveis/editáveis por quem enxerga o cliente (modelo de cluster),
-- mesmo padrão de pessoa/bem/matricula.
drop policy if exists "cluster can view checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster can view checklist_cliente_item" on public.checklist_cliente_item
  for select to authenticated
  using (public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can insert checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can insert checklist_cliente_item" on public.checklist_cliente_item
  for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can update checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can update checklist_cliente_item" on public.checklist_cliente_item
  for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

drop policy if exists "cluster team_member can delete checklist_cliente_item" on public.checklist_cliente_item;
create policy "cluster team_member can delete checklist_cliente_item" on public.checklist_cliente_item
  for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role) and public.cliente_visivel_para(cliente_id));

COMMIT;
