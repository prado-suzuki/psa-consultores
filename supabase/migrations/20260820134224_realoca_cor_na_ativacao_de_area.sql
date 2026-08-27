-- 20260820134224_realoca_cor_na_ativacao_de_area.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260820150000_realoca_cor_na_ativacao_de_area.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

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

comment on function public.realoca_color_index_na_ativacao() is
  'Realoca estrutura_areas.color_index quando uma area e ATIVADA e o slot dela colide com o de outra area ativa. Existe como trigger e nao como codigo porque nada no aplicativo escreve is_active — area se ativa por update direto no banco. Com 8+ areas ativas mantem o slot e emite warning: a paleta --area-* precisa crescer, e isso e decisao humana.';
