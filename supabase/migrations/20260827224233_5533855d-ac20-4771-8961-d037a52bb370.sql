-- 20260826210000_ledger_forma_de_pagamento_e_ato.sql

create table if not exists public.ato_societario (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.cliente(id) on delete cascade,
  data        date,
  descricao   text,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

grant select, insert, update, delete on public.ato_societario to authenticated;
grant all on public.ato_societario to service_role;

alter table public.ato_societario enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger
                  where tgrelid = 'public.ato_societario'::regclass
                    and tgname = 'trg_ato_societario_updated_at') then
    create trigger trg_ato_societario_updated_at
      before update on public.ato_societario
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
                  and tablename = 'ato_societario'
                  and policyname = 'osg_cluster_select_ato_societario') then
    create policy "osg_cluster_select_ato_societario" on public.ato_societario
      for select using (public.cliente_visivel_para(cliente_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                  and tablename = 'ato_societario'
                  and policyname = 'team_member+ can insert ato_societario') then
    create policy "team_member+ can insert ato_societario" on public.ato_societario
      for insert with check (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                  and tablename = 'ato_societario'
                  and policyname = 'team_member+ can update ato_societario') then
    create policy "team_member+ can update ato_societario" on public.ato_societario
      for update using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
                  and tablename = 'ato_societario'
                  and policyname = 'team_member+ can delete ato_societario') then
    create policy "team_member+ can delete ato_societario" on public.ato_societario
      for delete using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));
  end if;
end $$;

create index if not exists idx_ato_societario_cliente
  on public.ato_societario (cliente_id);

comment on table public.ato_societario is
  'O ato societário: o fato do mundo que um ou mais movimentos de quota descrevem. Existe para amarrar lançamentos que nascem e morrem juntos, inclusive em EMPRESAS DIFERENTES — a subida das quotas para a controladora é uma cessão na proprietária e um aporte na controladora, no mesmo dia e no mesmo ato. Sem documento próprio: quem formaliza é a peça, apontada por movimentacao_quotas.documento_gerado_id.';
comment on column public.ato_societario.data is
  'Data do ato. Nula quando o consultor ainda não a sabe.';
comment on column public.ato_societario.descricao is
  'Uma frase que nomeia o ato para o consultor ("Subida das quotas da Farroupilha para a Jatobá").';

alter table public.movimentacao_quotas
  add column if not exists pago_com_empresa_pessoa_id uuid references public.pessoa(id),
  add column if not exists pago_com_quotas            bigint,
  add column if not exists pago_com_valor             numeric,
  add column if not exists sequencia                  integer,
  add column if not exists ato_id                     uuid references public.ato_societario(id) on delete cascade;

create index if not exists idx_movimentacao_quotas_ato
  on public.movimentacao_quotas (ato_id);

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_forma_pagamento_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_forma_pagamento_check
        check (
          case when tipo = 'aporte'
            then not (bem_id is not null and pago_com_empresa_pessoa_id is not null)
            else bem_id is null and pago_com_empresa_pessoa_id is null
          end
        );
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_pago_com_quotas_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_pago_com_quotas_check
        check (
          pago_com_empresa_pessoa_id is not null
          or (pago_com_quotas is null and pago_com_valor is null)
        );
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_pago_com_outra_empresa_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_pago_com_outra_empresa_check
        check (pago_com_empresa_pessoa_id is null
               or pago_com_empresa_pessoa_id <> empresa_pessoa_id);
  end if;
end $$;

comment on column public.movimentacao_quotas.pago_com_empresa_pessoa_id is
  'A PJ cujas QUOTAS pagaram este aporte. Não é entidade nova: a empresa já é pessoa, e daí saem CNPJ, NIRE, sede e administradores para a cláusula de integralização. Nulo no aporte em bem e no aporte em moeda corrente.';
comment on column public.movimentacao_quotas.pago_com_quotas is
  'Quantas quotas da PJ de origem foram entregues. Só com pago_com_empresa_pessoa_id preenchido.';
comment on column public.movimentacao_quotas.pago_com_valor is
  'R$ que essas quotas valiam na PJ de origem. A subida é 1:1 em VALOR, não em quantidade: as quotas emitidas aqui são este valor dividido pelo valor nominal desta sociedade, e só coincidem com pago_com_quotas quando as duas têm o mesmo nominal.';
comment on column public.movimentacao_quotas.sequencia is
  'Ordem deste lançamento dentro do ato. É o que permite projetar o quadro societário num ponto INTERMEDIÁRIO da peça — a cláusula que publica o quadro depois do aumento e antes da cessão. Nula nos movimentos avulsos, que não têm ordem interna a respeitar.';
comment on column public.movimentacao_quotas.ato_id is
  'O ato que este lançamento descreve, quando ele não é avulso. Um ato atravessa empresas: a subida das quotas é cessão na proprietária e aporte na controladora, com o mesmo ato_id. ON DELETE CASCADE porque reverter é apagar o ato inteiro, e um lançamento órfão do par seria um quadro societário que não fecha.';