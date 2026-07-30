BEGIN;

create table if not exists public.produto_checklist_item (
  id                   uuid primary key default gen_random_uuid(),
  produto_segmento_id  uuid not null references public.produto_segmento(id)      on delete cascade,
  item_padrao_id       uuid not null references public.checklist_item_padrao(id) on delete cascade,
  obrigatorio          boolean not null default true,
  created_at           timestamptz not null default now(),
  created_by           uuid default auth.uid(),
  updated_at           timestamptz not null default now(),
  updated_by           uuid default auth.uid(),
  constraint produto_checklist_item_unq unique (produto_segmento_id, item_padrao_id)
);

comment on table public.produto_checklist_item is
  'Vínculo produto x documento padrão: quais itens de checklist_item_padrao cada produto_segmento exige. Alimenta a geração da solicitação de documentos a partir da OS.';

comment on column public.produto_checklist_item.obrigatorio is
  'Override por produto do obrigatorio_default do item padrão.';

create index if not exists idx_produto_checklist_item_padrao
  on public.produto_checklist_item (item_padrao_id);

drop trigger if exists trg_produto_checklist_item_updated_at on public.produto_checklist_item;
create trigger trg_produto_checklist_item_updated_at
  before update on public.produto_checklist_item
  for each row execute function public.checklist_touch_updated_at();

alter table public.produto_checklist_item enable row level security;

drop policy if exists "team_member+ can view produto_checklist_item" on public.produto_checklist_item;
create policy "team_member+ can view produto_checklist_item" on public.produto_checklist_item
  for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "sublider+ can insert produto_checklist_item" on public.produto_checklist_item;
create policy "sublider+ can insert produto_checklist_item" on public.produto_checklist_item
  for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

drop policy if exists "sublider+ can update produto_checklist_item" on public.produto_checklist_item;
create policy "sublider+ can update produto_checklist_item" on public.produto_checklist_item
  for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
  with check (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

drop policy if exists "sublider+ can delete produto_checklist_item" on public.produto_checklist_item;
create policy "sublider+ can delete produto_checklist_item" on public.produto_checklist_item
  for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

grant select, insert, update, delete on public.produto_checklist_item to authenticated;
grant all on public.produto_checklist_item to service_role;

COMMIT;