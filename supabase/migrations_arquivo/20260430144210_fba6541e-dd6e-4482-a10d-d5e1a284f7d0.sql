create or replace function public.get_internal_users()
returns table(id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name
  from public.profiles p
  where public.has_role_or_higher(p.id, 'team_member'::app_role)
  order by p.first_name, p.last_name;
$$;

grant execute on function public.get_internal_users() to authenticated;