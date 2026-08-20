-- 20260813150000_os_por_nome_respeita_ambiente.sql
create or replace function public.get_ordens_by_client_name(p_client_id uuid)
returns setof ordem_servico
language sql
stable
security definer
set search_path to 'public'
as $$
  select os.*
    from ordem_servico os
   where os.id_cliente in (
           select c2.id
             from cliente c2
            where public.nome_cliente_normalizado(c2.nome)
                = public.nome_cliente_normalizado(
                    (select nome from cliente where id = p_client_id limit 1))
              and c2.ambiente = (select ambiente from cliente where id = p_client_id)
              and c2.excluido = false)
     and os.excluido = false
   order by os.created_at desc;
$$;

comment on function public.get_ordens_by_client_name(uuid) is
  'OS de todos os cadastros de cliente com o mesmo nome normalizado, restrito ao MESMO ambiente do cliente informado. O casamento por nome atende grupo economico com cadastros homonimos; o recorte de ambiente impede que a tela de projeto ofereca OS de dev para cliente de prod e vice-versa.';

create temporary table _projetos_dev on commit drop as
  select p.id
    from public.org_projects p
    join public.cliente c on c.id = p.external_client_id
   where c.ambiente = 'dev';

delete from public.org_tasks
 where project_id in (select id from _projetos_dev);

delete from public.org_projects
 where id in (select id from _projetos_dev);