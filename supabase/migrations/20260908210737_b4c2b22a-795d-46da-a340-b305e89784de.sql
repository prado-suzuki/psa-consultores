create or replace function public.sublider_na_os(_ordem_servico_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.has_role(auth.uid(), 'admin'::app_role)
      or (
        _ordem_servico_id is not null
        and public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
        and exists (
          select 1
            from public.org_projects p
           where p.ordem_servico_id = _ordem_servico_id
             and (
               p.responsible_id = auth.uid()
               or p.leader_id = auth.uid()
               or exists (
                 select 1
                   from public.org_project_members m
                  where m.project_id = p.id
                    and m.user_id = auth.uid()
               )
             )
        )
      );
$function$;

comment on function public.sublider_na_os(uuid) is
  'Autoriza escrita em solicitacao/solicitacao_item. Admin passa sempre; os demais '
  'precisam de papel sublider ou acima E de participação (membro, responsável ou '
  'líder) em algum projeto da OS. Usada pelas seis policies de escrita das duas '
  'tabelas.';