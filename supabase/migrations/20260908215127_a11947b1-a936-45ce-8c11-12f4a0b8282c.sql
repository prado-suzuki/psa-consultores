drop policy if exists rls_per_delete on public.per;

create policy rls_per_delete
  on public.per
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.can_view_contribuinte(auth.uid(), per.id_contribuinte)
    )
  );

drop policy if exists rls_per_situacao_delete on public.per_situacao;

create policy rls_per_situacao_delete
  on public.per_situacao
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or exists (
        select 1
          from public.per p
         where p.nr_per = per_situacao.nr_proc_per
           and public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
      )
    )
  );

drop policy if exists rls_dcomp_delete on public.dcomp;

create policy rls_dcomp_delete
  on public.dcomp
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or exists (
        select 1
          from public.per p
         where p.nr_per = dcomp.nr_per_orig
           and public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
      )
    )
  );

alter table public.per_situacao drop constraint if exists per_situacao_nr_proc_per_fkey;

alter table public.per_situacao
  add constraint per_situacao_nr_proc_per_fkey
  foreign key (nr_proc_per) references public.per(nr_per) on delete cascade;

alter table public.dcomp drop constraint if exists dcomp_nr_per_orig_fkey;

alter table public.dcomp
  add constraint dcomp_nr_per_orig_fkey
  foreign key (nr_per_orig) references public.per(nr_per) on delete cascade;

delete from public.rls_precheck_allowed_tables
 where table_name in ('per', 'dcomp');