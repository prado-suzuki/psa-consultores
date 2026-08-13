BEGIN;

update public.solicitacao
   set ordem_servico_id = 'da05caa2-dfd0-4256-98be-c51339de4513'
 where id = 'd138566a-a49d-495e-8952-04ddf38e3fb0'
   and ordem_servico_id is null;

create or replace function public.sublider_na_os(_ordem_servico_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _ordem_servico_id is not null
     and public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
     and exists (
       select 1
         from public.org_project_members m
         join public.org_projects p on p.id = m.project_id
        where p.ordem_servico_id = _ordem_servico_id
          and m.user_id = auth.uid()
     );
$$;

comment on function public.sublider_na_os(uuid) is
  'Sublider ou acima que e membro de ALGUM projeto daquela ordem de servico. Porta de escrita de solicitacao e solicitacao_item. OS nula devolve false, porque sem OS nao existe projeto do qual ser membro.';

drop policy if exists "cluster team_member can insert solicitacao" on public.solicitacao;
create policy "sublider na os can insert solicitacao"
  on public.solicitacao for insert to authenticated
  with check (public.sublider_na_os(ordem_servico_id));

drop policy if exists "cluster team_member can update solicitacao" on public.solicitacao;
create policy "sublider na os can update solicitacao"
  on public.solicitacao for update to authenticated
  using      (public.sublider_na_os(ordem_servico_id))
  with check (public.sublider_na_os(ordem_servico_id));

drop policy if exists "cluster team_member can delete solicitacao" on public.solicitacao;
create policy "sublider na os can delete solicitacao"
  on public.solicitacao for delete to authenticated
  using (public.sublider_na_os(ordem_servico_id));

drop policy if exists "cluster team_member can insert solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can insert solicitacao_item"
  on public.solicitacao_item for insert to authenticated
  with check (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

drop policy if exists "cluster team_member can update solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can update solicitacao_item"
  on public.solicitacao_item for update to authenticated
  using (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)))
  with check (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

drop policy if exists "cluster team_member can delete solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can delete solicitacao_item"
  on public.solicitacao_item for delete to authenticated
  using (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

COMMIT;