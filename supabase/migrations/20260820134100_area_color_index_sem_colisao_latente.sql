-- 20260820134100_area_color_index_sem_colisao_latente.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260820140000_area_color_index_sem_colisao_latente.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

do $$
declare
  r record;
  s int := 0;
  livre int;
  alvo int;
  ativos int[] := '{}';
  usados int[] := '{}';
begin
  for r in select id from public.estrutura_areas where is_active order by created_at, id loop
    s := s + 1;
    if s > 8 then
      raise notice 'mais de 8 areas ativas: a paleta --area-* precisa crescer';
      s := 8;
    end if;
    update public.estrutura_areas set color_index = s where id = r.id;
    ativos := ativos || s;
    usados := usados || s;
  end loop;

  for r in select id from public.estrutura_areas where not is_active order by created_at, id loop
    livre := null;
    for alvo in 1..8 loop
      if not (alvo = any(usados)) then livre := alvo; exit; end if;
    end loop;

    if livre is null then
      select v into livre
        from (select v, (select count(*) from unnest(usados) u where u = v) as n
                from generate_series(1, 8) v
               where not (v = any(ativos))
               order by n, v
               limit 1) q;
    end if;

    if livre is null then
      select v into livre
        from (select v, (select count(*) from unnest(usados) u where u = v) as n
                from generate_series(1, 8) v order by n, v limit 1) q;
    end if;

    update public.estrutura_areas set color_index = livre where id = r.id;
    usados := usados || livre;
  end loop;
end $$;
