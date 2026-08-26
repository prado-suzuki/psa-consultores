BEGIN;

alter table public.estrutura_areas
  add column if not exists color_index integer;

comment on column public.estrutura_areas.color_index is
  'Slot da paleta de area (1..8), atribuido no primeiro livre quando a area nasce. A cor em si mora no CSS (--area-1..8 em src/index.css): o banco guarda o slot para que trocar um tom seja editar CSS, nao migrar dado. Passando de 8 areas os tons recomecam pelo menos usado — aceitavel porque o nome da area vem sempre ao lado do ponto.';

with ordenado as (
  select id, row_number() over (order by is_active desc, created_at, id) as n
    from public.estrutura_areas
)
update public.estrutura_areas a
   set color_index = ((o.n - 1) % 8) + 1
  from ordenado o
 where o.id = a.id
   and a.color_index is null;

COMMIT;

BEGIN;

create or replace function public.realoca_color_index_na_ativacao()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_livre integer;
begin
  if not (coalesce(old.is_active, false) = false and new.is_active = true) then
    return new;
  end if;

  if not exists (
    select 1 from public.estrutura_areas o
     where o.id <> new.id
       and o.is_active
       and o.color_index = new.color_index
  ) then
    return new;
  end if;

  select v into v_livre
    from generate_series(1, 8) v
   where not exists (
     select 1 from public.estrutura_areas o
      where o.id <> new.id and o.is_active and o.color_index = v
   )
   order by v
   limit 1;

  if v_livre is null then
    raise warning 'area % ativada mantendo o slot % (ja em uso): nao ha tom livre entre as 8 cores de --area-*. A paleta precisa crescer — decisao humana.',
      new.name, new.color_index;
    return new;
  end if;

  raise notice 'area % ativada: slot % colidia com area ativa, realocado para %',
    new.name, new.color_index, v_livre;
  new.color_index := v_livre;
  return new;
end;
$function$;

drop trigger if exists trg_realoca_color_index_na_ativacao on public.estrutura_areas;

create trigger trg_realoca_color_index_na_ativacao
  before update of is_active on public.estrutura_areas
  for each row
  execute function public.realoca_color_index_na_ativacao();

COMMIT;