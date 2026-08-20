-- Decisão do consultor de que um item pedido não se aplica a uma entidade.
-- A ausência de arquivo continua derivada; só este julgamento é persistido.

BEGIN;

create table if not exists public.solicitacao_item_nao_aplicavel (
  id uuid primary key default gen_random_uuid(),
  solicitacao_item_id uuid not null references public.solicitacao_item(id) on delete cascade,
  cliente_id uuid not null references public.cliente(id) on delete cascade,
  pessoa_id uuid references public.pessoa(id) on delete cascade,
  bem_id uuid references public.bem(id) on delete cascade,
  matricula_id uuid references public.matricula(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  constraint solicitacao_item_nao_aplicavel_um_alvo
    check (num_nonnulls(pessoa_id, bem_id, matricula_id) = 1)
);

comment on table public.solicitacao_item_nao_aplicavel is
  'Marca que um item ativo da solicitação não se aplica a uma pessoa, bem ou matrícula específicos.';

create unique index if not exists uq_solicitacao_nao_aplicavel_pessoa
  on public.solicitacao_item_nao_aplicavel (solicitacao_item_id, pessoa_id)
  where pessoa_id is not null;
create unique index if not exists uq_solicitacao_nao_aplicavel_bem
  on public.solicitacao_item_nao_aplicavel (solicitacao_item_id, bem_id)
  where bem_id is not null;
create unique index if not exists uq_solicitacao_nao_aplicavel_matricula
  on public.solicitacao_item_nao_aplicavel (solicitacao_item_id, matricula_id)
  where matricula_id is not null;
create index if not exists idx_solicitacao_nao_aplicavel_cliente
  on public.solicitacao_item_nao_aplicavel (cliente_id);

create or replace function public.validar_solicitacao_item_nao_aplicavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.solicitacao_item si
      join public.solicitacao s on s.id = si.solicitacao_id
     where si.id = new.solicitacao_item_id
       and si.status = 'ativo'::public.osg_solicitacao_item_status
       and s.cliente_id = new.cliente_id
  ) then
    raise exception 'O item não pertence à solicitação ativa deste cliente';
  end if;

  if new.pessoa_id is not null and not exists (
    select 1 from public.pessoa p where p.id = new.pessoa_id and p.cliente_id = new.cliente_id
  ) then
    raise exception 'A pessoa não pertence ao cliente da solicitação';
  end if;

  if new.bem_id is not null and not exists (
    select 1 from public.bem b where b.id = new.bem_id and b.cliente_id = new.cliente_id
  ) then
    raise exception 'O bem não pertence ao cliente da solicitação';
  end if;

  if new.matricula_id is not null and not exists (
    select 1
      from public.matricula m
      left join public.bem b on b.id = m.bem_id
     where m.id = new.matricula_id
       and (
         b.cliente_id = new.cliente_id
         or exists (
           select 1
             from public.titularidade t
             join public.pessoa p on p.id = t.titular_pessoa_id
            where t.matricula_id = m.id
              and p.cliente_id = new.cliente_id
         )
       )
  ) then
    raise exception 'A matrícula não pertence ao cliente da solicitação';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_solicitacao_item_nao_aplicavel
  on public.solicitacao_item_nao_aplicavel;
create trigger trg_validar_solicitacao_item_nao_aplicavel
  before insert or update on public.solicitacao_item_nao_aplicavel
  for each row execute function public.validar_solicitacao_item_nao_aplicavel();

alter table public.solicitacao_item_nao_aplicavel enable row level security;

create policy "cluster can view solicitacao item nao aplicavel"
  on public.solicitacao_item_nao_aplicavel for select to authenticated
  using (public.cliente_visivel_para(cliente_id));

create policy "cluster team_member can insert solicitacao item nao aplicavel"
  on public.solicitacao_item_nao_aplicavel for insert to authenticated
  with check (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    and public.cliente_visivel_para(cliente_id)
    and exists (
      select 1
        from public.solicitacao_item si
        join public.solicitacao s on s.id = si.solicitacao_id
       where si.id = solicitacao_item_id
         and s.cliente_id = cliente_id
    )
  );

create policy "cluster team_member can delete solicitacao item nao aplicavel"
  on public.solicitacao_item_nao_aplicavel for delete to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    and public.cliente_visivel_para(cliente_id)
  );

grant select, insert, delete on public.solicitacao_item_nao_aplicavel to authenticated;
grant all on public.solicitacao_item_nao_aplicavel to service_role;
revoke all on public.solicitacao_item_nao_aplicavel from anon;

COMMIT;
