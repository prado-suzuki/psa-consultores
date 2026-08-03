BEGIN;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_solicitacao_item_status') then
    create type public.osg_solicitacao_item_status as enum ('ativo', 'dispensado');
  end if;
end $$;

create table if not exists public.solicitacao_item (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid not null references public.solicitacao(id) on delete cascade,
  item_padrao_id  uuid references public.documento_tipo(id) on delete restrict,
  granularidade   text not null,
  grupo           public.osg_doc_grupo not null,
  documento       text,
  entidade        text,
  nota            text,
  status          public.osg_solicitacao_item_status not null default 'ativo',
  ordem           integer not null default 0,
  observacao      text,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid default auth.uid(),
  constraint solicitacao_item_granularidade_chk check (
    granularidade in ('pessoa_pf','pessoa_pj','matricula_rural','matricula_urbana','bem','cliente')
  )
);

comment on table public.solicitacao_item is
  'A lista de documentos de um pedido. Item vindo do catálogo NÃO copia texto: documento, entidade e nota ficam nulos e a leitura herda de documento_tipo.';
comment on column public.solicitacao_item.item_padrao_id is
  'Tipo do catálogo. Nulo = documento criado à mão pelo analista.';
comment on column public.solicitacao_item.granularidade is
  'Por qual coisa o documento se repete: pessoa_pf, pessoa_pj, matricula_rural, matricula_urbana, bem ou cliente.';
comment on column public.solicitacao_item.grupo is
  'Gaveta da área do cliente. Dado gravado, não inferido de entidade nem de categoria.';
comment on column public.solicitacao_item.documento is
  'Nulo = herda de documento_tipo.documento. Preenchido = o analista sobrescreveu para este cliente.';
comment on column public.solicitacao_item.entidade is
  'Nulo = herda de documento_tipo.entidade. É só rótulo derivado da granularidade; NUNCA volta a ser eixo de agrupamento (quem agrupa é grupo).';
comment on column public.solicitacao_item.nota is
  'Nulo = herda de documento_tipo.nota. É a instrução que o cliente lê.';
comment on column public.solicitacao_item.status is
  'Intenção do analista: ativo ou dispensado. Nunca "recebido": o arquivo recebido não se liga ao item pedido.';
comment on column public.solicitacao_item.observacao is
  'Motivo, quando o analista dispensa o item.';

create index if not exists idx_solicitacao_item_solicitacao
  on public.solicitacao_item (solicitacao_id);
create index if not exists idx_solicitacao_item_tipo
  on public.solicitacao_item (item_padrao_id);

create unique index if not exists uq_solicitacao_item_padrao
  on public.solicitacao_item (solicitacao_id, item_padrao_id);
create unique index if not exists uq_solicitacao_item_manual
  on public.solicitacao_item (solicitacao_id, documento, entidade);

drop trigger if exists trg_solicitacao_item_updated_at on public.solicitacao_item;
create trigger trg_solicitacao_item_updated_at
  before update on public.solicitacao_item
  for each row execute function public.checklist_touch_updated_at();

alter table public.solicitacao_item enable row level security;

create policy "cluster can view solicitacao_item"
  on public.solicitacao_item for select to authenticated
  using (exists (select 1 from public.solicitacao s
                  where s.id = solicitacao_id
                    and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can insert solicitacao_item"
  on public.solicitacao_item for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and exists (select 1 from public.solicitacao s
                           where s.id = solicitacao_id
                             and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can update solicitacao_item"
  on public.solicitacao_item for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and exists (select 1 from public.solicitacao s
                      where s.id = solicitacao_id
                        and public.cliente_visivel_para(s.cliente_id)))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and exists (select 1 from public.solicitacao s
                           where s.id = solicitacao_id
                             and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can delete solicitacao_item"
  on public.solicitacao_item for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and exists (select 1 from public.solicitacao s
                      where s.id = solicitacao_id
                        and public.cliente_visivel_para(s.cliente_id)));

create policy "cliente can view own solicitacao_item enviada"
  on public.solicitacao_item for select to authenticated
  using (exists (select 1 from public.solicitacao s
                  where s.id = solicitacao_id
                    and s.cliente_id = public.resolve_user_cliente_id(auth.uid())
                    and s.status = 'enviada'::public.osg_solicitacao_status));

grant select, insert, update, delete on public.solicitacao_item to authenticated;
grant all on public.solicitacao_item to service_role;
revoke all on public.solicitacao_item from anon;

COMMIT;