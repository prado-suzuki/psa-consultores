-- 20260826202357_itcd_calculadora_schema.sql

do $$
begin
  if not exists (select 1 from pg_type where typname = 'itcd_simulacao_status') then
    create type public.itcd_simulacao_status as enum
      ('rascunho', 'gerada', 'aprovada', 'substituida');
  end if;
end $$;

create table if not exists public.itcd_simulacao (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references public.cliente(id) on delete cascade,
  empresa_pessoa_id    uuid not null references public.pessoa(id),
  status               public.itcd_simulacao_status not null default 'rascunho',
  competencia          text not null,
  vlr_upf              numeric(10,2) not null check (vlr_upf > 0),
  quotas_total         integer not null check (quotas_total > 0),
  vlr_acervo_contabil  numeric(18,2) not null check (vlr_acervo_contabil >= 0),
  vlr_acervo_itr       numeric(18,2) not null check (vlr_acervo_itr >= 0),
  vlr_acervo_mercado   numeric(18,2) not null check (vlr_acervo_mercado >= 0),
  vlr_imposto_contabil numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) not null check (vlr_imposto_mercado >= 0),
  versao               integer not null default 1 check (versao > 0),
  origem_simulacao_id  uuid references public.itcd_simulacao(id) on delete set null,
  observacao           text,
  aprovada_por         uuid,
  aprovada_em          timestamp with time zone,
  created_at           timestamp with time zone not null default now(),
  created_by           uuid,
  updated_at           timestamp with time zone not null default now(),
  updated_by           uuid
);

create index if not exists itcd_simulacao_cliente_idx
  on public.itcd_simulacao (cliente_id, created_at desc);
create index if not exists itcd_simulacao_origem_idx
  on public.itcd_simulacao (origem_simulacao_id);

comment on table public.itcd_simulacao is
  'Uma apuração de ITCD na doação de quotas. Retrato: guarda a UPF, o universo de quotas e os totais do acervo que usou, para que mudança no cadastro não altere revisão antiga.';

create table if not exists public.itcd_simulacao_doador (
  id                 uuid primary key default gen_random_uuid(),
  simulacao_id       uuid not null references public.itcd_simulacao(id) on delete cascade,
  doador_pessoa_id   uuid not null references public.pessoa(id),
  quotas             integer not null check (quotas > 0),
  created_at         timestamp with time zone not null default now(),
  unique (simulacao_id, doador_pessoa_id)
);

create table if not exists public.itcd_simulacao_donatario (
  id                     uuid primary key default gen_random_uuid(),
  simulacao_id           uuid not null references public.itcd_simulacao(id) on delete cascade,
  donatario_pessoa_id    uuid not null references public.pessoa(id),
  quotas_legitima        integer not null check (quotas_legitima >= 0),
  quotas_disponivel      integer not null default 0 check (quotas_disponivel >= 0),
  pct_doacao_anterior    numeric(7,4) check (pct_doacao_anterior >= 0
                                            and pct_doacao_anterior <= 100),
  percentual             numeric(7,4) not null check (percentual > 0
                                                     and percentual <= 100),
  vlr_base_contabil      numeric(18,2) not null check (vlr_base_contabil >= 0),
  vlr_base_itr           numeric(18,2) not null check (vlr_base_itr >= 0),
  vlr_base_mercado       numeric(18,2) not null check (vlr_base_mercado >= 0),
  vlr_imposto_contabil   numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr        numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado    numeric(18,2) not null check (vlr_imposto_mercado >= 0),
  created_at             timestamp with time zone not null default now(),
  unique (simulacao_id, donatario_pessoa_id)
);

grant select, insert, update, delete on public.itcd_simulacao to authenticated;
grant select, insert, update, delete on public.itcd_simulacao_doador to authenticated;
grant select, insert, update, delete on public.itcd_simulacao_donatario to authenticated;
grant all on public.itcd_simulacao to service_role;
grant all on public.itcd_simulacao_doador to service_role;
grant all on public.itcd_simulacao_donatario to service_role;

create or replace function public.cliente_id_de_itcd_simulacao(_simulacao_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select cliente_id from public.itcd_simulacao where id = _simulacao_id;
$fn$;

alter table public.itcd_simulacao            enable row level security;
alter table public.itcd_simulacao_doador     enable row level security;
alter table public.itcd_simulacao_donatario  enable row level security;

drop policy if exists "osg_cluster_select_itcd_simulacao" on public.itcd_simulacao;
create policy "osg_cluster_select_itcd_simulacao"
  on public.itcd_simulacao for select to authenticated
  using (cliente_visivel_para(cliente_id));

drop policy if exists "team_member+ can insert itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can insert itcd_simulacao"
  on public.itcd_simulacao for insert to authenticated
  with check (has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can update itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can update itcd_simulacao"
  on public.itcd_simulacao for update to authenticated
  using (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  with check (
    status <> 'aprovada'::public.itcd_simulacao_status
    or has_role_or_higher(auth.uid(), 'sublider'::app_role)
  );

drop policy if exists "lider+ can delete itcd_simulacao" on public.itcd_simulacao;
create policy "lider+ can delete itcd_simulacao"
  on public.itcd_simulacao for delete to authenticated
  using (has_role_or_higher(auth.uid(), 'lider'::app_role));

do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao_doador',
                           'itcd_simulacao_donatario']
  loop
    execute format('drop policy if exists %I on public.%I',
                   'osg_cluster_select_' || t, t);
    execute format($f$
      create policy %I on public.%I for select to authenticated
        using (cliente_visivel_para(cliente_id_de_itcd_simulacao(simulacao_id)))
    $f$, 'osg_cluster_select_' || t, t);

    execute format('drop policy if exists %I on public.%I',
                   'team_member+ can write ' || t, t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
        using (has_role_or_higher(auth.uid(), 'team_member'::app_role))
        with check (has_role_or_higher(auth.uid(), 'team_member'::app_role))
    $f$, 'team_member+ can write ' || t, t);
  end loop;
end $$;