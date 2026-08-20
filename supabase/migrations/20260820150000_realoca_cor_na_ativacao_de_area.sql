-- Ao ATIVAR uma area, realoca o slot de cor se ele colidir com area ja ativa.
--
-- POR QUE TRIGGER, E NAO CODIGO
--   A verificacao de colisao existia so na CRIACAO (`proximoIndiceDeCor`, em
--   src/lib/corDaArea.ts). Mas com mais areas que tons — 10 areas, 8 slots — duas
--   sempre compartilham, e o instante em que uma colisao adormecida ACORDA nao e
--   a criacao: e a ativacao.
--
--   E ativacao nao passa pelo aplicativo. Conferido: NADA em src/ escreve
--   `estrutura_areas.is_active` — as 6 referencias sao todas filtro de leitura
--   (`.eq('is_active', true)`). Area se ativa por update direto no banco. Uma
--   checagem em TypeScript nunca dispararia.
--
--   O trigger pega qualquer origem: console SQL, chat do Lovable, ou uma tela
--   futura que ainda nao existe.
--
-- O QUE FAZ
--   Na transicao false -> true, se o slot da area coincidir com o de outra area
--   ATIVA, procura um slot que nenhuma ativa use e move para la. Nao havendo —
--   ou seja, 8 ou mais areas ativas —, MANTEM o slot e emite warning: a partir
--   dai a paleta precisa crescer, e isso e decisao humana. O trigger nao escolhe
--   em silencio.
--
--   So mexe em quem esta ativando. Area ja ativa que muda outro campo nao entra,
--   e desativar nunca realoca: a cor de quem sai de cena nao importa, e mover
--   slot na desativacao repintaria area alheia sem motivo.

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
