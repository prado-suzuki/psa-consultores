create or replace function public.realoca_color_index_na_ativacao()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_livre integer;
begin
  -- Só na transição para ativa.
  if not (coalesce(old.is_active, false) = false and new.is_active = true) then
    return new;
  end if;

  -- Sem colisão com outra ativa, nada a fazer.
  if not exists (
    select 1 from public.estrutura_areas o
     where o.id <> new.id
       and o.is_active
       and o.color_index = new.color_index
  ) then
    return new;
  end if;

  -- O menor slot que nenhuma área ativa ocupa.
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

comment on function public.realoca_color_index_na_ativacao() is
  'Realoca estrutura_areas.color_index quando uma area e ATIVADA e o slot dela colide com o de outra area ativa. Existe como trigger e nao como codigo porque nada no aplicativo escreve is_active — area se ativa por update direto no banco. Com 8+ areas ativas mantem o slot e emite warning: a paleta --area-* precisa crescer, e isso e decisao humana.';