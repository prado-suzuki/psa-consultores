BEGIN;

alter table public.org_projects
  add column if not exists produto_segmento_id uuid
    references public.produto_segmento(id);

comment on column public.org_projects.produto_segmento_id is
  'Produto contratado que este projeto atende (1 por projeto). Preenchido pelo modal de projeto e pela criação em lote a partir da OS. Nulo em projeto antigo que o backfill de 20260814140000 não conseguiu identificar sem chute: nesse caso a UI ainda deriva o rótulo dos produtos da OS.';

create index if not exists idx_org_projects_produto_segmento
  on public.org_projects (produto_segmento_id)
  where produto_segmento_id is not null;

update public.org_projects p
   set produto_segmento_id = opc.produto_segmento_id
  from public.os_produtos_contratados opc
 where p.produto_segmento_id is null
   and p.ordem_servico_id is not null
   and opc.ordem_servico_id = p.ordem_servico_id
   and (
     select count(*) from public.os_produtos_contratados x
      where x.ordem_servico_id = p.ordem_servico_id
   ) = 1;

update public.org_projects p
   set produto_segmento_id = deduzido.produto_segmento_id
  from (
    select
      alvo.id as project_id,
      min(ps.produto_segmento_id::text)::uuid as produto_segmento_id
      from public.org_projects alvo
      join public.os_produtos_contratados opc
        on opc.ordem_servico_id = alvo.ordem_servico_id
      join public.produto_servico ps
        on ps.produto_segmento_id = opc.produto_segmento_id
       and ps.servico_prestado_id = alvo.servico_id
     where alvo.produto_segmento_id is null
       and alvo.servico_id is not null
     group by alvo.id
    having count(distinct ps.produto_segmento_id) = 1
  ) deduzido
 where p.id = deduzido.project_id;

update public.org_projects p
   set produto_segmento_id = por_nome.produto_segmento_id
  from (
    select
      alvo.id as project_id,
      min(pg.id::text)::uuid as produto_segmento_id
      from public.org_projects alvo
      join public.os_produtos_contratados opc
        on opc.ordem_servico_id = alvo.ordem_servico_id
      join public.produto_segmento pg
        on pg.id = opc.produto_segmento_id
     where alvo.produto_segmento_id is null
       and alvo.name is not null
       and (
         lower(btrim(regexp_replace(alvo.name, '\s+', ' ', 'g')))
           = lower(btrim(regexp_replace(pg.nome, '\s+', ' ', 'g')))
         or lower(btrim(regexp_replace(alvo.name, '\s+', ' ', 'g')))
              like '%' || lower(btrim(regexp_replace(pg.codigo || ' — ' || pg.nome, '\s+', ' ', 'g'))) || '%'
       )
     group by alvo.id
    having count(distinct pg.id) = 1
  ) por_nome
 where p.id = por_nome.project_id;

COMMIT;